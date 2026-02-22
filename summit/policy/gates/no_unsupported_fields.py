from typing import Dict, List, Tuple

# Allowed fields from StartupProfile.v1
ALLOWED_FIELDS = {
    "startup_name", "source", "sector_tags", "problem",
    "solution", "mechanism", "claims", "trust_tier", "assumptions"
}

def check(profile: Dict) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    extra_fields = set(profile.keys()) - ALLOWED_FIELDS
    if extra_fields:
        errs.append(f"Unsupported fields found: {extra_fields}")
    return (len(errs) == 0, errs)
