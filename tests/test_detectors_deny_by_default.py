import pytest
try:
    import torch
except ImportError:
    torch = None

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics


def test_mismatch_metrics_shape_smoke():
    if torch is None:
        pytest.skip("torch not installed")
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
