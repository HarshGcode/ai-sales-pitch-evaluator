from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.evaluation import Evaluation, Feedback
from app.models.user import User
from app.schemas.dashboard import DashboardStats, LeaderboardEntry, MonthlyTrendPoint, PerformerSummary
from app.services.evaluation_queries import serialize_evaluation, visible_evaluations_query

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base_query = visible_evaluations_query(db, current_user)
    all_evaluations = base_query.order_by(Evaluation.created_at.desc()).all()
    completed = [e for e in all_evaluations if e.status == "completed" and e.overall_score is not None]

    average_score = round(sum(e.overall_score for e in completed) / len(completed), 1) if completed else None

    per_exec_scores: dict[str, list[int]] = defaultdict(list)
    for e in completed:
        per_exec_scores[e.sales_exec_id].append(e.overall_score)

    best_performer = None
    weakest_performer = None
    if per_exec_scores:
        averages = {uid: sum(scores) / len(scores) for uid, scores in per_exec_scores.items()}
        best_id = max(averages, key=lambda uid: averages[uid])
        worst_id = min(averages, key=lambda uid: averages[uid])
        best_user = db.get(User, best_id)
        worst_user = db.get(User, worst_id)
        best_performer = PerformerSummary(
            user_id=best_id, name=best_user.full_name if best_user else "Unknown", score=round(averages[best_id], 1)
        )
        weakest_performer = PerformerSummary(
            user_id=worst_id,
            name=worst_user.full_name if worst_user else "Unknown",
            score=round(averages[worst_id], 1),
        )

    feedback_rows = (
        db.query(Feedback)
        .filter(Feedback.evaluation_id.in_([e.id for e in completed]))
        .all()
        if completed
        else []
    )
    script_compliance_rate = (
        round(sum(f.script_adherence_pct for f in feedback_rows) / len(feedback_rows), 1)
        if feedback_rows
        else None
    )

    monthly: dict[str, list[int]] = defaultdict(list)
    for e in completed:
        month_key = e.created_at.strftime("%Y-%m")
        monthly[month_key].append(e.overall_score)
    monthly_trend = [
        MonthlyTrendPoint(month=month, average_score=round(sum(scores) / len(scores), 1))
        for month, scores in sorted(monthly.items())
    ]

    recent = all_evaluations[:5]

    return DashboardStats(
        total_evaluations=len(all_evaluations),
        average_score=average_score,
        best_performer=best_performer,
        weakest_performer=weakest_performer,
        script_compliance_rate=script_compliance_rate,
        monthly_trend=monthly_trend,
        recent_evaluations=[serialize_evaluation(e, db) for e in recent],
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    completed = (
        db.query(Evaluation)
        .filter(
            Evaluation.organization_id == current_user.organization_id,
            Evaluation.status == "completed",
            Evaluation.overall_score.isnot(None),
        )
        .all()
    )

    per_exec: dict[str, list[int]] = defaultdict(list)
    for e in completed:
        per_exec[e.sales_exec_id].append(e.overall_score)

    entries = []
    for user_id, scores in per_exec.items():
        user = db.get(User, user_id)
        if not user:
            continue
        entries.append(
            LeaderboardEntry(
                user_id=user_id,
                full_name=user.full_name,
                department=user.department,
                evaluation_count=len(scores),
                average_score=round(sum(scores) / len(scores), 1),
            )
        )

    entries.sort(key=lambda e: e.average_score, reverse=True)
    return entries
