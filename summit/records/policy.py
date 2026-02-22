from .model import Record, Action

def check_access(record: Record, principal: str, action: Action) -> bool:
    # deny-by-default
    allowed = record.permissions.get(principal, [])
    return action in allowed
