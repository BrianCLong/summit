"""Leverage and simplicity scoring for income engine."""


def asset_leverage_index(automation_share: float, setup_cost: float, monthly_cost: float) -> float:
    """Higher automation with lower recurring cost yields better leverage."""
    denominator = setup_cost + monthly_cost + 1
    score = (automation_share * setup_cost) / denominator
    return round(max(0.0, min(score, 1.0)), 4)


def simplicity_score(required_fields_count: int, manual_hours_per_month: float) -> float:
    """Lower complexity and lower manual effort increase simplicity."""
    complexity_penalty = min(required_fields_count / 20, 1)
    effort_penalty = min(manual_hours_per_month / 40, 1)
    score = 1 - ((complexity_penalty + effort_penalty) / 2)
    return round(max(0.0, min(score, 1.0)), 4)
