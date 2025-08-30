
# non_functional_targets/ingest_compliance.py

from typing import Dict, Any, List

def apply_data_minimization(raw_data: Dict[str, Any], policy: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stub for applying data minimization at ingest.
    """
    print(f"Applying data minimization to raw data with policy: {policy}")
    minimized_data = raw_data.copy()
    if policy.get("redact_pii") and "email" in minimized_data:
        minimized_data["email"] = "[REDACTED_EMAIL]"
    return minimized_data

def apply_policy_labels(data: Dict[str, Any], labels: List[str]) -> Dict[str, Any]:
    """
    Stub for applying policy labels (origin, sensitivity, legal basis, retention, license).
    """
    print(f"Applying policy labels {labels} to data.")
    data["policy_labels"] = labels
    return data
