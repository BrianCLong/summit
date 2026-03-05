"""Deterministic cost and revenue calculations for income engine."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Projection:
    monthly_customers: float
    monthly_revenue: float
    monthly_cost: float
    monthly_net: float
    annual_net: float


def calculate_projection(spec: dict) -> Projection:
    """Calculate deterministic projection from model spec."""
    monthly_customers = spec["monthly_traffic"] * spec["conversion_rate"]
    retained_customers = monthly_customers * (1 - spec["churn_rate"])
    monthly_revenue = retained_customers * spec["price"]
    monthly_cost = spec["monthly_operating_cost"]
    monthly_net = monthly_revenue - monthly_cost
    annual_net = (monthly_net * 12) - spec["setup_cost"]

    return Projection(
        monthly_customers=round(monthly_customers, 4),
        monthly_revenue=round(monthly_revenue, 2),
        monthly_cost=round(monthly_cost, 2),
        monthly_net=round(monthly_net, 2),
        annual_net=round(annual_net, 2),
    )
