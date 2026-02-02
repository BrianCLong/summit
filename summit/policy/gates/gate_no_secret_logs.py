import re

SECRET_PATTERNS = [
    re.compile(r"---BEGIN [A-Z ]*PRIVATE KEY---"),
    re.compile(r"apiVersion: v1\s+kind: Config"), # Kubeconfig
    re.compile(r"client-certificate-data:"),
    re.compile(r"client-key-data:"),
]

def check_no_secrets_in_logs(content):
    """
    CI gate: Reject if secrets are found in the content (logs/artifacts).
    """
    for pattern in SECRET_PATTERNS:
        if pattern.search(content):
            return False, f"Potential secret leakage detected: {pattern.pattern}"

    return True, "No secrets detected."
