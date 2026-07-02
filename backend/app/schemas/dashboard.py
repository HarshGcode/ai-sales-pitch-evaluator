from pydantic import BaseModel

from app.schemas.evaluation import EvaluationOut


class PerformerSummary(BaseModel):
    user_id: str
    name: str
    score: float


class MonthlyTrendPoint(BaseModel):
    month: str
    average_score: float


class DashboardStats(BaseModel):
    total_evaluations: int
    average_score: float | None
    best_performer: PerformerSummary | None
    weakest_performer: PerformerSummary | None
    script_compliance_rate: float | None
    monthly_trend: list[MonthlyTrendPoint]
    recent_evaluations: list[EvaluationOut]


class LeaderboardEntry(BaseModel):
    user_id: str
    full_name: str
    department: str | None
    evaluation_count: int
    average_score: float
