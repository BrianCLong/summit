from intelgraph.perf import topk_indices


def test_topk_basic():
    scores = [10.0, 5.0, 20.0, 3.0]
    indices = topk_indices(scores, 2)
    # Expect index 2 (20.0), then index 0 (10.0)
    assert indices == [2, 0]


def test_topk_ties():
    scores = [10.0, 20.0, 10.0, 20.0]
    # Indices: 0(10), 1(20), 2(10), 3(20)
    # Top 2: 1(20), 3(20). 1 < 3 so 1 comes first.
    indices = topk_indices(scores, 2)
    assert indices == [1, 3]

    indices_3 = topk_indices(scores, 3)
    # Should be 1, 3, then 0 (10 > 10? No 10=10. Index 0 < 2).
    # So 1, 3, 0.
    assert indices_3 == [1, 3, 0]


def test_k_zero():
    scores = [1.0, 2.0]
    assert topk_indices(scores, 0) == []


def test_k_negative():
    scores = [1.0, 2.0]
    assert topk_indices(scores, -1) == []


def test_k_large():
    scores = [1.0, 2.0]
    indices = topk_indices(scores, 5)
    # Sorted by score descending: 2.0 (1), 1.0 (0)
    assert indices == [1, 0]


def test_empty():
    assert topk_indices([], 5) == []
