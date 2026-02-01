import json
import os
import pytest
from summit_rl.feedback import RichFeedback, sanitize_feedback

def load_fixture(name):
    path = os.path.join(os.path.dirname(__file__), "fixtures", name)
    with open(path) as f:
        return json.load(f)

def test_rich_feedback_ok():
    data = load_fixture("rich_feedback_ok.json")
    fb = RichFeedback(
        kind=data["kind"],
        text=data["text"],
        meta=data["meta"],
        provenance=data["provenance"]
    )
    sanitized = sanitize_feedback(fb)
    assert sanitized.text == data["text"]

def test_rich_feedback_redaction():
    data = load_fixture("rich_feedback_bad_includes_secrets.json")
    fb = RichFeedback(
        kind=data["kind"],
        text=data["text"],
        meta=data["meta"],
        provenance=data["provenance"]
    )
    sanitized = sanitize_feedback(fb)
    assert "sk-" not in sanitized.text
    assert "[REDACTED_API_KEY]" in sanitized.text
