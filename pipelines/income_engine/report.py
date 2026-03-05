"""Deterministic JSON artifact emission for income engine."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from .cost_model import Projection


EVIDENCE_PREFIX = "EVID-INCOME"


def build_evidence_id(spec: dict, run_date: str | None = None) -> str:
    """Build deterministic evidence ID by day and stable spec hash."""
    canonical = json.dumps(spec, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:10]
    if run_date is None:
        run_date = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"{EVIDENCE_PREFIX}-{run_date}-{digest}"


def emit_artifacts(
    output_dir: Path,
    spec: dict,
    projection: Projection,
    metrics: dict,
    claims_allowed: bool,
    run_date: str | None = None,
) -> dict[str, Path]:
    """Write deterministic artifacts with sorted keys and fixed structure."""
    output_dir.mkdir(parents=True, exist_ok=True)
    evidence_id = build_evidence_id(spec, run_date=run_date)

    report = {
        "engine": "income_engine",
        "evidence_id": evidence_id,
        "model_type": spec["model_type"],
        "projection": {
            "monthly_customers": projection.monthly_customers,
            "monthly_revenue": projection.monthly_revenue,
            "monthly_cost": projection.monthly_cost,
            "monthly_net": projection.monthly_net,
            "annual_net": projection.annual_net,
        },
        "claims": {
            "status": "allowed" if claims_allowed else "blocked",
            "reason": "evidence_links_present" if claims_allowed else "missing_evidence_links",
        },
        "evidence_links": spec["evidence_links"],
    }

    stamp = {
        "artifact_family": "income_engine",
        "evidence_id": evidence_id,
        "deterministic": True,
        "schema_version": "1.0.0",
    }

    artifacts = {
        "report": output_dir / "report.json",
        "metrics": output_dir / "metrics.json",
        "stamp": output_dir / "stamp.json",
    }

    for key, path in artifacts.items():
        payload = report if key == "report" else metrics if key == "metrics" else stamp
        path.write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n", encoding="utf-8")

    return artifacts
