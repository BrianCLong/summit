import pytest
try:
    import torch
except ImportError:
    torch = None

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics

@pytest.mark.skipif(torch is None, reason="torch not installed")
def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
