"""Consent-Scoped Retention Simulator (CSRS).

This package exposes the RetentionPlanner used to model purpose-specific
retention schedules and emit deterministic retention plan diffs.
"""

from .diff import generate_signed_retention_diff
from .planner import ClockShiftScenario, RetentionPlanner

__all__ = [
    "ClockShiftScenario",
    "RetentionPlanner",
    "generate_signed_retention_diff",
]
