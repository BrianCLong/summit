import json
from pathlib import Path


def verify_no_plaintext_sensitive(payload, sensitive_fields):
    """
    Recursively check if any sensitive fields are present in the payload as keys.
    In a real implementation, this would also check for sensitive values.
    """
    if isinstance(payload, dict):
        for k, v in payload.items():
            if k in sensitive_fields:
                return False, f"Sensitive field '{k}' found in plaintext"
            success, msg = verify_no_plaintext_sensitive(v, sensitive_fields)
            if not success:
                return False, msg
    elif isinstance(payload, list):
        for item in payload:
            success, msg = verify_no_plaintext_sensitive(item, sensitive_fields)
            if not success:
                return False, msg
    return True, "OK"

if __name__ == "__main__":
    # Example standalone usage
    import sys
    policy_path = Path(__file__).parent.parent / "policy" / "sensitive_fields.json"
    with open(policy_path) as f:
        policy = json.load(f)

    sensitive_fields = policy["sensitive_fields"]

    # In a real gate, this would read from stdin or a file
    # For now, we just provide the primitive
    pass
