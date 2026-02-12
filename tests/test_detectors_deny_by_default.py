import sys
from unittest.mock import MagicMock

# Mock torch before importing the module under test
sys.modules["torch"] = MagicMock()

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics


def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
