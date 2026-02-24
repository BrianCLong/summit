import pytest
import math

# --- Drift Metrics Implementation (to be moved to src later if needed) ---

def jaccard_at_k(list_a, list_b, k):
    """
    Computes Jaccard similarity between top-k items of two lists.
    Assumes items are hashable (e.g., IDs).
    """
    set_a = set(list_a[:k])
    set_b = set(list_b[:k])

    if not set_a and not set_b:
        return 1.0

    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union

def rank_biased_overlap(list_a, list_b, p=0.9):
    """
    Computes Rank-Biased Overlap (RBO) between two ranked lists.
    p: persistence parameter (0 < p < 1). Higher p weighs lower ranks more.
    """
    if not list_a and not list_b:
        return 1.0

    # Pad shorter list with None to handle unequal lengths if needed,
    # but RBO usually handles it by considering presence.
    # Simplified implementation for equal length or min length.

    k = max(len(list_a), len(list_b))
    if k == 0: return 1.0

    overlap = 0
    rbo_score = 0
    w_sum = 0

    for i in range(k):
        item_a = list_a[i] if i < len(list_a) else None
        item_b = list_b[i] if i < len(list_b) else None

        # This is a simplified RBO for distinct items.
        # Standard RBO counts overlap at depth d.

        # Let's use a set-based approach for overlap at depth d
        set_a_d = set(list_a[:i+1])
        set_b_d = set(list_b[:i+1])

        overlap = len(set_a_d.intersection(set_b_d))
        agreement = overlap / (i + 1)

        weight = math.pow(p, i)
        rbo_score += agreement * weight
        w_sum += weight

    # Normalize by the sum of weights to get 1.0 for identical lists of length k
    return rbo_score / w_sum


# --- Tests ---

def test_jaccard_drift():
    # Scenario: Baseline vs Candidate
    baseline = ["A", "B", "C", "D", "E"]

    # 1. Identity (No drift)
    candidate_1 = ["A", "B", "C", "D", "E"]
    assert jaccard_at_k(baseline, candidate_1, 5) == 1.0

    # 2. Slight reorder (Set content same, Jaccard should be 1.0)
    candidate_2 = ["B", "A", "C", "D", "E"]
    assert jaccard_at_k(baseline, candidate_2, 5) == 1.0

    # 3. One item replaced
    candidate_3 = ["A", "B", "C", "D", "Z"]
    # Intersection: 4 (A,B,C,D). Union: 6 (A,B,C,D,E,Z). 4/6 = 0.66
    assert abs(jaccard_at_k(baseline, candidate_3, 5) - (4/6)) < 0.01

def test_rbo_drift():
    # Scenario: Rank matters
    baseline = ["A", "B", "C", "D", "E"]

    # 1. Identity
    candidate_1 = ["A", "B", "C", "D", "E"]
    assert rank_biased_overlap(baseline, candidate_1) > 0.99

    # 2. Top flip (A<->B)
    candidate_2 = ["B", "A", "C", "D", "E"]
    # RBO should be < 1.0 because order changed
    score = rank_biased_overlap(baseline, candidate_2, p=0.9)
    assert score < 1.0
    assert score > 0.7 # Still high similarity

def test_drift_fixture_simulation():
    """
    Simulates drift between two mocked snapshots.
    """
    # Snapshot A results
    results_a = [
        {"id": "1", "score": 0.95},
        {"id": "2", "score": 0.94},
        {"id": "3", "score": 0.90}
    ]

    # Snapshot B (Ingest occurred, new item "2.5" inserted, "3" pushed down)
    results_b = [
        {"id": "1", "score": 0.95},
        {"id": "2", "score": 0.94},
        {"id": "NEW", "score": 0.92},
        {"id": "3", "score": 0.90}
    ]

    ids_a = [x["id"] for x in results_a]
    ids_b = [x["id"] for x in results_b]

    # Compare top-3
    j_score = jaccard_at_k(ids_a, ids_b, 3)

    # Top 3 A: 1, 2, 3
    # Top 3 B: 1, 2, NEW
    # Inter: 1, 2 (2 items). Union: 1, 2, 3, NEW (4 items). 2/4 = 0.5

    assert j_score == 0.5
