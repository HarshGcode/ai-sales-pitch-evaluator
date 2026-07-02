from pydantic import BaseModel, EmailStr

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
