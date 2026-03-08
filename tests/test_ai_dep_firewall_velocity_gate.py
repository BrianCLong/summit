import pytest

from agents.ai_supply_chain_firewall.propagation_risk import calculate_propagation_risk


def test_propagation_high_risk():
    result = calculate_propagation_risk("malicious-pkg-001")
    assert result["is_velocity_anomaly"] is True
    assert result["risk_score"] == 0.9

def test_propagation_safe():
    result = calculate_propagation_risk("react")
    assert result["is_velocity_anomaly"] is False
    assert result["risk_score"] == 0.1
