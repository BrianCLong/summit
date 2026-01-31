# summit/policy/gates/gate_no_secret_logs.py
import re

SECRET_PATTERNS = [
    r"apiVersion: v1",
    r"kind: Config",
    r"current-context:",
    r"client-certificate-data:",
    r"client-key-data:",
    r"token:",
]

def verify_no_secrets(content: str) -> list[str]:
    """
    Check for patterns resembling kubeconfigs or tokens in logs.
    """
    violations = []
    for pattern in SECRET_PATTERNS:
        if re.search(pattern, content):
            violations.append(f"detected_secret_pattern:{pattern}")
    return violations
