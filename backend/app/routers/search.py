from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.evaluation import Evaluation
from app.models.user import User
from app.schemas.evaluation import EvaluationOut
from app.services.evaluation_queries import serialize_evaluation, visible_evaluations_query

router = APIRouter(prefix="/search", tags=["search"])


def apply_evaluation_filters(
    query,
    db: Session,
    employee: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
    department: str | None,
    min_score: int | None,
    max_score: int | None,
    script_id: str | None,
):
    if employee:
        matching_ids = [u.id for u in db.query(User).filter(User.full_name.ilike(f"%{employee}%")).all()]
        query = query.filter(Evaluation.sales_exec_id.in_(matching_ids or ["__none__"]))
    if department:
        matching_ids = [u.id for u in db.query(User).filter(User.department.ilike(f"%{department}%")).all()]
        query = query.filter(Evaluation.sales_exec_id.in_(matching_ids or ["__none__"]))
    if date_from:
        query = query.filter(Evaluation.created_at >= date_from)
    if date_to:
        query = query.filter(Evaluation.created_at <= date_to)
    if min_score is not None:
        query = query.filter(Evaluation.overall_score >= min_score)
    if max_score is not None:
        query = query.filter(Evaluation.overall_score <= max_score)
    if script_id:
        query = query.filter(Evaluation.script_id == script_id)
    return query


@router.get("/evaluations", response_model=list[EvaluationOut])
def search_evaluations(
    employee: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    department: str | None = Query(default=None),
    min_score: int | None = Query(default=None),
    max_score: int | None = Query(default=None),
    script_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = visible_evaluations_query(db, current_user)
    query = apply_evaluation_filters(
        query, db, employee, date_from, date_to, department, min_score, max_score, script_id
    )
    evaluations = query.order_by(Evaluation.created_at.desc()).all()
    return [serialize_evaluation(e, db) for e in evaluations]
