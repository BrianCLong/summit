"""Recurring income scoring functions."""


def recurrence_score(churn_rate: float, conversion_rate: float) -> float:
    """Score consistency using retention and conversion, bounded [0,1]."""
    score = (1 - churn_rate) * min(conversion_rate * 10, 1)
    return round(max(0.0, min(score, 1.0)), 4)
