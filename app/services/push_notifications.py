import base64
import json
import os
from datetime import datetime, timedelta
from typing import Any, Iterable, Optional

from fastapi import HTTPException, status
from anyio import to_thread
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat

from app.config.settings import settings
from app.db import db


def _pywebpush():
    """
    Lazy import so the backend can still start even if optional deps aren't installed yet.
    """
    try:
        from pywebpush import WebPushException, webpush  # type: ignore
        return WebPushException, webpush
    except Exception as e:
        raise RuntimeError("pywebpush is not installed. Run: pip install -r requirements.txt") from e


def _require_vapid_config() -> tuple[str, str, str]:
    public_key = settings.vapid_public_key
    private_key = settings.vapid_private_key
    subject = settings.vapid_subject

    if not public_key or not private_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env",
        )

    return public_key, private_key, subject


def _repad_b64(s: str) -> str:
    return s + "=" * (-len(s) % 4)


def _normalize_vapid_private_key_for_pywebpush(vapid_private_key: str) -> str:
    """
    pywebpush expects either:
      - a path to a PEM file, or
      - a base64-encoded DER private key string.

    Many VAPID key generators (and the client-side `applicationServerKey` flow)
    use the raw 32-byte private key encoded as base64url (no padding). If we
    detect that format, convert it into base64(DER) for pywebpush.
    """
    key = (vapid_private_key or "").strip()
    if not key:
        return key

    if os.path.exists(key):
        return key

    # If this decodes to exactly 32 bytes, treat as "raw" VAPID private key.
    try:
        raw = base64.urlsafe_b64decode(_repad_b64(key))
    except Exception:
        return key

    if len(raw) != 32:
        # Probably already DER-base64 (or something else pywebpush can handle).
        return key

    private_value = int.from_bytes(raw, "big")
    derived = ec.derive_private_key(private_value, ec.SECP256R1())
    der = derived.private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())
    return base64.b64encode(der).decode("ascii")


async def get_vapid_public_key() -> str:
    public_key, _, _ = _require_vapid_config()
    return public_key


async def upsert_subscription(*, user_id: int, endpoint: str, p256dh: str, auth: str) -> None:
    existing = await db.pushsubscription.find_unique(where={"endpoint": endpoint})
    if existing:
        await db.pushsubscription.update(
            where={"id": existing.id},
            data={"userId": user_id, "p256dh": p256dh, "auth": auth},
        )
        return

    await db.pushsubscription.create(
        data={"userId": user_id, "endpoint": endpoint, "p256dh": p256dh, "auth": auth},
    )


async def delete_subscription_by_endpoint(endpoint: str) -> None:
    try:
        await db.pushsubscription.delete(where={"endpoint": endpoint})
    except Exception:
        # Best-effort cleanup.
        return


def _subscription_info(subscription: Any) -> dict:
    return {
        "endpoint": str(subscription.endpoint),
        "keys": {"p256dh": str(subscription.p256dh), "auth": str(subscription.auth)},
    }


async def _send_one(subscription: Any, payload: str) -> None:
    _, private_key, subject = _require_vapid_config()
    private_key = _normalize_vapid_private_key_for_pywebpush(private_key)

    # exp is optional; pywebpush can set it, but we keep it explicit and short-lived.
    vapid_claims = {
        "sub": subject,
        "exp": int((datetime.utcnow() + timedelta(hours=12)).timestamp()),
    }

    subscription_info = _subscription_info(subscription)

    try:
        WebPushException, webpush = _pywebpush()
    except Exception:
        return

    def _do_send() -> None:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=private_key,
            vapid_claims=vapid_claims,
        )

    try:
        await to_thread.run_sync(_do_send)
    except WebPushException as ex:
        status_code: Optional[int] = None
        if getattr(ex, "response", None) is not None:
            status_code = getattr(ex.response, "status_code", None)
        # Stale subscription: delete so we don't keep retrying forever.
        if status_code in (404, 410):
            await delete_subscription_by_endpoint(str(subscription.endpoint))
        # Other errors are best-effort; we don't crash request flow.
    except Exception:
        # Best-effort push send; never block core clinical flows.
        return


async def send_push_to_user_ids(*, user_ids: Iterable[int], message: dict) -> None:
    if not user_ids:
        return

    # If push isn't configured, just skip (UI can still use realtime stream).
    try:
        _require_vapid_config()
    except HTTPException:
        return

    ids = list({int(i) for i in user_ids})
    subs = await db.pushsubscription.find_many(where={"userId": {"in": ids}})
    if not subs:
        return

    payload = json.dumps(message, separators=(",", ":"), ensure_ascii=False)
    for sub in subs:
        await _send_one(sub, payload)
