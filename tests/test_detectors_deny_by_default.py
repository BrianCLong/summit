import pytest
try:
    import torch
    from summit.precision.detectors import MismatchReport, compute_mismatch_metrics
except ImportError:
    torch = None

@pytest.mark.skipif(torch is None, reason='torch not installed')
def test_placeholder():
    assert True

