import pytest
try:
    import torch
except ImportError:
    torch = None

from summit.precision.detectors import MismatchReport, compute_mismatch_metrics, ContentDetector

def test_mismatch_report_structure():
    report = MismatchReport(0.5, {"diff": "test"})
    data = report.to_dict()
    assert data["mismatch_score"] == 0.5
    assert data["details"] == {"diff": "test"}

def test_compute_metrics_equality():
    report = compute_mismatch_metrics("abc", "abc")
    assert report.mismatch_score == 0.0

def test_compute_metrics_inequality():
    report = compute_mismatch_metrics("abc", "def")
    assert report.mismatch_score == 1.0

def test_content_detector_import_error():
    if torch is None:
        with pytest.raises(ImportError, match="torch and transformers are required"):
            ContentDetector()
    else:
        # If torch is available, we expect it to instantiate (or fail on model download if no net, but that's a different issue)
        # For this test, we just assume if torch is present, we skip this specific "ImportError" check
        pass
