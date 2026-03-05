import pytest
import os
import json
from summit.cbm.pipeline import CBMConfig, run_cbm

def test_cbm_disabled_by_default():
    cfg = CBMConfig()
    assert cfg.enabled is False
    result = run_cbm([], cfg)
    assert result["status"] == "disabled"

def test_cbm_determinism(tmp_path):
    os.makedirs("artifacts/cbm", exist_ok=True)
    cfg = CBMConfig(enabled=True)
    result = run_cbm([{"id": "doc1", "text": "test"}], cfg)
    assert result["status"] == "ok"
    assert "cbm/stamp.json" in result["artifacts"]
    assert os.path.exists("artifacts/cbm/narratives.json")
    assert os.path.exists("artifacts/cbm/influence_graph.json")
    assert os.path.exists("artifacts/cbm/data_void_risk.json")
