from typing import Dict, List, Tuple

PII_FIELDS = ["email", "phone", "address", "personal_ids"]

def check(profile: dict) -> tuple[bool, list[str]]:
    errs: list[str] = []
    for field in PII_FIELDS:
        if field in profile:
             errs.append(f"PII field found: {field}")
    return (len(errs) == 0, errs)
