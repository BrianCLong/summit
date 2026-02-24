
import sys
from unittest.mock import MagicMock

# Mock torch before it is imported by the module under test
sys.modules["torch"] = MagicMock()

import pytest

# Skip this test module if torch is not installed
torch = pytest.importorskip("torch")

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics, ContentDetector

def test_mismatch_metrics_shape_smoke():
    r = compute_mismatch_metrics({}, {})
    assert isinstance(r, MismatchReport)
    assert hasattr(r, "violations")
