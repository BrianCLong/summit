import os

from services.pipeline.config_flags import is_gnn_prioritizer_enabled
from services.pipeline.prioritizer import get_prioritizer
from services.pipeline.prioritizer.gnn_stub import GNNPrioritizerStub


def test_feature_flag_off_by_default(monkeypatch):
    # Ensure env var is not set
    monkeypatch.delenv("FEATURE_PRIORITIZER_GNN", raising=False)
    assert is_gnn_prioritizer_enabled() is False

def test_gnn_stub_behavior(monkeypatch):
    monkeypatch.setenv("FEATURE_PRIORITIZER_GNN", "true")
    assert is_gnn_prioritizer_enabled() is True

    p = get_prioritizer()
    assert isinstance(p, GNNPrioritizerStub)

    score, dr = p.prioritize({"id": "test_item"})
    assert score == 0.5
    assert dr.model_version == "gnn-stub-v1"
    assert "gnn_stub_active" in dr.top_factors
