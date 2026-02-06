import pytest
import sys

try:
    import torch
except ImportError:
    torch = None

# If torch is missing, mock it or skip the import that requires it
if torch is None:
    class MockTorch:
        pass
    sys.modules['torch'] = MockTorch()

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics


@pytest.mark.skipif(torch is None, reason="torch not installed")
def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
