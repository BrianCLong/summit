import hashlib
import json
from typing import Any, Dict, List

from .schema import DocumentEvent


def _hash_string(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:12]

def extract_and_cluster(events: list[DocumentEvent], run_date: str = "20240101") -> dict[str, Any]:
    """
    Given a list of document events, extracts claims and clusters them into narratives.
    Returns deterministic narratives list sorted by ID.
    """
    narratives = []

    if events:
        combined_text = " ".join([e.content for e in events])
        run_hash = _hash_string(combined_text)
        narrative_id = f"NARR-{run_hash}"

        narratives.append({
            "id": narrative_id,
            "label": "Synthetic Cluster 1",
            "claims": ["extracted claim 1", "extracted claim 2"],
            "source_ids": sorted([e.id for e in events])
        })
    else:
        run_hash = _hash_string("empty")

    narratives.sort(key=lambda x: x["id"])

    # Evidence ID pattern: EVID-CBM-<YYYYMMDD>-<RUNHASH>-<SEQ>
    evidence_id = f"EVID-CBM-{run_date}-{run_hash}-0001"

    return {
        "metadata": {
            "cluster_count": len(narratives),
            "evidence_id": evidence_id
        },
        "narratives": narratives
    }

def write_narratives_artifact(narratives_data: dict[str, Any], output_path: str):
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(narratives_data, f, indent=2, sort_keys=True)
