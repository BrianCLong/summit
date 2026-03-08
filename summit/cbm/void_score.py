import hashlib
import json
from typing import Any, Dict, List

from .schema import DocumentEvent


def _hash_string(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:12]

def score_data_voids(events: list[DocumentEvent], topic: str, locale: str, run_date: str = "20240101") -> dict[str, Any]:
    """
    Given document events, score topic-locale authority density.
    A low density means high data void risk (few authoritative sources).
    Returns deterministic void scores.
    """
    scores = {}
    total_docs = len(events)

    auth_sources = [e for e in events if e.metadata.get("is_authoritative", False)]
    auth_density = len(auth_sources) / max(1, total_docs)
    void_risk = 1.0 - auth_density

    scores["topic"] = topic
    scores["locale"] = locale
    scores["authority_density"] = auth_density
    scores["void_risk_score"] = void_risk

    run_hash = _hash_string(f"{topic}_{locale}_{void_risk}")
    evidence_id = f"EVID-CBM-{run_date}-{run_hash}-0003"

    return {
        "metadata": {
            "evidence_id": evidence_id
        },
        "scores": scores
    }

def write_void_score_artifact(score_data: dict[str, Any], output_path: str):
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(score_data, f, indent=2, sort_keys=True)
