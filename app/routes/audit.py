from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from app.schemas.audit_schema import AuditLogResponse
from app.services.audit_service import get_audit_logs
from app.services.auth import requireRole


router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = Query(None),
    resourceType: Optional[str] = Query(None),
    actorUserId: Optional[int] = Query(None),
    current_user: dict = Depends(requireRole(["ADMIN"])),
) -> List[AuditLogResponse]:
    return await get_audit_logs(
        limit=limit,
        action=action,
        resource_type=resourceType,
        actor_user_id=actorUserId,
    )

