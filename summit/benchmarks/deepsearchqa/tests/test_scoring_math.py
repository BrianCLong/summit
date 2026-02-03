import pytest

from summit.benchmarks.deepsearchqa.scoring import compute_metrics


def test_exact_match():
    m = compute_metrics({"a", "b"}, {"a", "b"})
    assert m["precision"] == 1.0
    assert m["recall"] == 1.0
    assert m["f1"] == 1.0

def test_partial_match():
    m = compute_metrics({"a", "b"}, {"a", "c"})
    # Intersection = {"a"} (size 1)
    # Submitted = {"a", "b"} (size 2) -> Precision = 0.5
    # Ground Truth = {"a", "c"} (size 2) -> Recall = 0.5
    assert m["precision"] == 0.5
    assert m["recall"] == 0.5
    assert pytest.approx(m["f1"]) == 0.5

def test_extraneous_hedging():
    # Negative test case for hedging/over-retrieval
    m = compute_metrics({"a", "b", "c", "d"}, {"a", "b"})
    # Intersection = {"a", "b"} (size 2)
    # Submitted = 4 -> Precision = 0.5
    # GT = 2 -> Recall = 1.0
    assert m["precision"] == 0.5
    assert m["recall"] == 1.0
    assert pytest.approx(m["f1"]) == 2/3

def test_under_retrieval():
    # Negative test case for under-retrieval
    m = compute_metrics({"a"}, {"a", "b", "c"})
    # Intersection = {"a"} (size 1)
    # Submitted = 1 -> Precision = 1.0
    # GT = 3 -> Recall = 1/3
    assert m["precision"] == 1.0
    assert pytest.approx(m["recall"]) == 1/3
    assert pytest.approx(m["f1"]) == 0.5

def test_empty_submission():
    m = compute_metrics(set(), {"a", "b"})
    assert m["precision"] == 0.0
    assert m["recall"] == 0.0
    assert m["f1"] == 0.0

def test_empty_ground_truth():
    m = compute_metrics({"a"}, set())
    assert m["precision"] == 0.0
    assert m["recall"] == 1.0
    assert m["f1"] == 0.0

def test_both_empty():
    m = compute_metrics(set(), set())
    assert m["precision"] == 1.0
    assert m["recall"] == 1.0
    assert m["f1"] == 1.0
