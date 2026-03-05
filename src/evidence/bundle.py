from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any


def _dump(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _git_sha() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return result.stdout.strip() or None


def emit_bundle(output_dir: str | Path, evid: str, report: dict[str, Any], provenance: dict[str, Any]) -> dict[str, Any]:
    out = Path(output_dir) / evid
    out.mkdir(parents=True, exist_ok=True)

    metrics = {
        "step_count": len(provenance.get("steps", [])),
        "artifact_count": 4,
        "runtime_units": {"deterministic_step_units": len(provenance.get("steps", []))},
    }
    stamp: dict[str, Any] = {
        "evid": evid,
        "schema_versions": {"workflow": "v1", "tool_schema": "2020-12"},
        "determinism": {"no_timestamps": True, "stable_sorting": True},
    }
    commit_sha = _git_sha()
    if commit_sha:
        stamp["commit_sha"] = commit_sha

    _dump(out / "report.json", report)
    _dump(out / "provenance.json", provenance)
    _dump(out / "metrics.json", metrics)
    _dump(out / "stamp.json", stamp)

    return {
        "report": str(out / "report.json"),
        "provenance": str(out / "provenance.json"),
        "metrics": str(out / "metrics.json"),
        "stamp": str(out / "stamp.json"),
    }
