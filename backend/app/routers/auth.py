import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.deps import COOKIE_NAME, get_current_user
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    DemoLoginRequest,
    EnterRequest,
    LoginRequest,
    LoginResponse,
)
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24  # 24h, matches JWT_EXPIRE_MINUTES default

# Accounts the passwordless persona picker may enter as (seeded in app.seed).
DEMO_EMAILS = {"admin@acmecorp.com", "manager@acmecorp.com", "exec@acmecorp.com"}


def _issue_session(user: User, response: Response) -> LoginResponse:
    token = create_access_token(user.id, user.role, user.organization_id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        max_age=COOKIE_MAX_AGE_SECONDS,
        path="/",
    )
    return LoginResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return _issue_session(user, response)


@router.post("/demo-login", response_model=LoginResponse)
def demo_login(payload: DemoLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Passwordless entry for the demo personas ("Who are you?" picker)."""
    if payload.email not in DEMO_EMAILS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a demo account")
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo account not found")

    return _issue_session(user, response)


def _name_to_email(full_name: str, role: str) -> str:
    """Deterministic synthetic email so the same name + role always maps to the
    same account (returning users get their history back by typing their name)."""
    slug = re.sub(r"[^a-z0-9]+", ".", full_name.lower()).strip(".") or "user"
    return f"{slug}+{role.replace('_', '-')}@demo.local"


@router.post("/enter", response_model=LoginResponse)
def enter(payload: EnterRequest, response: Response, db: Session = Depends(get_db)):
    """Passwordless entry with the user's own name and chosen role.

    Finds the matching profile or creates one on the fly in the shared demo
    organization. Role-based access control applies to the chosen role.
    """
    full_name = " ".join(payload.full_name.split())
    if not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")

    email = _name_to_email(full_name, payload.role)
    user = db.query(User).filter(User.email == email).first()
    if user and not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This profile is deactivated")

    if not user:
        organization = db.query(Organization).first()
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No organization is set up yet",
            )
        user = User(
            organization_id=organization.id,
            email=email,
            # Random unguessable password: these accounts are only ever entered
            # through this endpoint, never via the password login.
            hashed_password=hash_password(secrets.token_urlsafe(24)),
            full_name=full_name,
            role=payload.role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _issue_session(user, response)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}
