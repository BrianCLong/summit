import pytest
from services.pipeline.prioritizer import get_prioritizer

def test_prioritizer_flag_true(monkeypatch, caplog):
    monkeypatch.setenv("FEATURE_PRIORITIZER_GNN", "true")
    import services.pipeline.config_flags
    import importlib
    importlib.reload(services.pipeline.config_flags)

    get_prioritizer()
    assert "result=True reason=env_var_enabled" in caplog.text

def test_prioritizer_flag_false(monkeypatch, caplog):
    monkeypatch.setenv("FEATURE_PRIORITIZER_GNN", "false")
    import services.pipeline.config_flags
    import importlib
    importlib.reload(services.pipeline.config_flags)

    get_prioritizer()
    assert "result=False reason=env_var_disabled_fallback" in caplog.text
