import pytest
import json
from summit.mars.reflect import ReflectionEngine
from summit.mars.redact import redact_text

def test_mars_reflection_diff_lessons():
    engine = ReflectionEngine()

    solution_a = "def hello():\n    return 'world'"
    solution_b = "def hello():\n    return 'mars'"

    lesson = engine.distill_lesson("test-1", solution_a, solution_b)

    assert "lesson_id" in lesson
    assert lesson["source"] == "same_branch"
    assert "diff_summary" in lesson

def test_redaction_secrets_and_scripts():
    secret_text = "Key sk-1234567890abcdef1234567890abcdef and <script>alert(1)</script>"
    redacted = redact_text(secret_text)
    assert "sk-" not in redacted
    assert "[REDACTED_API_KEY]" in redacted
    assert "<script>" not in redacted
    assert "[REDACTED_SCRIPT]" in redacted
