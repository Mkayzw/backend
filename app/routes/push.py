"""
Web Push Routes

Stores browser PushSubscription objects and exposes the VAPID public key.
"""

from fastapi import APIRouter, Depends

from app.schemas.push_schema import OkResponse, PushPublicKeyResponse, PushSubscriptionCreate
from app.services.auth import requireRole
from app.services.push_notifications import get_vapid_public_key, upsert_subscription


router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/public-key", response_model=PushPublicKeyResponse)
async def get_public_key() -> PushPublicKeyResponse:
    return PushPublicKeyResponse(publicKey=await get_vapid_public_key())


@router.post("/subscriptions", response_model=OkResponse)
async def create_or_update_subscription(
    body: PushSubscriptionCreate,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> OkResponse:
    await upsert_subscription(
        user_id=current_user["id"],
        endpoint=body.endpoint,
        p256dh=body.keys.p256dh,
        auth=body.keys.auth,
    )
    return OkResponse()

