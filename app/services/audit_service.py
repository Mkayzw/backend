import json
import time
from typing import Optional

from fastapi import Request

from app.db import db
from app.services.auth import decodeAccessToken


MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

RESOURCE_ALIASES = {
    "assignments": "assignment",
    "auth": "auth",
    "patients": "patient",
    "clinicians": "clinician",
    "symptom-reports": "symptom_report",
    "users": "user",
    "alerts": "alert",
    "tasks": "task",
    "push": "push_subscription",
}


def _resource_from_path(path: str) -> tuple[Optional[str], Optional[str]]:
    parts = [p for p in path.strip("/").split("/") if p]
    if parts and parts[0] == "api":
        parts = parts[1:]
    if not parts:
        return None, None

    resource_type = RESOURCE_ALIASES.get(parts[0], parts[0].replace("-", "_"))
    resource_id = next((p for p in parts[1:] if p.isdigit()), None)
    return resource_type, resource_id


def _action_from_request(method: str, path: str, resource_type: Optional[str]) -> str:
    clean = path.strip("/")

    if clean == "auth/login":
        return "LOGIN_ATTEMPT"
    if clean == "auth/signup":
        return "SIGNUP"
    if clean == "api/push/subscriptions":
        return "ENABLE_PUSH_NOTIFICATIONS"
    if clean.startswith("alerts/") and clean.endswith("/read"):
        return "MARK_ALERT_READ"
    if clean.startswith("alerts/") and clean.endswith("/triage"):
        return "TRIAGE_ALERT"

    if method == "POST":
        return f"CREATE_{(resource_type or 'resource').upper()}"
    if method in {"PUT", "PATCH"}:
        return f"UPDATE_{(resource_type or 'resource').upper()}"
    if method == "DELETE":
        return f"DELETE_{(resource_type or 'resource').upper()}"
    return f"{method}_{(resource_type or 'resource').upper()}"


def _actor_from_request(request: Request) -> tuple[Optional[int], Optional[str]]:
    auth_header = request.headers.get("authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        return None, None

    token = auth_header.split(" ", 1)[1].strip()
    payload = decodeAccessToken(token)
    if not payload:
        return None, None

    try:
        actor_user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        actor_user_id = None

    actor_role = payload.get("role")
    return actor_user_id, str(actor_role) if actor_role else None


async def record_request_audit(
    *,
    request: Request,
    status_code: int,
    started_at: float,
) -> None:
    method = request.method.upper()
    if method not in MUTATING_METHODS:
        return

    path = request.url.path
    resource_type, resource_id = _resource_from_path(path)
    action = _action_from_request(method, path, resource_type)
    actor_user_id, actor_role = _actor_from_request(request)

    client_host = request.client.host if request.client else None
    metadata = {
        "durationMs": round((time.perf_counter() - started_at) * 1000, 2),
        "query": str(request.url.query) if request.url.query else None,
    }

    try:
        await db.auditlog.create(
            data={
                "actorUserId": actor_user_id,
                "actorRole": actor_role,
                "action": action,
                "method": method,
                "path": path,
                "resourceType": resource_type,
                "resourceId": resource_id,
                "statusCode": status_code,
                "ipAddress": client_host,
                "userAgent": request.headers.get("user-agent"),
                "metadata": json.dumps(metadata),
            }
        )
    except Exception:
        # Audit should not break the clinical workflow.
        return


async def get_audit_logs(
    *,
    limit: int = 100,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    actor_user_id: Optional[int] = None,
) -> list:
    where: dict = {}
    if action:
        where["action"] = action
    if resource_type:
        where["resourceType"] = resource_type
    if actor_user_id is not None:
        where["actorUserId"] = actor_user_id

    return await db.auditlog.find_many(
        where=where,
        take=limit,
        order={"createdAt": "desc"},
        include={"actor": True},
    )
