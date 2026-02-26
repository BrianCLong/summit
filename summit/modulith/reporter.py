import json
import os
import time
import hashlib
from datetime import datetime
from typing import List, Dict
from pathlib import Path
from summit.modulith.schemas import ModulithReport, ModulithMetrics, ModulithStamp, Violation

def get_timestamp() -> str:
    """Get a deterministic timestamp if in CI, else current time."""
    if os.environ.get("CI") == "true":
        return "2025-01-01T00:00:00Z"
    return datetime.utcnow().isoformat() + "Z"

def get_config_hash(config_path: str = "config/modules.yaml") -> str:
    """Compute sha256 hash of the configuration file."""
    if not os.path.exists(config_path):
        return "sha256:missing"

    with open(config_path, "rb") as f:
        return "sha256:" + hashlib.sha256(f.read()).hexdigest()

def generate_reports(
    violations: List[Violation],
    metrics: ModulithMetrics,
    output_dir: str = "artifacts/modulith"
):
    """Generate deterministic JSON reports."""
    os.makedirs(output_dir, exist_ok=True)

    timestamp = get_timestamp()
    is_ci = os.environ.get("CI") == "true"
    evidence_id = "MBV-CI-DET" if is_ci else f"MBV-{int(time.time())}"

    # Handle determinism for metrics in CI
    if is_ci:
        metrics.scan_time_seconds = 0.0

    # 1. Report
    report = ModulithReport(
        evidence_id=evidence_id,
        summary=f"Found {len(violations)} modularity violations.",
        details={"violations": violations}
    )

    with open(Path(output_dir) / "report.json", "w") as f:
        json.dump(report.model_dump(), f, indent=2)

    # 2. Metrics
    with open(Path(output_dir) / "metrics.json", "w") as f:
        json.dump(metrics.model_dump(), f, indent=2)

    # 3. Stamp
    stamp = ModulithStamp(
        evidence_id=evidence_id,
        generated_at_utc=timestamp,
        input_hash=get_config_hash()
    )

    with open(Path(output_dir) / "stamp.json", "w") as f:
        json.dump(stamp.model_dump(), f, indent=2)

    print(f"✅ Reports generated in {output_dir}")
