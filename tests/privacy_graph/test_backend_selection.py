import pytest

from summit.privacy_graph.analytics import run_analytics
from summit.privacy_graph.config import PrivacyGraphConfig
from summit.privacy_graph.types import GraphEvent


def test_runs_plaintext_backend():
    cfg = PrivacyGraphConfig(
        enabled=True,
        require_dp=True,
        dp_epsilon=1.0,
        dp_delta=1e-5,
        backend="plaintext"
    )
    events = [GraphEvent(src="a", dst="b", ts_bucket=1, features={})]
    res = run_analytics(events, cfg)
    assert res["backend_used"] == "plaintext"
    assert res["node_count"] == 2

def test_runs_he_simulated_backend():
    cfg = PrivacyGraphConfig(
        enabled=True,
        require_dp=True,
        dp_epsilon=1.0,
        dp_delta=1e-5,
        backend="he_simulated"
    )
    events = [GraphEvent(src="a", dst="b", ts_bucket=1, features={})]
    res = run_analytics(events, cfg)
    assert res["backend_used"] == "he_simulated"
    assert res["node_count"] == 2

def test_analytics_fails_if_policy_fails():
    cfg = PrivacyGraphConfig(enabled=False)
    events = []
    with pytest.raises(RuntimeError, match="disabled"):
        run_analytics(events, cfg)
