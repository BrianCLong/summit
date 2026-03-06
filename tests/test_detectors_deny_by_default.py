import pytest
from summit.precision.detectors import MismatchReport, compute_mismatch_metrics

try:
    import torch
except ImportError:
    torch = None

@pytest.mark.skipif(torch is None, reason="PyTorch is not installed")
def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
