import pytest

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics


def test_mismatch_metrics_shape_smoke():
    try:
        import torch
    except ImportError:
        pytest.skip("torch is required for this test")

    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
