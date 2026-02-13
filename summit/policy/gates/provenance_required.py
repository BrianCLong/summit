from typing import Dict, List, Tuple

def check(profile: Dict) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for i, c in enumerate(profile.get("claims", [])):
        if not c.get("source_ref"):
            errs.append(f"claims[{i}].source_ref missing")
    return (len(errs) == 0, errs)
