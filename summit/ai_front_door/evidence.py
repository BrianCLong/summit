from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .policy_engine import PolicyDecision


@dataclass(frozen=True)
class EvidenceBundle:
    report: dict[str, Any]
    metrics: dict[str, Any]
    stamp: dict[str, Any]

    def write(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        _write_json(out_dir / "report.json", self.report)
        _write_json(out_dir / "metrics.json", self.metrics)
        _write_json(out_dir / "stamp.json", self.stamp)


def build_evidence_bundle(decision: PolicyDecision, request_hash: str) -> EvidenceBundle:
    report = {
        "evidence_id": decision.evidence_id,
        "decision": decision.decision,
        "rule_id": decision.rule_id,
        "request_hash": request_hash,
        "reasons": list(decision.reasons),
    }
    metrics = {
        "evidence_id": decision.evidence_id,
        "allow": 1 if decision.decision == "allow" else 0,
        "deny": 1 if decision.decision == "deny" else 0,
        "redact": 1 if decision.decision == "redact" else 0,
    }
    stamp = {
        "evidence_id": decision.evidence_id,
        "generator": "ai_front_door",
        "deterministic": True,
        "schema_version": "1.0",
    }
    return EvidenceBundle(report=report, metrics=metrics, stamp=stamp)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n", encoding="utf-8")
