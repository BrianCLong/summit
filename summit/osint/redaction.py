import re
import hashlib
from typing import Any, Dict, List, Union

class Redactor:
    """
    Redacts PII from text and objects using regex and hashing.
    """
    EMAIL_REGEX = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    PHONE_REGEX = r"\+?[0-9]{10,15}"
    HANDLE_REGEX = r"@[a-zA-Z0-9_]+"

    def __init__(self, salt: str = "summit_salt"):
        self.salt = salt
        self.redacted_counts = {"email": 0, "phone": 0, "handle": 0}

    def hash_value(self, value: str) -> str:
        """Create a stable hash of the value."""
        return hashlib.sha256(f"{value}{self.salt}".encode()).hexdigest()

    def redact_text(self, text: str) -> str:
        """Redact PII in text strings."""
        def replace_email(match):
            self.redacted_counts["email"] += 1
            return f"[EMAIL:{self.hash_value(match.group(0))[:8]}]"

        def replace_phone(match):
            self.redacted_counts["phone"] += 1
            return f"[PHONE:{self.hash_value(match.group(0))[:8]}]"

        def replace_handle(match):
            self.redacted_counts["handle"] += 1
            return f"[HANDLE:{self.hash_value(match.group(0))[:8]}]"

        text = re.sub(self.EMAIL_REGEX, replace_email, text)
        text = re.sub(self.PHONE_REGEX, replace_phone, text)
        text = re.sub(self.HANDLE_REGEX, replace_handle, text)
        return text

    def clean_obj(self, obj: Any) -> Any:
        """Recursively clean an object (dict, list, str)."""
        if isinstance(obj, str):
            return self.redact_text(obj)
        elif isinstance(obj, list):
            return [self.clean_obj(x) for x in obj]
        elif isinstance(obj, dict):
            return {k: self.clean_obj(v) for k, v in obj.items()}
        return obj

    def get_counts(self) -> Dict[str, int]:
        return self.redacted_counts
