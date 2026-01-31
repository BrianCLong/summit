from enum import Enum
from typing import Any, Dict, List


class DataClass(str, Enum):
  PUBLIC = "public"
  INTERNAL = "internal"
  CONFIDENTIAL = "confidential"
  RESTRICTED = "restricted"

NEVER_LOG_FIELDS = {
  "token", "secret", "password", "key", "auth", "credential",
  "api_key", "access_token", "refresh_token", "session_id",
  "pii", "email", "phone", "ssn"
}

def redact_dict(d: dict[str, Any]) -> dict[str, Any]:
  """
  Recursively redact keys that are in NEVER_LOG_FIELDS.
  Returns a new dictionary (shallow copy of levels modified).
  """
  out = {}
  for k, v in d.items():
    if k.lower() in NEVER_LOG_FIELDS:
      out[k] = "[REDACTED]"
    elif isinstance(v, dict):
      out[k] = redact_dict(v)
    elif isinstance(v, list):
      out[k] = [redact_dict(i) if isinstance(i, dict) else (redact_list(i) if isinstance(i, list) else i) for i in v]
    else:
      out[k] = v
  return out

def redact_list(l: list[Any]) -> list[Any]:
  return [redact_dict(i) if isinstance(i, dict) else (redact_list(i) if isinstance(i, list) else i) for i in l]

class PrivacyGuard:
    @staticmethod
    def ensure_safe_for_logging(payload: dict[str, Any]) -> dict[str, Any]:
        """
        Ensures payload does not contain secrets before logging.
        """
        return redact_dict(payload)
