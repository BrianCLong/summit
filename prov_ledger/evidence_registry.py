# prov-ledger/evidence_registry.py

import json
from typing import Any

# In-memory store for evidence (for demonstration purposes)
_EVIDENCE_STORE: dict[str, dict[str, Any]] = {}


def register_evidence(evidence_data: dict[str, Any]) -> str:
    """
    Registers evidence and returns a unique evidence ID.
    Simulates storing evidence in an in-memory dictionary.
    """
    print(f"Registering evidence: {evidence_data}")
    # Generate a unique ID (simplified hash for demo)
    evidence_id = f"evidence-{hash(json.dumps(evidence_data, sort_keys=True))}"
    _EVIDENCE_STORE[evidence_id] = evidence_data
    return evidence_id


def get_evidence(evidence_id: str) -> dict[str, Any]:
    """
    Retrieves evidence by ID from the in-memory store.
    """
    print(f"Retrieving evidence: {evidence_id}")
    return _EVIDENCE_STORE.get(evidence_id, {})


def generate_signed_hash(data: dict[str, Any]) -> str:
    """
    Stub for generating a cryptographically signed hash of data.
    """
    print(f"Generating signed hash for data: {data}")
    return f"signed_hash_{hash(json.dumps(data, sort_keys=True))}"
