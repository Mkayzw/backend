from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CreateNotificationRequest(BaseModel):
    userId: int
    title: str
    message: str
    type: str
    link: Optional[str] = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    userId: int
    title: str
    message: str
    type: str
    isRead: bool
    link: Optional[str] = None
    createdAt: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationOut]
    unreadCount: int
