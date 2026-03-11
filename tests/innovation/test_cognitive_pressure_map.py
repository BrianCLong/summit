import os

import pytest

from cogwar.innovation.cognitive_pressure_map import build_cognitive_pressure_map
from cogwar.policy.rules import PolicyDecision


def _sample_indicators():
    return [
        {
            "id": "IND-1",
            "name": "Election distrust wave",
            "severity": "high",
            "confidence": 0.9,
            "channels": ["social", "video"],
        },
        {
            "id": "IND-2",
            "name": "Aid corruption narrative",
            "severity": "medium",
            "confidence": 0.8,
            "channels": ["news"],
        },
    ]


def test_cognitive_pressure_map_disabled_by_default():
    old_val = os.environ.get("COGWAR_INNOVATION")
    if "COGWAR_INNOVATION" in os.environ:
        del os.environ["COGWAR_INNOVATION"]

    with pytest.raises(PermissionError):
        build_cognitive_pressure_map(_sample_indicators())

    if old_val is not None:
        os.environ["COGWAR_INNOVATION"] = old_val


def test_cognitive_pressure_map_deterministic_and_budgeted():
    os.environ["COGWAR_INNOVATION"] = "true"
    try:
        result = build_cognitive_pressure_map(_sample_indicators(), budget=3)
    finally:
        del os.environ["COGWAR_INNOVATION"]

    assert result["version"] == "CPME-V1"
    assert result["budget"] == 3
    assert result["defensive_only"] is True
    assert result["narrative_pressure"][0]["narrative_id"] == "Election distrust wave"
    assert sum(item["cost"] for item in result["recommended_portfolio"]) <= 3
    assert result["expected_total_risk_reduction"] > 0


def test_cognitive_pressure_map_respects_policy_gate(monkeypatch):
    os.environ["COGWAR_INNOVATION"] = "true"
    monkeypatch.setattr(
        "cogwar.innovation.cognitive_pressure_map.evaluate_request",
        lambda _: PolicyDecision(False, "denied-by-test"),
    )
    try:
        with pytest.raises(PermissionError):
            build_cognitive_pressure_map(_sample_indicators())
    finally:
        del os.environ["COGWAR_INNOVATION"]
