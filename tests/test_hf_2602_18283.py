import pytest

from summit.metrics.hf_2602_18283_metrics import HF2602Metrics


def test_hit_rate():
    predictions = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
    ]
    targets = [2, 6, 10]

    # K=3: target 2 is in [1, 2, 3] (Hit), target 6 is in [4, 5, 6] (Hit), target 10 is not in [7, 8, 9] (Miss)
    # Total targets = 3. Hits = 2. HitRate@3 = 2/3 = 0.6667

    hr = HF2602Metrics.hit_rate(predictions, targets, k=3)
    assert hr == 0.6667

def test_ndcg():
    predictions = [
        [1, 2, 3],
        [4, 5, 6]
    ]
    targets = [2, 4]

    # rank of 2 in [1, 2, 3] is 2. DCG = 1 / log2(2 + 1) = 1 / log2(3) = 0.6309
    # rank of 4 in [4, 5, 6] is 1. DCG = 1 / log2(1 + 1) = 1 / log2(2) = 1.0
    # Total NDCG = (0.6309 + 1.0) / 2 = 0.8155

    ndcg = HF2602Metrics.ndcg(predictions, targets, k=3)
    assert ndcg == 0.8155
