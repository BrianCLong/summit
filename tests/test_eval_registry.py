import pytest

from intelgraph.eval.registry import AccuracyMetric, MetricRegistry


def test_registry_register_get():
    reg = MetricRegistry()
    acc = AccuracyMetric()
    reg.register(acc)
    assert reg.get("accuracy") == acc


def test_registry_duplicate():
    reg = MetricRegistry()
    acc = AccuracyMetric()
    reg.register(acc)
    with pytest.raises(ValueError):
        reg.register(acc)


def test_registry_missing():
    reg = MetricRegistry()
    with pytest.raises(ValueError):
        reg.get("missing")
