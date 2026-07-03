from datetime import datetime
from typing import Literal

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


class AISettingsIn(BaseModel):
    """provider=None clears the setting (back to the app default)."""

    provider: Literal["groq", "openai", "anthropic", "gemini"] | None = None
    api_key: str | None = None


class AISettingsOut(BaseModel):
    provider: str | None
    # The key itself is never returned — only whether one is stored.
    has_key: bool
