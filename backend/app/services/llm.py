import hashlib
import json
from abc import ABC, abstractmethod

from openai import OpenAI
from pydantic import ValidationError

from app.config import settings
from app.schemas.script import ScriptStructured

OPENAI_MODEL = "gpt-4o-mini"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile"


class LLMService(ABC):
    @abstractmethod
    def structure_script(self, raw_text: str) -> dict:
        """Extract mandatory/optional points, compliance, objections, and closing from a script."""

    @abstractmethod
    def evaluate_pitch(self, transcript: str, script_structured: dict) -> dict:
        """Score a transcript against a structured script and return feedback."""


SCRIPT_STRUCTURING_SYSTEM_PROMPT = """You are an assistant that extracts structured sections from a sales call script.
Return strict JSON matching this shape:
{
  "mandatory_points": ["..."],
  "optional_points": ["..."],
  "compliance_statements": ["..."],
  "objection_handling": [{"objection": "...", "suggested_response": "..."}],
  "closing": ["..."]
}
Only return the JSON object, no other text."""

EVALUATION_SYSTEM_PROMPT = """You are an expert sales coach evaluating a sales pitch transcript against a target script.
Score objectively based on the transcript content. Return strict JSON matching this shape:
{
  "overall_score": <int 0-100>,
  "script_adherence_pct": <float 0-100>,
  "missing_mandatory_points": ["..."],
  "scores": {
    "tone": <int 0-100>,
    "confidence": <int 0-100>,
    "empathy": <int 0-100>,
    "clarity": <int 0-100>,
    "compliance": <int 0-100>,
    "closing_quality": <int 0-100>,
    "filler_word_count": <int>,
    "talk_to_listen_ratio": <int 0-100, estimated % of the conversation the sales rep spoke vs the customer, based on conversational cues in the transcript>,
    "interactivity_score": <int 0-100, how frequently the conversation alternates between rep and customer; high = frequent back-and-forth, low = long uninterrupted monologues>
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvement_tips": ["..."]
}
Only return the JSON object, no other text."""


class OpenAILLM(LLMService):
    """Chat-completions based LLM. Also backs GroqLLM below, since Groq's API is
    OpenAI-compatible — only the base_url, api_key, and model differ."""

    model = OPENAI_MODEL

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.client = OpenAI(api_key=api_key or settings.OPENAI_API_KEY, base_url=base_url)

    def _chat_json(self, system_prompt: str, user_prompt: str) -> dict:
        response = self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return json.loads(response.choices[0].message.content)

    def structure_script(self, raw_text: str) -> dict:
        return self._chat_json(SCRIPT_STRUCTURING_SYSTEM_PROMPT, raw_text)

    def evaluate_pitch(self, transcript: str, script_structured: dict) -> dict:
        user_prompt = f"SCRIPT (structured):\n{json.dumps(script_structured)}\n\nTRANSCRIPT:\n{transcript}"
        return self._chat_json(EVALUATION_SYSTEM_PROMPT, user_prompt)


class GroqLLM(OpenAILLM):
    """Free-tier alternative to OpenAI, using Groq's OpenAI-compatible API."""

    model = GROQ_MODEL

    def __init__(self):
        super().__init__(api_key=settings.GROQ_API_KEY, base_url=GROQ_BASE_URL)


class MockLLM(LLMService):
    """Deterministic offline stand-in so the app is fully demoable with zero API keys."""

    def structure_script(self, raw_text: str) -> dict:
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        labels = []
        for line in lines:
            if ":" in line:
                label = line.split(":", 1)[0].strip()
                if label and len(label.split()) <= 5:
                    labels.append(label)
        if not labels:
            labels = lines[:8] or ["Introduction"]

        closing = [l for l in labels if l.lower() in ("closing", "close", "summary")] or [labels[-1]]
        mandatory = [l for l in labels if l not in closing]

        return {
            "mandatory_points": mandatory,
            "optional_points": [],
            "compliance_statements": [],
            "objection_handling": [
                {
                    "objection": "This sounds too expensive.",
                    "suggested_response": "Acknowledge the concern, then highlight value and ROI before discussing pricing flexibility.",
                }
            ],
            "closing": closing,
        }

    def evaluate_pitch(self, transcript: str, script_structured: dict) -> dict:
        seed = int(hashlib.sha256(transcript.encode()).hexdigest(), 16)
        mandatory_points = script_structured.get("mandatory_points", [])
        missing_count = seed % 3  # 0, 1, or 2 points "missing", deterministic per transcript
        missing = mandatory_points[:missing_count]

        def score(offset: int) -> int:
            return 60 + (seed >> offset) % 35

        scores = {
            "tone": score(1),
            "confidence": score(3),
            "empathy": score(5),
            "clarity": score(7),
            "compliance": score(9),
            "closing_quality": score(11),
            "filler_word_count": seed % 12,
            # Gong-style call metrics: estimated, not part of the overall_score average below,
            # since "higher is better" doesn't apply to talk ratio the way it does the others.
            "talk_to_listen_ratio": 35 + (seed >> 13) % 40,
            "interactivity_score": score(15),
        }
        quality_keys = ("tone", "confidence", "empathy", "clarity", "compliance", "closing_quality")
        adherence_pct = round(
            100 * max(0, len(mandatory_points) - missing_count) / max(1, len(mandatory_points)), 1
        )
        overall = round((sum(scores[k] for k in quality_keys) / len(quality_keys) + adherence_pct) / 2)

        return {
            "overall_score": overall,
            "script_adherence_pct": adherence_pct,
            "missing_mandatory_points": missing,
            "scores": scores,
            "strengths": ["Clear articulation of the offer", "Maintained a professional tone throughout"],
            "weaknesses": (
                [f"Did not cover: {point}" for point in missing]
                if missing
                else ["Could tighten up the closing statement"]
            ),
            "improvement_tips": [
                "Slow down slightly during the pricing discussion",
                "Ask more open-ended questions to engage the customer",
                "Summarize next steps explicitly before ending the call",
            ],
        }


def get_llm_service() -> LLMService:
    if settings.GROQ_API_KEY:
        return GroqLLM()
    if settings.OPENAI_API_KEY:
        return OpenAILLM()
    return MockLLM()


def validate_script_structured(raw: dict) -> ScriptStructured:
    try:
        return ScriptStructured.model_validate(raw)
    except ValidationError as exc:
        raise ValueError(f"LLM response did not match expected schema: {exc}") from exc
