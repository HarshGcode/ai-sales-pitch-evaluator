import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from openai import OpenAI

from app.config import settings

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_WHISPER_MODEL = "whisper-large-v3-turbo"

MOCK_TRANSCRIPT_TEMPLATE = (
    "[MOCK TRANSCRIPT] Hi, thank you for taking the time to speak with me today. "
    "My name is {agent}, and I wanted to walk you through our offering. "
    "Let me first confirm a few details with you, and then I'll explain the pricing "
    "and answer any questions you might have. Does that sound good? Great, let's get started. "
    "So, based on what you've told me, I think this could be a great fit for your needs. "
    "The pricing is straightforward, and I want to make sure you understand the terms clearly. "
    "Do you have any questions or concerns before we move forward? "
    "Thank you again for your time, and I look forward to working with you."
)


@dataclass
class TranscriptionResult:
    text: str
    language: str
    duration_seconds: float | None = None


class TranscriptionService(ABC):
    @abstractmethod
    def transcribe(self, audio_path: Path) -> TranscriptionResult: ...


class WhisperTranscription(TranscriptionService):
    """Also backs GroqTranscription below, since Groq's audio API is OpenAI-compatible —
    only the base_url, api_key, and model differ."""

    model = "whisper-1"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.client = OpenAI(api_key=api_key or settings.OPENAI_API_KEY, base_url=base_url)

    def transcribe(self, audio_path: Path) -> TranscriptionResult:
        with audio_path.open("rb") as audio_file:
            response = self.client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                response_format="verbose_json",
            )
        return TranscriptionResult(
            text=response.text,
            language=getattr(response, "language", "unknown") or "unknown",
            duration_seconds=getattr(response, "duration", None),
        )


class GroqTranscription(WhisperTranscription):
    """Free-tier alternative to OpenAI Whisper, using Groq's hosted whisper-large-v3-turbo."""

    model = GROQ_WHISPER_MODEL

    def __init__(self):
        super().__init__(api_key=settings.GROQ_API_KEY, base_url=GROQ_BASE_URL)


class MockTranscription(TranscriptionService):
    """Deterministic offline stand-in so the app is fully demoable with zero API keys."""

    def transcribe(self, audio_path: Path) -> TranscriptionResult:
        seed = int(hashlib.sha256(audio_path.name.encode()).hexdigest(), 16)
        text = MOCK_TRANSCRIPT_TEMPLATE.format(agent="the sales agent")
        return TranscriptionResult(
            text=text,
            language="en",
            duration_seconds=float(30 + seed % 300),
        )


def get_transcription_service() -> TranscriptionService:
    if settings.GROQ_API_KEY:
        return GroqTranscription()
    if settings.OPENAI_API_KEY:
        return WhisperTranscription()
    return MockTranscription()
