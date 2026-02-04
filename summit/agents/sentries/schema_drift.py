# summit/agents/sentries/schema_drift.py

def check_drift(current_schema, expected_schema):
    """
    Checks for schema drift.
    """
    # Simple set comparison for keys
    current_keys = set(current_schema.keys())
    expected_keys = set(expected_schema.keys())

    missing = expected_keys - current_keys
    extra = current_keys - expected_keys

    has_drift = bool(missing or extra)

    return {
        "has_drift": has_drift,
        "missing_keys": list(missing),
        "extra_keys": list(extra)
    }
