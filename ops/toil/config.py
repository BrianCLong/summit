from __future__ import annotations

"""
Configuration defaults for toil governance and alert rationalization tooling.
These values are treated as policy gates and should remain aligned with the
operating plan in ops/toil_reduction_operating_plan.md.
"""

from datetime import timedelta

TOIL_BUDGET_HOURS_PER_PERSON = 5
TOIL_DIARY_PERIOD_DAYS = 14
FALSE_POSITIVE_MAX_RATE = 0.05
ALERT_FREEZE_ONE_IN_ONE_OUT = True
SUPPRESSION_MAX_DURATION = timedelta(days=7)
EXCEPTION_REMINDER_LEAD_DAYS = 7
DEFAULT_AUTO_REMEDIATION_DRY_RUN = True
ROLLBACK_REQUIRED_TIERS = {"tier0", "tier1"}
RELEASE_CANARY_REQUIRED = True
RELEASE_VERIFICATION_REQUIRED = True
ALERT_METADATA_REQUIRED = {"owner", "runbook", "severity", "service", "taxonomy"}
ALERT_PAGE_SEVERITIES = {"page", "p1", "p0"}


class PolicyViolation(Exception):
    """Raised when an operation violates a governance policy."""
