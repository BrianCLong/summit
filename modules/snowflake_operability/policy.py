from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

@dataclass(frozen=True)
class OperabilityResult:
    ok: bool
    violations: List[str]

def evaluate_operability(event_log: List[Dict[str, Any]]) -> OperabilityResult:
    """
    Evaluates a pipeline run log against operability expectations derived from:
    - late-arriving data handling
    - schema drift detection
    - file-format correctness (esp. JSON silent failures)
    - cost budget constraints
    """
    violations: List[str] = []
    # Require explicit markers for each policy area.
    required_markers = ["late_data_policy", "schema_contract", "file_format_checks", "cost_budget"]
    present = {m: False for m in required_markers}

    for e in event_log:
        k = e.get("marker")
        if k in present:
            present[k] = True

        # Specific check logic can be expanded here based on event payloads
        # For now, we enforce that if a marker is present, the associated result must not be failure
        if e.get("status") == "failure":
             violations.append(f"POLICY_FAILURE:{k}:{e.get('details', 'unknown')}")

    for k, v in present.items():
        if not v:
            violations.append(f"MISSING_MARKER:{k}")

    return OperabilityResult(ok=(len(violations) == 0), violations=violations)
