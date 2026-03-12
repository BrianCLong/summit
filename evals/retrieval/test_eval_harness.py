import pytest
from eval_harness import compute_precision, compute_recall, compute_f1, compute_mrr, compute_ndcg

def test_compute_precision():
    retrieved = ["A", "B", "C"]
    relevant = {"A", "C", "D"}
    # A and C are retrieved and relevant. Total retrieved = 3. Precision = 2/3
    assert abs(compute_precision(retrieved, relevant) - (2.0/3.0)) < 1e-6

    # Empty retrieved
    assert compute_precision([], relevant) == 0.0

def test_compute_recall():
    retrieved = ["A", "B", "C"]
    relevant = {"A", "C", "D"}
    # A and C are retrieved and relevant. Total relevant = 3. Recall = 2/3
    assert abs(compute_recall(retrieved, relevant) - (2.0/3.0)) < 1e-6

    # Empty relevant
    assert compute_recall(retrieved, set()) == 1.0

def test_compute_f1():
    precision = 0.5
    recall = 0.4
    # F1 = 2 * 0.5 * 0.4 / (0.5 + 0.4) = 0.4 / 0.9 = 4/9
    assert abs(compute_f1(precision, recall) - (4.0/9.0)) < 1e-6

    # Both zero
    assert compute_f1(0.0, 0.0) == 0.0

def test_compute_mrr():
    retrieved = ["A", "B", "C"]
    relevant = {"B", "D"}
    # B is the first relevant item, at rank 2 (index 1). MRR = 1/2
    assert compute_mrr(retrieved, relevant) == 0.5

    # No relevant items retrieved
    assert compute_mrr(retrieved, {"E"}) == 0.0

def test_compute_ndcg():
    retrieved = ["A", "B", "C"]
    relevant = {"A", "B", "C"}
    # Perfect ranking
    assert compute_ndcg(retrieved, relevant) == 1.0

    # Empty relevant
    assert compute_ndcg(["A"], set()) == 1.0

    # Empty retrieved
    assert compute_ndcg([], {"A"}) == 0.0
