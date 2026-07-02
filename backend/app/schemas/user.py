from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    email: str
    full_name: str
    role: str
    department: str | None
    manager_id: str | None
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: Role
    department: str | None = None
    manager_id: str | None = None


class UserCreateResponse(BaseModel):
    user: UserOut
    initial_password: str


class UserUpdate(BaseModel):
    is_active: bool | None = None
    department: str | None = None
    manager_id: str | None = None
