import pytest
from unittest.mock import patch, mock_open, MagicMock
from summit.slopguard.scoring import get_slop_score
from summit.slopguard.citations import extract_citations, validate_citations
from summit.slopguard.policy import evaluate_artifact, SlopDecision
from summit.slopguard.cluster import run_cluster_analysis

def test_get_slop_score_empty():
    res = get_slop_score("")
    assert res["score"] == 0.0
    assert "EMPTY_CONTENT" in res["reasons"]

def test_get_slop_score_boilerplate():
    text = "as an ai language model it is important to note that " * 5
    res = get_slop_score(text)
    assert "HIGH_BOILERPLATE" in str(res["reasons"])
    assert res["score"] > 0

def test_citations():
    text = "Check 10.1234/test and https://example.com"
    extracted = extract_citations(text)
    assert "10.1234/test" in extracted["dois"]
    assert "https://example.com" in extracted["urls"]

    validated = validate_citations(extracted)
    assert validated["valid"] is True

def test_citations_suspicious():
    text = "Check 10.1234/example-paper"
    extracted = extract_citations(text)
    validated = validate_citations(extracted)
    assert validated["valid"] is False
    assert "SUSPICIOUS_DOIS" in str(validated["issues"])

def test_cluster_analysis_disabled():
    artifact = {"text": "hello"}
    policy = {"feature_flags": {"advanced_cluster_detection": False}}
    result = run_cluster_analysis(artifact, policy)
    assert result["status"] == "DISABLED"

def test_cluster_analysis_active():
    artifact = {"text": "hello world", "id": "1"}
    policy = {"feature_flags": {"advanced_cluster_detection": True}}

    # Mocking file operations to avoid side effects
    with patch("builtins.open", mock_open(read_data='[{"hash": "other_hash", "tokens": ["other"], "id": "2"}]')) as mock_file, \
         patch("os.makedirs"), \
         patch("os.path.exists", return_value=True), \
         patch("json.dump") as mock_json_dump:

         result = run_cluster_analysis(artifact, policy)
         assert result["status"] == "ACTIVE"
         mock_json_dump.assert_called()

def test_cluster_analysis_duplicate():
    artifact = {"text": "hello world", "id": "1"}
    policy = {"feature_flags": {"advanced_cluster_detection": True}}

    # Mock registry containing the exact hash (hash of "hello world")
    import hashlib
    h = hashlib.sha256(b"hello world").hexdigest()
    registry_data = f'[{{"hash": "{h}", "tokens": ["hello", "world"], "id": "1"}}]'

    with patch("builtins.open", mock_open(read_data=registry_data)), \
         patch("os.makedirs"), \
         patch("os.path.exists", return_value=True), \
         patch("json.dump"):

         result = run_cluster_analysis(artifact, policy)
         assert any(f["type"] == "EXACT_DUPLICATE" for f in result["findings"])

def test_policy_evaluate():
    policy = {
        "deny_threshold": 0.8,
        "require_disclosure_fields": ["ai_generated"],
        "feature_flags": {"advanced_cluster_detection": False}
    }

    # Case 1: Missing disclosure
    artifact = {"text": "Simple text", "meta": {}}
    decision = evaluate_artifact(artifact=artifact, policy=policy)
    assert decision.allowed is False
    assert any("MISSING_DISCLOSURES" in r for r in decision.reasons)

    # Case 2: Valid
    artifact_valid = {"text": "Original unique content.", "meta": {"ai_generated": True}}
    decision_valid = evaluate_artifact(artifact=artifact_valid, policy=policy)
    assert decision_valid.allowed is True
