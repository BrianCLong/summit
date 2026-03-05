"""Structured reporting for deterministic route optimization."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


ARTIFACT_DIR = Path("artifacts/route_plan")


def _stable_hash(payload: dict[str, Any]) -> str:
    """Compute a deterministic SHA-256 hash of the payload.

    Args:
        payload: Dictionary to hash.

    Returns:
        Hex digest of the SHA-256 hash.
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def write_artifacts(report: dict[str, Any]) -> dict[str, Any]:
    """Write route optimization report artifacts to disk.

    Generates 'report.json', 'metrics.json', and 'stamp.json' in the
    artifact directory. Ensures directory existence.

    Args:
        report: The route plan report dictionary.

    Returns:
        Dictionary containing paths to the written artifacts.
    """
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    report_path = ARTIFACT_DIR / "report.json"
    metrics_path = ARTIFACT_DIR / "metrics.json"
    stamp_path = ARTIFACT_DIR / "stamp.json"

    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    metrics = {
        "node_count": len(report["stops"]),
        "total_distance_km": report["solution"]["total_distance_km"],
        "constraint_max_distance_km": report["constraints"].get("max_distance_km"),
    }
    metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    stamp = {
        "evidence_id": report["evidence_id"],
        "input_hash": report["input_hash"],
        "report_hash": _stable_hash(report),
        "schema_version": report["schema_version"],
    }
    stamp_path.write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    return {
        "report_path": str(report_path),
        "metrics_path": str(metrics_path),
        "stamp_path": str(stamp_path),
    }
