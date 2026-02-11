import pytest
from summit.slopguard.policy import evaluate_artifact, SlopDecision
from unittest.mock import patch

def test_evaluate_artifact_allowed():
    artifact = {"kind": "text", "text": "clean text", "meta": {"disclosure": "yes"}}
    policy = {"version": "1.0", "deny_threshold": 0.8, "require_disclosure_fields": ["disclosure"]}

    with patch("summit.slopguard.policy.get_slop_score", return_value={"score": 0.1, "reasons": [], "metrics": {}}) as mock_score, \
         patch("summit.slopguard.policy.extract_citations", return_value=[]) as mock_cit, \
         patch("summit.slopguard.policy.validate_citations", return_value={"valid": True, "counts": {}, "issues": []}) as mock_val, \
         patch("summit.slopguard.policy.run_cluster_analysis", return_value={"status": "INACTIVE", "findings": []}) as mock_cluster:

        decision = evaluate_artifact(artifact=artifact, policy=policy)
        assert decision.allowed is True
        assert decision.score == 0.1

def test_evaluate_artifact_denied_score():
    artifact = {"kind": "text", "text": "bad text", "meta": {"disclosure": "yes"}}
    policy = {"version": "1.0", "deny_threshold": 0.5, "require_disclosure_fields": []}

    with patch("summit.slopguard.policy.get_slop_score", return_value={"score": 0.9, "reasons": [], "metrics": {}}) as mock_score, \
         patch("summit.slopguard.policy.extract_citations", return_value=[]) as mock_cit, \
         patch("summit.slopguard.policy.validate_citations", return_value={"valid": True, "counts": {}, "issues": []}) as mock_val, \
         patch("summit.slopguard.policy.run_cluster_analysis", return_value={"status": "INACTIVE", "findings": []}) as mock_cluster:

        decision = evaluate_artifact(artifact=artifact, policy=policy)
        assert decision.allowed is False
        assert decision.score == 0.9
        assert "SCORE_ABOVE_THRESHOLD" in decision.reasons[0]
