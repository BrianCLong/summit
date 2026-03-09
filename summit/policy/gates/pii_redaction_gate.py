from typing import Dict, List, Tuple

PII_FIELDS = ["email", "phone", "address", "personal_ids"]

def check(profile: Dict) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for field in PII_FIELDS:
        if field in profile:
             errs.append(f"PII field found: {field}")
    return (len(errs) == 0, errs)
