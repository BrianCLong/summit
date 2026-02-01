from typing import Dict, List, Tuple

def check(profile: Dict) -> Tuple[bool, List[str]]:
    # Simple policy: if trust_tier is verified, must have > 1 claims
    # This is a dummy policy for now.
    errs: List[str] = []
    tier = profile.get("trust_tier")
    if tier == "verified" and len(profile.get("claims", [])) < 2:
         errs.append("Verified profiles must have at least 2 claims")
    return (len(errs) == 0, errs)
