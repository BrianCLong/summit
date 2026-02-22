from typing import Dict, List, Tuple


def check(profile: dict) -> tuple[bool, list[str]]:
    errs: list[str] = []
    for i, c in enumerate(profile.get("claims", [])):
        if not c.get("source_ref"):
            errs.append(f"claims[{i}].source_ref missing")
    return (len(errs) == 0, errs)
