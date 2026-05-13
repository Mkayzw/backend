const BASE_URL = 'http://localhost:8000';

function parseEventBlock(block) {
  const lines = block.split('\n');
  let event = 'message';
  let id = null;
  const dataLines = [];

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(':')) continue; // comment
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim() || event;
      continue;
    }
    if (line.startsWith('id:')) {
      id = line.slice('id:'.length).trim() || null;
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
      continue;
    }
  }

  const dataRaw = dataLines.join('\n');
  let data = dataRaw;
  try {
    data = dataRaw ? JSON.parse(dataRaw) : null;
  } catch {
    // leave as string
  }

  return { event, id, data };
}

export function startRealtimeStream({ token, onEvent, onError } = {}) {
  const controller = new AbortController();
  const decoder = new TextDecoder();
  let buffer = '';
  let retryMs = 2000;

  const isTransientNetworkError = (error) => (
    error instanceof TypeError
    && String(error.message || '').toLowerCase().includes('network')
  );

  async function run() {
    try {
      const res = await fetch(`${BASE_URL}/api/realtime/stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        const err = new Error(text || `Realtime stream failed (${res.status})`);
        err.status = res.status;
        throw err;
      }

      retryMs = 2000;
      const reader = res.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const evt = parseEventBlock(block);
          if (evt && onEvent) onEvent(evt);
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      if (onError && !isTransientNetworkError(e)) onError(e);
      buffer = '';
      // Simple backoff retry (best-effort).
      setTimeout(() => {
        if (!controller.signal.aborted) run();
      }, retryMs);
      retryMs = Math.min(15000, Math.floor(retryMs * 1.5));
    }
  }

  run();

  return {
    stop: () => controller.abort(),
  };
}
