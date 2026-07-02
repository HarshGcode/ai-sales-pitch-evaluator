from app.config import settings
from app.services.llm import GroqLLM, MockLLM, OpenAILLM, get_llm_service
from app.services.transcription import (
    GroqTranscription,
    MockTranscription,
    WhisperTranscription,
    get_transcription_service,
)


def _clear_keys(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")


def test_get_llm_service_uses_mock_without_any_api_key(monkeypatch):
    _clear_keys(monkeypatch)
    assert isinstance(get_llm_service(), MockLLM)


def test_get_llm_service_uses_openai_with_openai_key(monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-fake-key-for-gating-test")
    assert isinstance(get_llm_service(), OpenAILLM)


def test_get_llm_service_uses_groq_with_groq_key(monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk-fake-key-for-gating-test")
    assert isinstance(get_llm_service(), GroqLLM)


def test_get_llm_service_prefers_groq_when_both_keys_set(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-fake-key-for-gating-test")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk-fake-key-for-gating-test")
    assert isinstance(get_llm_service(), GroqLLM)


def test_get_transcription_service_uses_mock_without_any_api_key(monkeypatch):
    _clear_keys(monkeypatch)
    assert isinstance(get_transcription_service(), MockTranscription)


def test_get_transcription_service_uses_whisper_with_openai_key(monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-fake-key-for-gating-test")
    assert isinstance(get_transcription_service(), WhisperTranscription)


def test_get_transcription_service_uses_groq_with_groq_key(monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk-fake-key-for-gating-test")
    assert isinstance(get_transcription_service(), GroqTranscription)
