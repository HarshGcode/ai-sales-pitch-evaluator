from sqlalchemy.orm import Session

from app.config import settings
from app.models.evaluation import Evaluation, Feedback
from app.models.script import Script
from app.models.user import Role, User
from app.schemas.evaluation import EvaluationOut, FeedbackOut


def serialize_evaluation(evaluation: Evaluation, db: Session) -> EvaluationOut:
    script = db.get(Script, evaluation.script_id)
    sales_exec = db.get(User, evaluation.sales_exec_id)
    feedback = db.query(Feedback).filter(Feedback.evaluation_id == evaluation.id).first()

    return EvaluationOut(
        id=evaluation.id,
        organization_id=evaluation.organization_id,
        script_id=evaluation.script_id,
        script_title=script.title if script else "Unknown script",
        sales_exec_id=evaluation.sales_exec_id,
        sales_exec_name=sales_exec.full_name if sales_exec else "Unknown",
        status=evaluation.status,
        transcript_text=evaluation.transcript_text,
        transcript_language=evaluation.transcript_language,
        overall_score=evaluation.overall_score,
        error_message=evaluation.error_message,
        mock_mode=settings.mock_mode,
        created_at=evaluation.created_at,
        completed_at=evaluation.completed_at,
        feedback=FeedbackOut.model_validate(feedback) if feedback else None,
    )


def visible_evaluations_query(db: Session, current_user: User):
    """Scope evaluations to what this user is allowed to see.

    Sales execs see only their own; managers see their direct reports plus
    themselves; admins see the whole organization.
    """
    query = db.query(Evaluation).filter(Evaluation.organization_id == current_user.organization_id)
    if current_user.role == Role.SALES_EXEC.value:
        query = query.filter(Evaluation.sales_exec_id == current_user.id)
    elif current_user.role == Role.MANAGER.value:
        report_ids = [u.id for u in db.query(User).filter(User.manager_id == current_user.id).all()]
        report_ids.append(current_user.id)
        query = query.filter(Evaluation.sales_exec_id.in_(report_ids))
    return query
