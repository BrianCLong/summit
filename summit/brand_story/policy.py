from typing import Dict, Any, List

def check_policy(plan: Dict[str, Any]) -> Dict[str, Any]:
    forbidden_patterns = ["accuse", "fraud", "stole"]
    for ep in plan.get("episodes", []):
        text = str(ep)
        for pattern in forbidden_patterns:
            if pattern in text.lower():
                return {"allowed": False, "reason": f"Forbidden pattern found: {pattern}"}
    return {"allowed": True}
