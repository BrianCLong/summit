import pytest
try:
    import torch
except ImportError:
    pytest.skip("torch not installed", allow_module_level=True)

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics


def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
