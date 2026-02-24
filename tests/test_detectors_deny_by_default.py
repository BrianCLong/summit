import pytest

# Guard the import of torch-dependent module
try:
    from summit.precision.detectors import MismatchReport, compute_mismatch_metrics
except ImportError:
    compute_mismatch_metrics = None
    MismatchReport = None

@pytest.mark.skipif(compute_mismatch_metrics is None, reason="summit.precision.detectors or torch not available")
def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
