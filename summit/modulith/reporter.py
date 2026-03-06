from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .schemas import TOOL_NAME, TOOL_VERSION
from .verifier import Violation


def _stable_dump(payload: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _hash_inputs(config_path: Path, scanned_files: list[Path]) -> str:
    digest = hashlib.sha256()
    digest.update(config_path.read_bytes())
    for file_path in sorted(scanned_files):
        digest.update(str(file_path).encode("utf-8"))
        digest.update(file_path.read_bytes())
    return f"sha256:{digest.hexdigest()}"


def write_artifacts(output_dir: Path, config_path: Path, scanned_files: list[Path], violations: list[Violation]) -> None:
    report = {
        "tool": TOOL_NAME,
        "version": TOOL_VERSION,
        "status": "fail" if violations else "pass",
        "violations": [violation.__dict__ for violation in violations],
    }
    metrics = {
        "tool": TOOL_NAME,
        "version": TOOL_VERSION,
        "evidence_id": violations[0].evidence_id if violations else "MBV-IMP-000",
        "files_scanned": len(scanned_files),
        "violations": len(violations),
    }
    stamp = {
        "tool": TOOL_NAME,
        "version": TOOL_VERSION,
        "input_hash": _hash_inputs(config_path, scanned_files),
        "evidence_id_prefix": "MBV",
    }

    _stable_dump(report, output_dir / "report.json")
    _stable_dump(metrics, output_dir / "metrics.json")
    _stable_dump(stamp, output_dir / "stamp.json")
