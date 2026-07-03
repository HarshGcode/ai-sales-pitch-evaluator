from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    user: UserOut


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DemoLoginRequest(BaseModel):
    email: EmailStr


class EnterRequest(BaseModel):
    """Passwordless entry with the user's own name and chosen role."""

    full_name: str = Field(min_length=1, max_length=100)
    role: Literal["admin", "manager", "sales_exec"]
