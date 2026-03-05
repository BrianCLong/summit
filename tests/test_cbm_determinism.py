import pytest
from summit.cbm.pipeline import run_cbm, CBMConfig

def test_cbm_disabled_by_default():
    cfg = CBMConfig()
    assert cfg.enabled is False
    res = run_cbm([], cfg)
    assert res["status"] == "disabled"

def test_cbm_enabled_stamp():
    cfg = CBMConfig(enabled=True)
    res = run_cbm([], cfg)
    assert res["status"] == "ok"
    assert "cbm/stamp.json" in res["artifacts"]
