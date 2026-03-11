import pytest

from cogwar.iw.warning import generate_warning


def _indicator(indicator_id: str, severity: str = "medium", confidence: float = 0.8) -> dict:
    return {
        "id": indicator_id,
        "name": "Example",
        "severity": severity,
        "confidence": confidence,
        "evidence_refs": ["EVD-001"],
    }


def test_warning_id_is_deterministic():
    indicators = [_indicator("IND-1"), _indicator("IND-2", severity="high")]
    first = generate_warning(indicators)
    second = generate_warning(list(reversed(indicators)))
    assert first["warning_id"] == second["warning_id"]


def test_warning_merges_evidence_refs_and_indicator_ids():
    warning = generate_warning([_indicator("IND-1")])
    assert "IND-1" in warning["evidence_refs"]
    assert "EVD-001" in warning["evidence_refs"]


def test_warning_rejects_invalid_confidence():
    with pytest.raises(ValueError, match="confidence"):
        generate_warning([_indicator("IND-1", confidence=1.2)])


def test_warning_rejects_unknown_severity():
    with pytest.raises(ValueError, match="severity"):
        generate_warning([_indicator("IND-1", severity="urgent")])
