from typing import Any, Dict, Set, Optional

class Redactor:
    def __init__(self, allowlist: Optional[Set[str]] = None, denylist: Optional[Set[str]] = None):
        """
        :param allowlist: If provided, only keys in this set are preserved. Others are redacted.
        :param denylist: Keys in this set are always redacted. Defaults to common sensitive keys.
        """
        self.allowlist = allowlist
        self.denylist = denylist or {"password", "api_key", "secret", "token", "ssn", "authorization"}

    def redact(self, data: Any) -> Any:
        if isinstance(data, dict):
            new_data = {}
            for k, v in data.items():
                # Denylist takes precedence
                if self.denylist and k.lower() in self.denylist:
                    new_data[k] = "[REDACTED]"
                    continue

                # If allowlist is active, check it
                if self.allowlist is not None and k not in self.allowlist:
                    new_data[k] = "[REDACTED]"
                    continue

                new_data[k] = self.redact(v)
            return new_data
        elif isinstance(data, list):
            return [self.redact(i) for i in data]
        return data
