from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.user_schemas import UserResponse


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    actorUserId: Optional[int] = None
    actorRole: Optional[str] = None
    action: str
    method: str
    path: str
    resourceType: Optional[str] = None
    resourceId: Optional[str] = None
    statusCode: int
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    metadata: Optional[str] = None
    createdAt: datetime
    actor: Optional[UserResponse] = None

