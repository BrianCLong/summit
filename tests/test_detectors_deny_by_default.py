import pytest

def test_mismatch_metrics_shape_smoke():
    torch = pytest.importorskip("torch")
    from summit.precision.detectors import MismatchReport, compute_mismatch_metrics

    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
