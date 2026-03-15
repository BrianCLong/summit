import pytest
from summit.risk.persona_campaign_risk import RiskScoringModel, RiskLevel

def test_persona_risk_evaluation():
    signals = {
        "deception_profile": 80.0,
        "cross_platform_spread": 50.0,
        "persona_army_patterns": 90.0,
        "watchlist_hit": 100.0
    }

    risk = RiskScoringModel.evaluate_persona_risk("persona_123", signals)

    assert risk.persona_id == "persona_123"
    assert risk.risk_score > 75.0
    assert risk.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert len(risk.factors) == 4

def test_campaign_risk_evaluation():
    signals = {
        "target_criticality": 10.0,
        "amplification_volume": 20.0,
        "negative_sentiment": 15.0,
        "executive_targeting": 0.0
    }

    risk = RiskScoringModel.evaluate_campaign_risk("camp_456", signals)

    assert risk.campaign_id == "camp_456"
    assert risk.risk_score < 25.0
    assert risk.risk_level == RiskLevel.LOW

def test_risk_level_boundaries():
    assert RiskScoringModel.calculate_risk_level(20.0) == RiskLevel.LOW
    assert RiskScoringModel.calculate_risk_level(40.0) == RiskLevel.MEDIUM
    assert RiskScoringModel.calculate_risk_level(60.0) == RiskLevel.HIGH
    assert RiskScoringModel.calculate_risk_level(90.0) == RiskLevel.CRITICAL
