"""
Notification Service

Internal in-app notification log. Used to surface alerts, scheduled
follow-ups, clinician responses and system messages to users in the UI.
This is the canonical persistent record; the realtime broker and web-push
layer remain responsible for live delivery.
"""
import asyncio
from typing import Iterable, Optional

from fastapi import HTTPException, status

from app.db import db
from app.services.realtime_broker import broker


VALID_TYPES = {
    "HIGH_RISK_ALERT",
    "WORSENING_TREND",
    "FOLLOW_UP_SCHEDULED",
    "FOLLOW_UP_RESPONSE",
    "MEDICATION_CHECK_IN",
    "SYSTEM_MESSAGE",
}


async def createNotification(
    *,
    userId: int,
    title: str,
    message: str,
    type: str,
    link: Optional[str] = None,
) -> dict:
    if type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid notification type. Allowed: {sorted(VALID_TYPES)}",
        )

    note = await db.notification.create(
        data={
            "userId": userId,
            "title": title.strip(),
            "message": message.strip(),
            "type": type,
            "link": link,
        }
    )

    # Live push to the connected user (best-effort)
    try:
        asyncio.create_task(
            broker.publish_to_users(
                event="notification.created",
                data=note,
                user_ids={userId},
                also_admin=False,
                event_id=str(getattr(note, "id", "")) or None,
            )
        )
    except Exception:
        pass

    return note


async def fanOutNotification(
    *,
    userIds: Iterable[int],
    title: str,
    message: str,
    type: str,
    link: Optional[str] = None,
) -> list:
    """Create the same notification for many users (e.g. care team)."""
    created = []
    for uid in {int(u) for u in userIds}:
        try:
            created.append(
                await createNotification(
                    userId=uid, title=title, message=message, type=type, link=link
                )
            )
        except Exception:
            continue
    return created


async def listNotificationsForUser(
    *, userId: int, unread_only: bool = False, limit: int = 50
) -> list:
    where: dict = {"userId": userId}
    if unread_only:
        where["isRead"] = False
    return await db.notification.find_many(
        where=where,
        order={"createdAt": "desc"},
        take=limit,
    )


async def countUnread(userId: int) -> int:
    return await db.notification.count(where={"userId": userId, "isRead": False})


async def markAsRead(*, notificationId: int, current_user: dict) -> dict:
    note = await db.notification.find_unique(where={"id": notificationId})
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    if note.userId != current_user["id"] and current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied to this notification")
    return await db.notification.update(
        where={"id": notificationId}, data={"isRead": True}
    )


async def markAllAsRead(*, userId: int) -> int:
    result = await db.notification.update_many(
        where={"userId": userId, "isRead": False},
        data={"isRead": True},
    )
    # prisma-client-py returns count (int) for update_many
    return int(result) if isinstance(result, int) else 0
