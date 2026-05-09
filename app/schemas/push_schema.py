"""
Web Push Schemas
"""

from pydantic import BaseModel, ConfigDict


class PushSubscriptionKeys(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    endpoint: str
    keys: PushSubscriptionKeys


class PushPublicKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    publicKey: str


class OkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    ok: bool = True

