import pytest
from graph_shape_guardrail.policy import PolicyEngine


def test_policy_pass():
    engine = PolicyEngine({'skew_threshold': 0.5, 'top1p_threshold': 0.05})
    current = {'skew_deg': 1.1, 'top1p_mass': 0.20}
    baseline = [{'skew_deg': 1.0, 'top1p_mass': 0.18}, {'skew_deg': 1.2, 'top1p_mass': 0.22}]
    # baseline means: skew=1.1, top1p=0.20. deltas: 0, 0.
    passed, msg, data = engine.evaluate(current, baseline)
    assert passed
    assert "Pass" in msg

def test_policy_fail_skew():
    engine = PolicyEngine({'skew_threshold': 0.5, 'top1p_threshold': 0.05})
    current = {'skew_deg': 2.0, 'top1p_mass': 0.20}
    baseline = [{'skew_deg': 1.0, 'top1p_mass': 0.20}]
    # delta skew = 1.0 > 0.5
    passed, msg, data = engine.evaluate(current, baseline)
    assert not passed
    assert "delta_skew" in data
    assert data["delta_skew"] == pytest.approx(1.0)
    assert "Δskew" in msg

def test_policy_fail_top1p():
    engine = PolicyEngine({'skew_threshold': 0.5, 'top1p_threshold': 0.05})
    current = {'skew_deg': 1.0, 'top1p_mass': 0.30}
    baseline = [{'skew_deg': 1.0, 'top1p_mass': 0.20}]
    # delta top1p = 0.10 > 0.05
    passed, msg, data = engine.evaluate(current, baseline)
    assert not passed
    assert "delta_top1p" in data
    assert data["delta_top1p"] == pytest.approx(0.10)
    assert "top1%_mass" in msg

def test_policy_no_baseline():
    engine = PolicyEngine({})
    passed, msg, data = engine.evaluate({'skew': 1}, [])
    assert passed
    assert "No baseline" in msg
