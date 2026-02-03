import json
import pytest
from summit.slopguard.scoring import score_artifact
from summit.slopguard.policy import evaluate_artifact

def test_high_repetition():
    text = "The paper is good. " * 20
    result = score_artifact(text)
    assert result["score"] >= 0.4
    assert any("repetition" in r for r in result["reasons"])

def test_boilerplate():
    text = "As an AI language model, I think this is a tapestry of research."
    result = score_artifact(text)
    assert result["score"] > 0
    assert any("boilerplate" in r for r in result["reasons"])

def test_clean_artifact():
    text = "This is a unique sentence about something specific. And another one about different details."
    result = score_artifact(text)
    assert result["score"] == 0
    assert len(result["reasons"]) == 0

def test_policy_denies_missing_disclosures():
    artifact = {
        "text": "Valid text but no meta.",
        "meta": {}
    }
    policy = {
        "version": "1",
        "deny_threshold": 0.7,
        "require_disclosure_fields": ["llm_assisted"]
    }
    decision = evaluate_artifact(artifact=artifact, policy=policy)
    assert decision.allowed == False
    assert any("missing_required_disclosure" in r for r in decision.reasons)

def test_policy_allows_clean_with_disclosures():
    artifact = {
        "text": "Valid text with meta.",
        "meta": {"llm_assisted": False, "llm_tools": [], "human_verifier": "human"}
    }
    policy = {
        "version": "1",
        "deny_threshold": 0.7,
        "require_disclosure_fields": ["llm_assisted", "llm_tools", "human_verifier"]
    }
    decision = evaluate_artifact(artifact=artifact, policy=policy)
    assert decision.allowed == True

def test_dataset_hygiene_flag_off():
    artifact = {
        "kind": "dataset",
        "text": "some data",
        "meta": {"source_type": "unknown"}
    }
    policy = {
        "feature_flags": {"dataset_pollution_firewall": False}
    }
    decision = evaluate_artifact(artifact=artifact, policy=policy)
    assert decision.allowed == True
    assert "dataset_source_type_unknown" in decision.reasons

def test_dataset_hygiene_flag_on():
    artifact = {
        "kind": "dataset",
        "text": "some data",
        "meta": {"source_type": "unknown"}
    }
    policy = {
        "feature_flags": {"dataset_pollution_firewall": True}
    }
    decision = evaluate_artifact(artifact=artifact, policy=policy)
    assert decision.allowed == False
    assert "dataset_source_type_unknown" in decision.reasons
