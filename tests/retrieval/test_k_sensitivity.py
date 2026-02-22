import pytest

class MockUnstableRetriever:
    """
    Simulates a vector index that is sensitive to 'k'.
    """
    def __init__(self, unstable=False):
        self.unstable = unstable
        self.data = [
            {"id": "A", "score": 0.9},
            {"id": "B", "score": 0.88},
            {"id": "C", "score": 0.85},
            {"id": "D", "score": 0.80},
        ]

    def search(self, query, k):
        if self.unstable and k > 2:
            # Simulate instability: getting more items makes 'B' drop out or reorder
            # For example, maybe 'C' becomes better than 'B' due to approximate search path
            return [
                {"id": "A", "score": 0.9},
                {"id": "C", "score": 0.85},
                {"id": "B", "score": 0.84}, # Score dropped or re-evaluated
            ][:k]
        return self.data[:k]

def check_k_stability(retriever, query, k_base, k_large):
    """
    Verifies that top-k results from a k-query are consistent
    with top-k results from a (k+N)-query.
    """
    results_base = retriever.search(query, k=k_base)
    results_large = retriever.search(query, k=k_large)

    ids_base = [x["id"] for x in results_base]
    ids_large_top_k = [x["id"] for x in results_large[:k_base]]

    return ids_base == ids_large_top_k

def test_k_sensitivity_stable():
    retriever = MockUnstableRetriever(unstable=False)
    # k=2 vs k=4 should be consistent
    assert check_k_stability(retriever, "query", 2, 4) == True

def test_k_sensitivity_unstable():
    retriever = MockUnstableRetriever(unstable=True)
    # k=2 returns [A, B]
    # k=4 returns [A, C, B] -> top 2 is [A, C]
    # distinct!
    assert check_k_stability(retriever, "query", 2, 3) == False
