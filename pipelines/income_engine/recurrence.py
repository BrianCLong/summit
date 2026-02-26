"""Recurring revenue scoring."""

from __future__ import annotations


def recurrence_score(spec: dict) -> float:
    """Score recurring consistency on a normalized 0..1 scale."""
    churn = float(spec["churn_rate"])
    conversion = float(spec["conversion_rate"])
    score = (1 - churn) * conversion
    return round(max(0.0, min(1.0, score)), 4)
