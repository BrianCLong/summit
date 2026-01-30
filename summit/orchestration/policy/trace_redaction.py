import re
from typing import Dict, List

# Basic patterns for redaction
EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
API_KEY_RE = re.compile(r"(?:api[_-]key|secret|token|password)[\s:=]+([a-zA-Z0-9\-_]{16,})", re.IGNORECASE)

class TraceRedactor:
    """Redacts PII and secrets from debate traces."""

    def redact_text(self, text: str) -> str:
        # Redact emails
        text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)

        # Redact API keys / secrets
        def redact_secret(match):
            prefix = match.group(0).split(match.group(1))[0]
            return f"{prefix}[REDACTED_SECRET]"

        text = API_KEY_RE.sub(redact_secret, text)
        return text

    def redact_debate(self, debate: list[dict[str, str]]) -> list[dict[str, str]]:
        redacted = []
        for turn in debate:
            redacted.append({
                "persona": turn["persona"],
                "text": self.redact_text(turn["text"])
            })
        return redacted
