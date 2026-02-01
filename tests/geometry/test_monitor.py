import pytest
from summit.geometry.config import GeometryMonitorConfig
from summit.geometry.monitor import GeometryMonitor

def test_monitor_disabled_by_default():
    cfg = GeometryMonitorConfig()
    assert not cfg.enabled
    monitor = GeometryMonitor(cfg)
    assert monitor.observe([], {}) is None

def test_monitor_enabled_returns_event():
    cfg = GeometryMonitorConfig(enabled=True, max_points=10)
    monitor = GeometryMonitor(cfg)

    # Create simple points (dim 1)
    points = [[float(i), 0.0, 0.0] for i in range(20)]

    event = monitor.observe(points, {"episode_id": "test-ep", "step": 1})

    assert event is not None
    assert event.episode_id == "test-ep"
    assert event.step == 1
    # Line dimension ~ 1.0
    # Depending on k1=4, k2=8 defaults in vgt.py
    # and truncation to 10 points.
    # If 10 points on a line, k=8 might be too large for n=10?
    # vgt.py: if n <= k2: return [0.0]
    # k2=8. n=10. 10 > 8. OK.

    # Check valid score
    assert event.complexity_score > 0.0

def test_monitor_no_raw_embeddings():
    cfg = GeometryMonitorConfig(enabled=True)
    monitor = GeometryMonitor(cfg)
    points = [[float(i), 0.0] for i in range(10)]
    event = monitor.observe(points, {})

    # Event should not have 'points' or 'activations'
    assert not hasattr(event, "points")
    assert not hasattr(event, "activations")

    # Check fields are scalar/safe
    assert isinstance(event.complexity_score, float)
    assert isinstance(event.vgt_curve, list)
    assert all(isinstance(x, float) for x in event.vgt_curve)
