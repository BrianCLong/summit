import os

from cogwar.iw.warning import generate_warning


def test_warning_includes_cognitive_pressure_map_when_enabled():
    indicators = [
        {
            "id": "IND-123",
            "name": "Coordinated civic panic",
            "severity": "high",
            "confidence": 0.88,
            "channels": ["social", "messaging"],
        }
    ]

    os.environ["COGWAR_INNOVATION"] = "true"
    os.environ["COGWAR_DEFENSE_BUDGET"] = "3"
    try:
        warning = generate_warning(indicators)
    finally:
        del os.environ["COGWAR_INNOVATION"]
        del os.environ["COGWAR_DEFENSE_BUDGET"]

    assert "cognitive_pressure_map" in warning
    assert warning["cognitive_pressure_map"]["version"] == "CPME-V1"
    assert warning["cognitive_pressure_map"]["budget"] == 3
    assert len(warning["recommended_defensive_actions"]) >= 2
