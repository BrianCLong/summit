import re

def redact_secrets(text):
    redacted = re.sub(r'sk-[a-zA-Z0-9]{32,}', '[REDACTED_API_KEY]', text)
    return redacted
