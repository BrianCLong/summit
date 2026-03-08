"""Asset leverage and simplicity scoring helpers."""

from __future__ import annotations


def asset_leverage_index(spec: dict) -> float:
    """Estimate leverage as gross monthly revenue over monthly cost burden."""
    monthly_traffic = float(spec["monthly_traffic"])
    conversion = float(spec["conversion_rate"])
    price = float(spec["price"])
    monthly_cost = float(spec.get("monthly_operating_cost", 0.0))

    monthly_revenue = monthly_traffic * conversion * price
    denominator = monthly_cost + 1.0
    index = monthly_revenue / denominator
    return round(index, 4)


def simplicity_score(spec: dict) -> float:
    """Reward smaller parameter sets and lower churn with bounded score."""
    complexity_penalty = 0.05 * max(0, len(spec.keys()) - 6)
    churn_penalty = 0.4 * float(spec["churn_rate"])
    score = 1.0 - complexity_penalty - churn_penalty
    return round(max(0.0, min(1.0, score)), 4)
