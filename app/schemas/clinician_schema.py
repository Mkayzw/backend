from datetime import datetime
from app.schemas.user_schemas import UserResponse
from pydantic import BaseModel, ConfigDict


class CreateClinician(BaseModel):
    userId:         int
    specialization: str
    fullName:       str


class UpdateClinician(BaseModel):
    specialization: str | None = None
    fullName:       str | None = None


class ClinicianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id:             int
    userId:         int
    specialization: str
    fullName:       str
    user:           UserResponse | None = None