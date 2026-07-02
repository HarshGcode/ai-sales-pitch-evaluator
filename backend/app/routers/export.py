import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.evaluation import Evaluation
from app.models.user import User
from app.routers.search import apply_evaluation_filters
from app.services.evaluation_queries import serialize_evaluation, visible_evaluations_query

router = APIRouter(prefix="/export", tags=["export"])

CSV_HEADERS = [
    "sales_exec_name",
    "script_title",
    "status",
    "overall_score",
    "script_adherence_pct",
    "created_at",
    "completed_at",
    "strengths",
    "weaknesses",
    "improvement_tips",
    "transcript",
]


@router.get("/evaluations.csv")
def export_evaluations_csv(
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

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_HEADERS)
    for e in evaluations:
        out = serialize_evaluation(e, db)
        feedback = out.feedback
        writer.writerow(
            [
                out.sales_exec_name,
                out.script_title,
                out.status,
                out.overall_score,
                feedback.script_adherence_pct if feedback else "",
                out.created_at.isoformat(),
                out.completed_at.isoformat() if out.completed_at else "",
                "; ".join(feedback.strengths) if feedback else "",
                "; ".join(feedback.weaknesses) if feedback else "",
                "; ".join(feedback.improvement_tips) if feedback else "",
                out.transcript_text or "",
            ]
        )
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=evaluations.csv"},
    )
