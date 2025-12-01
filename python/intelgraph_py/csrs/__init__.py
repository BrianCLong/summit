"""Consent-Scoped Retention Simulator (CSRS).

This package exposes the RetentionPlanner used to model purpose-specific
retention schedules and emit deterministic retention plan diffs.
"""

from .planner import RetentionPlanner, ClockShiftScenario
from .diff import generate_signed_retention_diff

__all__ = [
    "RetentionPlanner",
    "ClockShiftScenario",
    "generate_signed_retention_diff",
]
