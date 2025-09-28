import re
from typing import Dict, Any, List

MASK = "[REDACTED]"
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?:(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4})")
TOKEN = re.compile(r"(?:secret|token|apikey|bearer)[=:]\s*[A-Za-z0-9._\-]{10,}", re.I)
SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
IP4 = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

def mask(s: str) -> str:
    for rx in (EMAIL, PHONE, TOKEN, SSN, IP4):
        s = rx.sub(MASK, s)
    return s

def scrub_obj(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: scrub_obj(v) for k,v in obj.items()}
    if isinstance(obj, list):
        return [scrub_obj(v) for v in obj]
    if isinstance(obj, str):
        return mask(obj)
    return obj