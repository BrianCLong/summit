from datetime import datetime, timezone
import json
import os
from typing import Dict, Any, List

from .timestamps import get_current_utc_timestamp

def generate_compliance_report(
    evidence_id: str,
    metrics: Dict[str, Any],
    violations: List[str]
) -> Dict[str, Any]:
    """
    Generates a compliance report dictionary.
    """
    return {
        "evidence_id": evidence_id,
        "timestamp": get_current_utc_timestamp().isoformat(),
        "metrics": metrics,
        "violations": violations,
        "status": "fail" if violations else "pass"
    }

def write_compliance_evidence(
    filepath: str,
    report: Dict[str, Any]
) -> None:
    """
    Writes the compliance report to a JSON file.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(report, f, indent=2)
