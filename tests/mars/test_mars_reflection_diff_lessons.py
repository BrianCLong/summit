from summit.mars.reflect import ReflectionEngine

def test_mars_reflection_diff_lessons():
    engine = ReflectionEngine()
    solution_a = "Approached the problem with a simple linear search."
    solution_b = "Approached the problem with an improved binary search."

    lesson = engine.distill_lesson("TEST-EVID", solution_a, solution_b)

    assert lesson["lesson_id"] == "L-TEST-EVID"
    assert "solution_a" in lesson["diff_summary"]
    assert "solution_b" in lesson["diff_summary"]
    assert lesson["effect"] == "positive" # solution_b has "improved"

def test_mars_reflection_redaction():
    engine = ReflectionEngine()
    # Solution with secrets and script tags
    solution_a = "API_KEY=sk-12345678901234567890123456789012"
    solution_b = "API_KEY=sk-12345678901234567890123456789012 <script>alert(1)</script> improved version"

    lesson = engine.distill_lesson("REDACT-EVID", solution_a, solution_b)

    assert "sk-123" not in lesson["diff_summary"]
    assert "[REDACTED_API_KEY]" in lesson["diff_summary"]
    assert "<script>" not in lesson["diff_summary"]
    assert "[REDACTED_SCRIPT]" in lesson["diff_summary"]
    assert "PII" in lesson["redactions_applied"] or "Secrets" in lesson["redactions_applied"]
