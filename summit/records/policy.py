from .model import Action, Record


def check_access(record: Record, principal: str, action: Action) -> bool:
    # deny-by-default
    allowed = record.permissions.get(principal, [])
    return action in allowed
