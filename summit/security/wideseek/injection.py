import re

INJECTION_INDICATORS = [
    r'(?i)ignore previous instructions',
    r'(?i)system prompt',
    r'(?i)you are an ai',
]

def check_for_injection(content: str) -> bool:
    """
    Checks if content contains potential prompt injection strings.
    Returns True if suspicious.
    """
    if not content:
        return False

    for pattern in INJECTION_INDICATORS:
        if re.search(pattern, content):
            return True
    return False

def sanitize_tool_output(content: str) -> str:
    """
    Sanitizes content to minimize injection risk.
    Currently just quotes it and checks for obvious patterns.
    """
    if check_for_injection(content):
        return "[BLOCKED: Potential Injection Detected]"
    return content
