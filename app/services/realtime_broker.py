import asyncio
import json
from typing import Any, Iterable, Optional

from fastapi.encoders import jsonable_encoder


def _to_sse(event: str, data: Any, event_id: Optional[str] = None) -> str:
    payload = json.dumps(jsonable_encoder(data), separators=(",", ":"), ensure_ascii=False)
    lines = []
    if event_id is not None:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {payload}")
    return "\n".join(lines) + "\n\n"


class RealtimeBroker:
    """
    Minimal in-memory SSE broker.

    Note: in-memory means events won't fan out across multiple processes/workers.
    That's fine for this prototype. For scale, move to Redis/pubsub.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._admin_queues: set[asyncio.Queue[str]] = set()
        self._user_queues: dict[int, set[asyncio.Queue[str]]] = {}

    async def subscribe(self, user_id: int, role: str) -> asyncio.Queue[str]:
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=200)
        async with self._lock:
            if role == "ADMIN":
                self._admin_queues.add(queue)
            else:
                self._user_queues.setdefault(user_id, set()).add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[str]) -> None:
        async with self._lock:
            self._admin_queues.discard(queue)
            for user_id in list(self._user_queues.keys()):
                qs = self._user_queues.get(user_id)
                if not qs:
                    continue
                if queue in qs:
                    qs.discard(queue)
                    if not qs:
                        self._user_queues.pop(user_id, None)

    async def publish_to_users(
        self,
        *,
        event: str,
        data: Any,
        user_ids: Iterable[int],
        also_admin: bool = True,
        event_id: Optional[str] = None,
    ) -> None:
        payload = _to_sse(event, data, event_id=event_id)

        async with self._lock:
            target_queues: list[asyncio.Queue[str]] = []
            if also_admin:
                target_queues.extend(self._admin_queues)
            for uid in user_ids:
                target_queues.extend(self._user_queues.get(uid, set()))

        for queue in target_queues:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                # Drop one old event and try once more, then give up.
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    pass

    async def publish_to_admins(self, *, event: str, data: Any, event_id: Optional[str] = None) -> None:
        await self.publish_to_users(event=event, data=data, user_ids=[], also_admin=True, event_id=event_id)


broker = RealtimeBroker()

