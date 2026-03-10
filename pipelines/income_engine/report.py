"""Artifact emitter for deterministic Income Engine outputs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

PROHIBITED_CLAIMS = (
    "guaranteed income",
    "risk free",
    "instant riches",
    "passive millions",
)


def _stable_hash(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:12]


def build_evidence_id(spec: dict, report_payload: dict) -> str:
    evidence_date = str(spec.get("evidence_date", "19700101"))
    return f"EVID-INCOME-{evidence_date}-{_stable_hash(report_payload)}"


def enforce_claim_policy(claims: list[str]) -> None:
    for claim in claims:
        lowered = claim.lower()
        if any(term in lowered for term in PROHIBITED_CLAIMS):
            raise ValueError("Claim violates hype policy guardrail.")


def write_artifacts(output_dir: Path, report: dict, metrics: dict, stamp: dict) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for filename, payload in (
        ("report.json", report),
        ("metrics.json", metrics),
        ("stamp.json", stamp),
    ):
        (output_dir / filename).write_text(
            json.dumps(payload, sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )
