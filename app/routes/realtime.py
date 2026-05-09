"""
Realtime Routes (SSE)

Streams server-side events to authenticated clients.
"""

import asyncio

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.services.auth import requireRole
from app.services.realtime_broker import broker


router = APIRouter(prefix="/api/realtime", tags=["realtime"])


@router.get("/stream")
async def stream(request: Request, current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"]))):
    user_id = int(current_user["id"])
    role = str(current_user["role"])

    queue = await broker.subscribe(user_id=user_id, role=role)

    async def gen():
        try:
            # Initial comment so clients know the connection is live.
            yield ": connected\n\n"

            while True:
                if await request.is_disconnected():
                    break

                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15)
                    yield msg
                except asyncio.TimeoutError:
                    # Keep-alive comment to prevent idle timeouts.
                    yield ": keep-alive\n\n"
        finally:
            await broker.unsubscribe(queue)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Nginx: disable response buffering if present.
            "X-Accel-Buffering": "no",
        },
    )

