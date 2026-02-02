import os

# Feature flag to enable the circuit breaker.
# Defaults to "0" (Disabled) to ensure no runtime impact until explicitly enabled.
ENABLE_COST_BREAKER = os.environ.get("SUMMIT_COST_BREAKER", "0") == "1"

def check_budget_limit(current_spend: float, budget_limit: float) -> bool:
    """
    Checks if the current spend exceeds the budget limit.

    If the feature is disabled (default), this always returns True (allowed),
    effectively acting as a pass-through.

    Args:
        current_spend: The amount spent so far.
        budget_limit: The maximum allowed budget.

    Returns:
        True if execution should proceed (within budget or disabled).
        False if execution should be halted (over budget and enabled).
    """
    if not ENABLE_COST_BREAKER:
        return True

    return current_spend <= budget_limit
