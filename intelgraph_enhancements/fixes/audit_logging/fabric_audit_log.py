# fabric_client.py - Expanded Audit Logging


def log_event(event_type: str, entity_id: str, user: str, meta: dict):
    entry = {
        "event": event_type,
        "entity": entity_id,
        "actor": user,
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": meta,
    }
    # Simulate write to immutable ledger or audit log
    print(f"[AUDIT LOG] {entry}")
