from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LLMEvaluationScores(BaseModel):
    """Subjective scores the LLM estimates by reading the transcript, same as a human coach would."""

    tone: int
    confidence: int
    empathy: int
    clarity: int
    compliance: int
    closing_quality: int
    filler_word_count: int
    talk_to_listen_ratio: int  # estimated % of the conversation the sales rep spoke
    interactivity_score: int  # 0-100, higher = frequent back-and-forth, lower = long monologues


class EvaluationScores(LLMEvaluationScores):
    """Full stored scores: the LLM-estimated fields above plus metrics we compute directly
    from the transcript and audio duration, so they aren't left to the model to guess.

    The four Gong-style fields are optional here (unlike on LLMEvaluationScores, where they're
    required for freshly-generated evaluations) so that evaluations persisted before these
    metrics existed still deserialize fine instead of failing validation.
    """

    talk_to_listen_ratio: int | None = None
    interactivity_score: int | None = None
    question_count: int | None = None
    speaking_pace_wpm: int | None = None


class EvaluationLLMResponse(BaseModel):
    overall_score: int
    script_adherence_pct: float
    missing_mandatory_points: list[str] = []
    scores: LLMEvaluationScores
    strengths: list[str] = []
    weaknesses: list[str] = []
    improvement_tips: list[str] = []


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    evaluation_id: str
    script_adherence_pct: float
    scores_json: EvaluationScores
    missing_mandatory_points: list[str]
    strengths: list[str]
    weaknesses: list[str]
    improvement_tips: list[str]


class EvaluationOut(BaseModel):
    id: str
    organization_id: str
    script_id: str
    script_title: str
    sales_exec_id: str
    sales_exec_name: str
    status: str
    transcript_text: str | None
    transcript_language: str | None
    overall_score: int | None
    error_message: str | None
    mock_mode: bool
    created_at: datetime
    completed_at: datetime | None
    feedback: FeedbackOut | None
