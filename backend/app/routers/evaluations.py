from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.evaluation import AudioFile, Evaluation
from app.models.script import Script
from app.models.user import Role, User
from app.schemas.evaluation import EvaluationOut
from app.services.evaluation_pipeline import run_evaluation_pipeline
from app.services.evaluation_queries import serialize_evaluation, visible_evaluations_query
from app.services.storage import get_storage_service

router = APIRouter(prefix="/evaluations", tags=["evaluations"])

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm"}


@router.get("", response_model=list[EvaluationOut])
def list_evaluations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    evaluations = visible_evaluations_query(db, current_user).order_by(Evaluation.created_at.desc()).all()
    return [serialize_evaluation(e, db) for e in evaluations]


@router.get("/{evaluation_id}", response_model=EvaluationOut)
def get_evaluation(
    evaluation_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    evaluation = db.get(Evaluation, evaluation_id)
    if not evaluation or evaluation.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    if current_user.role == Role.SALES_EXEC.value and evaluation.sales_exec_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your evaluation")
    return serialize_evaluation(evaluation, db)


@router.post("", response_model=EvaluationOut, status_code=status.HTTP_201_CREATED)
def create_evaluation(
    background_tasks: BackgroundTasks,
    script_id: str = Form(...),
    sales_exec_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import os

    if current_user.role == Role.SALES_EXEC.value and sales_exec_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Sales executives can only evaluate themselves"
        )

    script = db.get(Script, script_id)
    if not script or script.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    if script.status != "ready":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Script is not ready yet")

    sales_exec = db.get(User, sales_exec_id)
    if not sales_exec or sales_exec.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales executive not found")

    suffix = os.path.splitext(file.filename or "")[1].lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
        )

    storage = get_storage_service()
    key = storage.save(file, "audio")

    audio_file = AudioFile(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        file_path=key,
        original_filename=file.filename or "upload",
        mime_type=file.content_type,
    )
    db.add(audio_file)
    db.flush()

    evaluation = Evaluation(
        organization_id=current_user.organization_id,
        script_id=script_id,
        sales_exec_id=sales_exec_id,
        evaluated_by=current_user.id,
        audio_file_id=audio_file.id,
        status="pending",
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    background_tasks.add_task(run_evaluation_pipeline, evaluation.id)
    return serialize_evaluation(evaluation, db)
