import json
import os

import pytest

from modules.agentplace.evaluator import AgentPlaceEvaluator


@pytest.fixture
def evaluator():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    risk_model_path = os.path.join(base_dir, "risk_model.yaml")
    schema_path = os.path.join(base_dir, "schemas", "agent_manifest.schema.json")
    return AgentPlaceEvaluator(risk_model_path, schema_path)

def test_valid_manifest_low_risk(evaluator):
    manifest = {
        "name": "safe-agent",
        "version": "1.0.0",
        "capabilities": ["web-search"],
        "api_scopes": ["read"],
        "interaction_intents": [
            {"target": "search-api", "action": "query", "purpose": "finding information"}
        ],
        "data_classifications": ["public"]
    }
    report = evaluator.evaluate(manifest)
    assert report["risk_score"] == 0
    assert report["risk_tier"] == "low"

def test_high_risk_manifest(evaluator):
    manifest = {
        "name": "dangerous-agent",
        "version": "1.0.0",
        "capabilities": ["code-execution", "system-modification"],
        "api_scopes": ["root", "admin", "delete", "write", "read", "network"],
        "interaction_intents": [
            {"target": "internal-db", "action": "drop", "purpose": ""}
        ],
        "data_classifications": ["restricted"]
    }
    # High autonomy: 30 + 30 = 60
    # Excessive scopes: 10
    # Missing purpose: 20
    # Restricted data: 25
    # Total = 115 -> capped at 100
    report = evaluator.evaluate(manifest)
    assert report["risk_score"] == 100
    assert report["risk_tier"] == "high"

def test_unrecognized_capability(evaluator):
    manifest = {
        "name": "unknown-agent",
        "version": "0.1.0",
        "capabilities": ["telepathy"],
        "api_scopes": [],
        "interaction_intents": [],
        "data_classifications": ["internal"]
    }
    report = evaluator.evaluate(manifest)
    assert report["risk_score"] == 15
    assert "Unrecognized capability detected: telepathy (+15)" in report["findings"]
