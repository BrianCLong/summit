import json
from typing import Dict, Any, List

def run_case(case_path: str) -> Dict[str, Any]:
    """
    Deterministic harness:
    - Loads paraphrases + invariants
    - Calls model adapter (TODO: integrate Summit model interface)
    - Computes invariant violations + contradiction heuristic (stub)
    """
    with open(case_path, "r", encoding="utf-8") as f:
        case = json.load(f)
    paraphrases: List[str] = case["paraphrases"]

    # Stub logic: pass if case_id contains "pass", else fail (contradiction)
    if "pass" in case.get("case_id", "").lower():
        contradiction_rate = 0.0
    else:
        contradiction_rate = 1.0

    return {
        "case_id": case["case_id"],
        "violations": 0, # Stub
        "contradiction_rate": contradiction_rate,
        "n": len(paraphrases)
    }
