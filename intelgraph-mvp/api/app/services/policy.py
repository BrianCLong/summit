from ..models import Policy


def has_clearance(policy: Policy | dict | None, user_clearances: list[str]) -> bool:
    if policy is None:
        return True
    clearance: list[str]
    if isinstance(policy, Policy):
        clearance = policy.clearance
    else:
        clearance = list(policy.get("clearance", [])) if isinstance(policy, dict) else []
    if not clearance:
        return True
    return any(c in user_clearances for c in clearance)
