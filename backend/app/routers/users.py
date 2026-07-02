import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.deps import require_role
from app.models.user import Role, User
from app.schemas.user import UserCreate, UserCreateResponse, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

# Which roles each creator role is allowed to create.
CREATABLE_ROLES = {
    Role.ADMIN.value: {Role.ADMIN.value, Role.MANAGER.value, Role.SALES_EXEC.value},
    Role.MANAGER.value: {Role.SALES_EXEC.value},
}


def generate_initial_password() -> str:
    return secrets.token_urlsafe(9)


@router.get("", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_role(Role.ADMIN.value, Role.MANAGER.value)),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.organization_id == current_user.organization_id)
    if current_user.role == Role.MANAGER.value:
        query = query.filter(User.manager_id == current_user.id)
    return query.order_by(User.created_at.desc()).all()


@router.post("", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_role(Role.ADMIN.value, Role.MANAGER.value)),
    db: Session = Depends(get_db),
):
    allowed = CREATABLE_ROLES.get(current_user.role, set())
    if payload.role.value not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{current_user.role} cannot create users with role {payload.role.value}",
        )
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    manager_id = payload.manager_id
    if current_user.role == Role.MANAGER.value:
        manager_id = current_user.id

    initial_password = generate_initial_password()
    user = User(
        organization_id=current_user.organization_id,
        email=payload.email,
        hashed_password=hash_password(initial_password),
        full_name=payload.full_name,
        role=payload.role.value,
        department=payload.department,
        manager_id=manager_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserCreateResponse(user=UserOut.model_validate(user), initial_password=initial_password)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(require_role(Role.ADMIN.value, Role.MANAGER.value)),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user or user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.role == Role.MANAGER.value and user.manager_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your report")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
