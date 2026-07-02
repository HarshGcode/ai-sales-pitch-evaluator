from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.script import Script, ScriptSection
from app.models.user import Role, User
from app.schemas.script import ScriptOut, ScriptSectionOut
from app.services.file_parsing import UnsupportedFileTypeError, extract_text
from app.services.script_extraction import run_script_extraction
from app.services.storage import get_storage_service

router = APIRouter(prefix="/scripts", tags=["scripts"])

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}


@router.get("", response_model=list[ScriptOut])
def list_scripts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Script)
        .filter(Script.organization_id == current_user.organization_id)
        .order_by(Script.created_at.desc())
        .all()
    )


@router.get("/{script_id}", response_model=ScriptOut)
def get_script(script_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    script = db.get(Script, script_id)
    if not script or script.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    return script


@router.get("/{script_id}/sections", response_model=list[ScriptSectionOut])
def get_script_sections(
    script_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    script = db.get(Script, script_id)
    if not script or script.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    return (
        db.query(ScriptSection)
        .filter(ScriptSection.script_id == script_id)
        .order_by(ScriptSection.order_index)
        .all()
    )


@router.post("", response_model=ScriptOut, status_code=status.HTTP_201_CREATED)
def upload_script(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(Role.ADMIN.value, Role.MANAGER.value)),
    db: Session = Depends(get_db),
):
    import os

    suffix = os.path.splitext(file.filename or "")[1].lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    storage = get_storage_service()
    key = storage.save(file, "scripts")

    try:
        raw_text = extract_text(storage.get_path(key), file.filename or "")
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    script = Script(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        title=title,
        original_filename=file.filename or "upload",
        file_path=key,
        raw_text=raw_text,
        status="processing",
    )
    db.add(script)
    db.commit()
    db.refresh(script)

    background_tasks.add_task(run_script_extraction, script.id)
    return script
