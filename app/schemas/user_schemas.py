from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    fullname: str
    phone: str
    role: str = "patient"


class UpdateUser(BaseModel):
    fullname: str
    phone: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    email: str
    fullname: str = Field(alias="fullName")
    phone: str
    role: str

class LoginReq(BaseModel):
    email:str
    password:str

class LoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int
    email: str
    fullname: str | None = Field(default=None, alias="fullName")
    role: str


