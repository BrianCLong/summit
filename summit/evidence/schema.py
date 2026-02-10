import hashlib
import json
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class EvidenceBundle:
    report: Dict[str, Any]
    metrics: Dict[str, Any]
    stamp: Dict[str, Any]

def generate_evidence_id(task_spec: Dict[str, Any], mode: str, repo_hash: str, budgets: Dict[str, Any]) -> str:
    """
    Generates a deterministic Evidence ID.
    Format: EVID-C15-<sha256_12>
    """
    # Deterministic serialization
    payload = json.dumps({
        "task": task_spec,
        "mode": mode,
        "repo": repo_hash,
        "budgets": budgets
    }, sort_keys=True).encode("utf-8")

    digest = hashlib.sha256(payload).hexdigest()[:12]
    return f"EVID-C15-{digest}"
