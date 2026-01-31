import pytest

from summit.benchmarks.deepsearchqa.stop_diagnostics import compute_stop_diagnostics


def test_diagnostics_perfect_match():
    d = compute_stop_diagnostics({"a", "b"}, {"a", "b"})
    assert d["over_retrieval_rate"] == 0.0
    assert d["under_retrieval_rate"] == 0.0
    assert d["last_mile_gap"] == 0.0
    assert d["is_fully_correct"] is True

def test_diagnostics_hedging():
    # Submitted 4 items, only 2 are in ground truth.
    d = compute_stop_diagnostics({"a", "b", "c", "d"}, {"a", "b"})
    # Over-retrieval: 2 extraneous / 4 submitted = 0.5
    assert d["over_retrieval_rate"] == 0.5
    assert d["under_retrieval_rate"] == 0.0
    # F1 is approx 0.666, strict success is 0.0
    assert pytest.approx(d["last_mile_gap"]) == 2/3
    assert d["is_fully_correct"] is False

def test_diagnostics_under_retrieval():
    # Submitted 1 item, but 3 were expected.
    d = compute_stop_diagnostics({"a"}, {"a", "b", "c"})
    assert d["over_retrieval_rate"] == 0.0
    # Under-retrieval: 2 missing / 3 ground truth = 0.666
    assert pytest.approx(d["under_retrieval_rate"]) == 2/3
    # F1 for (P=1.0, R=0.333) is 0.5, strict success is 0.0
    assert d["last_mile_gap"] == 0.5
    assert d["is_fully_correct"] is False

def test_diagnostics_empty():
    d = compute_stop_diagnostics(set(), {"a"})
    assert d["over_retrieval_rate"] == 0.0
    assert d["under_retrieval_rate"] == 1.0
    assert d["last_mile_gap"] == 0.0
    assert d["is_fully_correct"] is False
