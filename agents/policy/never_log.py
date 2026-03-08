NEVER_LOG = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "GITHUB_TOKEN"
]

def redact_sensitive_info(text: str) -> str:
    # TODO: implement regex redaction of secrets
    return text
