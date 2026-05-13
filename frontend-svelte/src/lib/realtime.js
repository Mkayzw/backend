const BASE_URL = 'http://localhost:8000'

function parseEventBlock(block) {
  const lines = block.split('\n')
  let event = 'message'
  let id = null
  const dataLines = []

  for (const line of lines) {
    if (!line) continue
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim() || event
      continue
    }
    if (line.startsWith('id:')) {
      id = line.slice('id:'.length).trim() || null
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
      continue
    }
  }

  const dataRaw = dataLines.join('\n')
  let data = dataRaw
  try {
    data = dataRaw ? JSON.parse(dataRaw) : null
  } catch {
    // leave as-is
  }
  return { event, id, data }
}

export function startRealtimeStream({ token, onEvent, onError } = {}) {
  const controller = new AbortController()
  const decoder = new TextDecoder()
  let buffer = ''
  let retryMs = 2000

  async function run() {
    try {
      const response = await fetch(`${BASE_URL}/api/realtime/stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '')
        const error = new Error(text || `Realtime stream failed (${response.status})`)
        error.status = response.status
        throw error
      }

      const reader = response.body.getReader()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const event = parseEventBlock(block)
          if (event && onEvent) onEvent(event)
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return
      if (onError) onError(err)
      buffer = ''
      setTimeout(() => {
        if (!controller.signal.aborted) run()
      }, retryMs)
      retryMs = Math.min(15000, Math.floor(retryMs * 1.5))
    }
  }

  run()

  return {
    stop() {
      controller.abort()
    },
  }
}
