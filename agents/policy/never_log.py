import re

NEVER_LOG_PATTERNS = (
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?i)api[_-]?key\s*[:=]"),
    re.compile(r"-----BEGIN (?:RSA )?PRIVATE KEY-----"),
)


class RedactionViolation(ValueError):
    pass


def assert_redacted(text: str) -> None:
    for pattern in NEVER_LOG_PATTERNS:
        if pattern.search(text):
            raise RedactionViolation("never-log policy violated")
