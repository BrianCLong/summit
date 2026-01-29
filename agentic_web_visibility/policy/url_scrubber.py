import re

SENSITIVE_KEYS = re.compile(r"(token|auth|session|password|email|phone)", re.I)

def scrub_query(query: str) -> str:
    # deny-by-default: if it looks sensitive, drop entirely
    if not query:
        return ""
    if SENSITIVE_KEYS.search(query):
        return ""
    return query[:256]
