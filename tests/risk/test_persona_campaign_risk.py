import pytest
from summit.risk.persona_campaign_risk import (
    calculate_persona_risk,
    calculate_campaign_risk,
    RiskLevel
)

def test_calculate_persona_risk_low():
    signals = [
        {"name": "deception", "weight": 1.0, "value": 10},
        {"name": "spam", "weight": 0.5, "value": 20}
    ] # Total: 10 + 10 = 20

    risk = calculate_persona_risk("p1", signals)

    assert risk.persona_id == "p1"
    assert risk.risk_score == 20.0
    assert risk.risk_level == RiskLevel.LOW
    assert len(risk.factors) == 2

def test_calculate_persona_risk_medium():
    signals = [
        {"name": "deception", "weight": 1.0, "value": 20},
        {"name": "spam", "weight": 0.5, "value": 40}
    ] # Total: 20 + 20 = 40

    risk = calculate_persona_risk("p2", signals)
    assert risk.risk_score == 40.0
    assert risk.risk_level == RiskLevel.MEDIUM

def test_calculate_persona_risk_high():
    signals = [
        {"name": "deception", "weight": 1.0, "value": 50},
        {"name": "spam", "weight": 0.5, "value": 40}
    ] # Total: 50 + 20 = 70

    risk = calculate_persona_risk("p3", signals)
    assert risk.risk_score == 70.0
    assert risk.risk_level == RiskLevel.HIGH

def test_calculate_persona_risk_critical():
    signals = [
        {"name": "deception", "weight": 1.0, "value": 80},
        {"name": "spam", "weight": 0.5, "value": 40}
    ] # Total: 80 + 20 = 100

    risk = calculate_persona_risk("p4", signals)
    assert risk.risk_score == 100.0
    assert risk.risk_level == RiskLevel.CRITICAL

def test_calculate_persona_risk_cap():
    signals = [
        {"name": "deception", "weight": 1.0, "value": 80},
        {"name": "spam", "weight": 2.0, "value": 50}
    ] # Total: 80 + 100 = 180 -> capped at 100

    risk = calculate_persona_risk("p5", signals)
    assert risk.risk_score == 100.0
    assert risk.risk_level == RiskLevel.CRITICAL

def test_calculate_campaign_risk():
    signals = [
        {"name": "amplification", "weight": 1.0, "value": 60},
        {"name": "targeting", "weight": 1.5, "value": 10}
    ] # Total: 60 + 15 = 75

    risk = calculate_campaign_risk("c1", signals)

    assert risk.campaign_id == "c1"
    assert risk.risk_score == 75.0
    assert risk.risk_level == RiskLevel.CRITICAL

def test_calculate_risk_empty_signals():
    risk = calculate_persona_risk("p_empty", [])
    assert risk.risk_score == 0.0
    assert risk.risk_level == RiskLevel.LOW
    assert len(risk.factors) == 0
