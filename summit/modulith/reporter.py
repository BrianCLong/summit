from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from summit.modulith.schemas import ModulithConfig, Violation
from summit.modulith.scanner import ImportEdge


def _stable_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, indent=2) + "\n"


def _input_hash(config_path: Path, edges: list[ImportEdge]) -> str:
    config_bytes = config_path.read_bytes()
    edge_fingerprint = [
        {
            "source_file": e.source_file,
            "source_module": e.source_module,
            "target_import": e.target_import,
            "target_module": e.target_module,
            "line": e.line,
        }
        for e in edges
    ]
    raw = config_bytes + json.dumps(edge_fingerprint, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"sha256:{hashlib.sha256(raw).hexdigest()}"


def write_artifacts(
    out_dir: Path,
    *,
    config: ModulithConfig,
    config_path: Path,
    edges: list[ImportEdge],
    violations: list[Violation],
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "tool": "summit.modulith",
        "status": "fail" if violations else "pass",
        "summary": "Modular boundary verification report",
        "violations": violations,
    }
    metrics = {
        "tool": "summit.modulith",
        "totals": {
            "modules": len(config.modules),
            "imports_scanned": len(edges),
            "violations": len(violations),
        },
    }
    stamp = {
        "tool": "summit.modulith",
        "version": "0.1.0",
        "input_hash": _input_hash(config_path, edges),
        "evidence_id_prefix": "MBV",
    }

    (out_dir / "report.json").write_text(_stable_json(report), encoding="utf-8")
    (out_dir / "metrics.json").write_text(_stable_json(metrics), encoding="utf-8")
    (out_dir / "stamp.json").write_text(_stable_json(stamp), encoding="utf-8")
