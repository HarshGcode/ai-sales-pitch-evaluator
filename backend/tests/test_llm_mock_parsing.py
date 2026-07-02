import pytest

from app.services.llm import MockLLM, validate_script_structured


def test_mock_structure_script_extracts_labels_before_colons():
    llm = MockLLM()
    raw = "Greeting: Say hello.\nEligibility: Explain terms.\nClosing: Wrap up.\n"
    structured = llm.structure_script(raw)
    validated = validate_script_structured(structured)
    assert "Greeting" in validated.mandatory_points
    assert "Eligibility" in validated.mandatory_points
    assert validated.closing == ["Closing"]
    assert "Closing" not in validated.mandatory_points


def test_mock_structure_script_falls_back_to_lines_without_colons():
    llm = MockLLM()
    raw = "Say hello\nExplain the product\nAsk for the sale\n"
    structured = llm.structure_script(raw)
    validated = validate_script_structured(structured)
    assert len(validated.mandatory_points) + len(validated.closing) >= 1


def test_mock_evaluate_pitch_returns_valid_shape():
    llm = MockLLM()
    script_structured = {"mandatory_points": ["Greeting", "Closing"]}
    result = llm.evaluate_pitch("Hello, thanks for your time today.", script_structured)
    assert 0 <= result["overall_score"] <= 100
    assert 0 <= result["script_adherence_pct"] <= 100
    assert set(result["scores"].keys()) == {
        "tone",
        "confidence",
        "empathy",
        "clarity",
        "compliance",
        "closing_quality",
        "filler_word_count",
        "talk_to_listen_ratio",
        "interactivity_score",
    }
    assert 0 <= result["scores"]["talk_to_listen_ratio"] <= 100
    assert 0 <= result["scores"]["interactivity_score"] <= 100
    assert isinstance(result["missing_mandatory_points"], list)


def test_mock_evaluate_pitch_is_deterministic_for_same_transcript():
    llm = MockLLM()
    script_structured = {"mandatory_points": ["Greeting", "Closing"]}
    first = llm.evaluate_pitch("Same transcript text", script_structured)
    second = llm.evaluate_pitch("Same transcript text", script_structured)
    assert first == second


def test_validate_script_structured_rejects_bad_shape():
    with pytest.raises(ValueError):
        validate_script_structured({"mandatory_points": "not-a-list"})
