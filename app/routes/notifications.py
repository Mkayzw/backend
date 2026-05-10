from typing import List

from fastapi import APIRouter, Depends, Query

from app.schemas.notification_schema import (
    CreateNotificationRequest,
    NotificationListResponse,
    NotificationOut,
)
from app.services import notification_service as service
from app.services.auth import getCurrentUser, requireRole

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationListResponse)
async def list_my_notifications(
    unreadOnly: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(getCurrentUser),
):
    items = await service.listNotificationsForUser(
        userId=int(current_user["id"]), unread_only=unreadOnly, limit=limit
    )
    unread = await service.countUnread(int(current_user["id"]))
    return {"notifications": items, "unreadCount": unread}


@router.post("/", response_model=NotificationOut, status_code=201)
async def create_notification(
    payload: CreateNotificationRequest,
    current_user: dict = Depends(requireRole(["ADMIN"])),
):
    return await service.createNotification(
        userId=payload.userId,
        title=payload.title,
        message=payload.message,
        type=payload.type,
        link=payload.link,
    )


@router.patch("/{notificationId}/read", response_model=NotificationOut)
async def mark_read(
    notificationId: int,
    current_user: dict = Depends(getCurrentUser),
):
    return await service.markAsRead(
        notificationId=notificationId, current_user=current_user
    )


@router.patch("/read-all")
async def mark_all_read(current_user: dict = Depends(getCurrentUser)):
    count = await service.markAllAsRead(userId=int(current_user["id"]))
    return {"updated": count}
