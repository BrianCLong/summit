"""Deterministic cost model for the Income Engine."""

from __future__ import annotations


def monthly_cost(spec: dict) -> float:
    """Return deterministic monthly cost from the spec."""
    return round(float(spec.get("monthly_operating_cost", 0.0)), 2)


def total_cost(spec: dict) -> float:
    """Return deterministic total cost over the projection window."""
    months = int(spec.get("projection_months", 12))
    upfront = float(spec["setup_cost"])
    return round(upfront + (monthly_cost(spec) * months), 2)
