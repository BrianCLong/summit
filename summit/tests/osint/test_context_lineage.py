import pytest
import json
import os
from summit.osint.context_shadow import ContextShadow
from summit.osint.redaction import Redactor

def test_redaction_basic():
    redactor = Redactor()
    text = "Email me at test@example.com please"
    redacted = redactor.redact_text(text)
    assert "test@example.com" not in redacted
    assert "[EMAIL:" in redacted
    assert redactor.get_counts()["email"] == 1

def test_context_shadow_capture():
    shadow = ContextShadow("source-1")
    shadow.add_adjacency("reply", {"text": "Hello @user1"}, 1)

    export = shadow.export_lineage()
    assert export["source_id"] == "source-1"
    assert len(export["adjacency"]) == 1
    assert export["adjacency"][0]["type"] == "reply"
    # redacted_content is NOT in export_lineage
    assert "redacted_content" not in export["adjacency"][0]

    # Check full shadow
    full = shadow.get_full_shadow()
    redacted_text = full["adjacency"][0]["redacted_content"]["text"]
    assert "@user1" not in redacted_text
    assert "[HANDLE:" in redacted_text

def test_abuse_case_pii():
    fixture_path = os.path.join(os.path.dirname(__file__), "../fixtures/abuse/context_shadow_pii.json")
    if not os.path.exists(fixture_path):
        pytest.skip("Fixture not found")

    with open(fixture_path, 'r') as f:
        data = json.load(f)

    shadow = ContextShadow(data["source_id"])
    for item in data["adjacency"]:
        shadow.add_adjacency(item["type"], item["content"], item["rank"])

    counts = shadow.redactor.get_counts()
    assert counts["email"] >= 1
    assert counts["phone"] >= 1

    export = shadow.export_lineage()
    assert export["redaction_report"]["pii_redacted_count"] >= 2
