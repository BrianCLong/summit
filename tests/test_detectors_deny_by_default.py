
import sys
from unittest.mock import MagicMock

# Mock torch before it is imported by the module under test
sys.modules["torch"] = MagicMock()

import pytest
from summit.precision.detectors import MismatchReport, compute_mismatch_metrics

def test_mismatch_report_structure():
    report = MismatchReport(
        total_checks=100,
        mismatches=5,
        mismatch_rate=0.05,
        details={"error": "none"}
    )
    assert report.total_checks == 100
    assert report.mismatches == 5
    assert report.mismatch_rate == 0.05

def test_compute_mismatch_metrics_perfect_match():
    # Test case where all items match
    predictions = [1, 2, 3]
    ground_truth = [1, 2, 3]
    report = compute_mismatch_metrics(predictions, ground_truth)

    assert report.total_checks == 3
    assert report.mismatches == 0
    assert report.mismatch_rate == 0.0

def test_compute_mismatch_metrics_some_mismatch():
    # Test case with mismatches
    predictions = [1, 2, 3, 4]
    ground_truth = [1, 2, 0, 4]  # 3rd item mismatches
    report = compute_mismatch_metrics(predictions, ground_truth)

    assert report.total_checks == 4
    assert report.mismatches == 1
    assert report.mismatch_rate == 0.25

def test_compute_mismatch_metrics_length_mismatch():
    # Test error handling for unequal lengths
    predictions = [1, 2]
    ground_truth = [1, 2, 3]

    with pytest.raises(ValueError):
        compute_mismatch_metrics(predictions, ground_truth)
