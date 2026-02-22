import os
from typing import Any, Dict, List, Optional, Tuple

# Feature flag to enable the backfill planner.
# Defaults to "0" (Disabled).
ENABLE_BACKFILL_PLANNER = os.environ.get("SUMMIT_BACKFILL_PLANNER", "0") == "1"

def generate_backfill_plan(missing_ranges: list[tuple[str, str]]) -> Optional[list[dict[str, Any]]]:
    """
    Generates a backfill plan for the given missing time ranges.

    If the feature is disabled (default), this returns None.

    Args:
        missing_ranges: A list of (start_time, end_time) tuples.

    Returns:
        A list of job definitions to replay data, or None if disabled.
    """
    if not ENABLE_BACKFILL_PLANNER:
        return None

    plan = []
    for start, end in missing_ranges:
        plan.append({
            "action": "replay",
            "start_time": start,
            "end_time": end,
            "priority": "high"
        })
    return plan
