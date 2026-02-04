from __future__ import annotations

from typing import Any, Dict, Set


def compute_metrics(submitted: set[str], ground_truth: set[str]) -> dict[str, float]:
    """
    Computes Precision, Recall, and F1 score for set-based answers.
    """
    if not submitted and not ground_truth:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0}

    if not submitted:
        precision = 0.0
        recall = 0.0
    else:
        if not ground_truth:
            precision = 0.0
            recall = 1.0
        else:
            intersection = submitted.intersection(ground_truth)
            precision = len(intersection) / len(submitted)
            recall = len(intersection) / len(ground_truth)

    f1 = 0.0
    if precision + recall > 0:
        f1 = 2 * (precision * recall) / (precision + recall)

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1
    }

def classify_bucket(submitted: set[str], ground_truth: set[str]) -> str:
    """
    Classifies the result into categorical buckets as per the DeepSearchQA paper.
    """
    if submitted == ground_truth:
        return "Fully Correct"

    if not ground_truth:
        # If ground_truth is empty but submitted is not, they are extraneous items.
        return "Correct w/ Extraneous"

    if not submitted:
        return "Fully Incorrect"

    intersection = submitted.intersection(ground_truth)
    if not intersection:
        return "Fully Incorrect"

    # Correct w/ Extraneous: all ground truth items are present, but there are extra items.
    if ground_truth.issubset(submitted):
        return "Correct w/ Extraneous"

    # Partially Correct: some overlap, but some ground truth items are missing.
    return "Partially Correct"
