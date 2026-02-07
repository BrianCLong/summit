import re

def redact_secrets(text):
    # Redact API keys
    redacted = re.sub(r'sk-[a-zA-Z0-9]{32,}', '[REDACTED_API_KEY]', text)
    # Redact script tags for injection resistance
    redacted = re.sub(r'<script.*?>.*?</script>', '[REDACTED_SCRIPT]', redacted, flags=re.DOTALL | re.IGNORECASE)
    return redacted

def redact_text(text):
    return redact_secrets(text)
