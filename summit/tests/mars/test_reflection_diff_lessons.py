import pytest
import json
from summit.mars.reflect import ReflectionEngine
from summit.mars.redact import redact_text

def test_mars_reflection_diff_lessons():
    engine = ReflectionEngine("EVID-REFL0001")
    lesson = engine.distill_lesson(
        solution_a="Base code",
        solution_b="Optimized code with better loop",
        outcome_a=0.5,
        outcome_b=0.8
    )

    assert lesson["effect"] == "positive"
    assert "Comparison" in lesson["diff_summary"]
    assert "lesson_" in lesson["lesson_id"]

def test_mars_redaction_pii():
    text = "Contact me at test@example.com or 192.168.1.1. My key is ak_12345678901234567890"
    redacted, found = redact_text(text)

    assert "[REDACTED]" in redacted
    assert "test@example.com" not in redacted
    assert "192.168.1.1" not in redacted
    assert "ak_12345678901234567890" not in redacted
    assert len(found) == 3

def test_mars_reflection_injection_resistance():
    # Test with malicious payload
    engine = ReflectionEngine("EVID-REFL0002")
    malicious_solution = '"; DROP TABLE users; --'
    lesson = engine.distill_lesson("Normal", malicious_solution, 0.1, 0.0)

    # Artifact should still be valid JSON and not execute anything (it's just data)
    artifact = engine.generate_lessons_artifact([lesson])
    json_str = json.dumps(artifact)
    assert 'DROP TABLE' in json_str # It's just text in JSON
    # The point is it's treated as data
