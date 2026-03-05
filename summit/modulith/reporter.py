from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .scanner import ImportEdge
from .verifier import Violation



def _dump_json(path: Path, payload: dict) -> None:
    path.write_text(f"{json.dumps(payload, sort_keys=True, indent=2)}\n", encoding="utf-8")


def build_input_hash(config_text: str, edges: list[ImportEdge]) -> str:
    serializable = {
        "config": config_text,
        "edges": [
            {
                "source_file": edge.source_file,
                "source_module": edge.source_module,
                "target_module": edge.target_module,
                "import_name": edge.import_name,
                "import_kind": edge.import_kind,
            }
            for edge in edges
        ],
    }
    digest = hashlib.sha256(json.dumps(serializable, sort_keys=True).encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def write_artifacts(
    artifacts_dir: Path,
    violations: list[Violation],
    edges: list[ImportEdge],
    input_hash: str,
    enabled: bool,
) -> None:
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "tool": "summit.modulith",
        "enabled": enabled,
        "status": "fail" if violations else "pass",
        "violations": [
            {
                "evidence_id": item.evidence_id,
                "rule_id": item.rule_id,
                "source_module": item.source_module,
                "target_module": item.target_module,
                "source_file": item.source_file,
                "import_name": item.import_name,
                "message": item.message,
            }
            for item in violations
        ],
    }
    metrics = {
        "total_edges": len(edges),
        "total_violations": len(violations),
        "rule_counts": {
            "MBV-IMP-001": sum(1 for item in violations if item.rule_id == "MBV-IMP-001"),
            "MBV-EVT-001": sum(1 for item in violations if item.rule_id == "MBV-EVT-001"),
        },
    }
    stamp = {
        "tool": "summit.modulith",
        "version": "0.1.0",
        "input_hash": input_hash,
        "evidence_id_prefix": "MBV",
    }

    _dump_json(artifacts_dir / "report.json", report)
    _dump_json(artifacts_dir / "metrics.json", metrics)
    _dump_json(artifacts_dir / "stamp.json", stamp)
