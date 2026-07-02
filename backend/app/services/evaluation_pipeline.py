import logging
from datetime import datetime, timezone

from pydantic import ValidationError

from app import database
from app.models.evaluation import AudioFile, Evaluation, Feedback
from app.models.script import Script
from app.schemas.evaluation import EvaluationLLMResponse, EvaluationScores
from app.services.llm import get_llm_service
from app.services.storage import get_storage_service
from app.services.transcription import get_transcription_service

logger = logging.getLogger(__name__)


def _validate_evaluation_response(raw: dict) -> EvaluationLLMResponse:
    return EvaluationLLMResponse.model_validate(raw)


def _compute_transcript_metrics(transcript: str, duration_seconds: float | None) -> dict:
    """Gong-style metrics computed directly from the transcript/audio, not left to the LLM to guess."""
    question_count = transcript.count("?")
    word_count = len(transcript.split())
    speaking_pace_wpm = round(word_count / (duration_seconds / 60)) if duration_seconds else 0
    return {"question_count": question_count, "speaking_pace_wpm": speaking_pace_wpm}


def run_evaluation_pipeline(evaluation_id: str) -> None:
    db = database.SessionLocal()
    try:
        evaluation = db.get(Evaluation, evaluation_id)
        if not evaluation:
            logger.warning("Evaluation %s not found for pipeline run", evaluation_id)
            return

        audio_file = db.get(AudioFile, evaluation.audio_file_id)
        script = db.get(Script, evaluation.script_id)

        try:
            evaluation.status = "transcribing"
            db.commit()

            storage = get_storage_service()
            audio_path = storage.get_path(audio_file.file_path)
            transcription = get_transcription_service()
            result = transcription.transcribe(audio_path)

            evaluation.transcript_text = result.text
            evaluation.transcript_language = result.language
            audio_file.duration_seconds = result.duration_seconds
            evaluation.status = "evaluating"
            db.commit()

            llm = get_llm_service()
            raw = None
            try:
                raw = llm.evaluate_pitch(result.text, script.structured_json or {})
                parsed = _validate_evaluation_response(raw)
            except (ValidationError, TypeError, KeyError):
                raw = llm.evaluate_pitch(result.text, script.structured_json or {})
                parsed = _validate_evaluation_response(raw)

            evaluation.overall_score = parsed.overall_score
            evaluation.status = "completed"
            evaluation.completed_at = datetime.now(timezone.utc)

            full_scores = EvaluationScores(
                **parsed.scores.model_dump(),
                **_compute_transcript_metrics(result.text, result.duration_seconds),
            )

            db.add(
                Feedback(
                    evaluation_id=evaluation.id,
                    script_adherence_pct=parsed.script_adherence_pct,
                    scores_json=full_scores.model_dump(),
                    missing_mandatory_points=parsed.missing_mandatory_points,
                    strengths=parsed.strengths,
                    weaknesses=parsed.weaknesses,
                    improvement_tips=parsed.improvement_tips,
                    raw_llm_response=raw,
                )
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Evaluation pipeline failed for %s", evaluation_id)
            evaluation.status = "failed"
            evaluation.error_message = str(exc)
            db.commit()
    finally:
        db.close()
