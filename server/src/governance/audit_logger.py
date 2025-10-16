# server/src/governance/audit_logger.py

import datetime


def log_audit_event(who: str, what: str, why: str, when: datetime.datetime, details: dict):
    """
    Stub for logging immutable audit events.
    """
    print(f"AUDIT: Who: {who}, What: {what}, Why: {why}, When: {when}, Details: {details}")
    # In a real system, this would write to an immutable log store.
    pass


def prompt_reason_for_access(user_id: str, resource: str) -> str:
    """
    Stub for prompting user for reason-for-access.
    """
    print(f"Prompting {user_id} for reason to access {resource}")
    # Simulate user input
    return f"User {user_id} provided reason: 'Investigating {resource} for security incident.'"


def detect_misuse_and_poisoning(log_data: list) -> list:
    """
    Stub for detecting misuse and poisoning alerts from audit logs.
    """
    print(f"Detecting misuse and poisoning in log data: {len(log_data)} entries")
    alerts = []
    for entry in log_data:
        if "unusual_activity" in entry.get("details", {}):
            alerts.append(f"Misuse alert: Unusual activity detected for {entry.get('who')}")
        if "data_poisoning_attempt" in entry.get("details", {}):
            alerts.append(f"Poisoning alert: Attempt detected for {entry.get('what')}")
    return alerts
