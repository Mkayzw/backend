from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    fullname: str | None = None
    phone: str | None = None
    role: str = "patient"


class UpdateUser(BaseModel):
    fullname: str | None = None
    phone: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    email: EmailStr
    fullname: str | None = Field(default=None, alias="fullName")
    phone: str | None = None
    role: str

class LoginReq(BaseModel):
    email:str
    password:str

class LoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int
    email: EmailStr
    fullname: str | None = Field(default=None, alias="fullName")
    role: str


