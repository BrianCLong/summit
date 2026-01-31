from __future__ import annotations

from typing import Any, Dict, Set

from .scoring import compute_metrics


def compute_stop_diagnostics(submitted: set[str], ground_truth: set[str]) -> dict[str, Any]:
    """
    Computes diagnostic metrics related to stopping criteria:
    - Over-retrieval rate (hedging): Proportion of submitted items that are not in ground truth.
    - Under-retrieval rate: Proportion of ground truth items that were missed.
    - Last-mile gap: The difference between the F1 score and strict success (1 or 0).
    """
    metrics = compute_metrics(submitted, ground_truth)
    f1 = metrics["f1"]

    # Over-retrieval (hedging)
    extraneous = submitted - ground_truth
    over_retrieval_rate = len(extraneous) / len(submitted) if submitted else 0.0

    # Under-retrieval
    missing = ground_truth - submitted
    under_retrieval_rate = len(missing) / len(ground_truth) if ground_truth else 0.0

    is_fully_correct = (submitted == ground_truth and len(ground_truth) > 0)
    strict_success = 1.0 if is_fully_correct else 0.0

    # Last-mile gap: how much F1 overestimates "perfect" success
    last_mile_gap = f1 - strict_success

    return {
        "over_retrieval_rate": over_retrieval_rate,
        "under_retrieval_rate": under_retrieval_rate,
        "last_mile_gap": last_mile_gap,
        "is_fully_correct": is_fully_correct
    }
