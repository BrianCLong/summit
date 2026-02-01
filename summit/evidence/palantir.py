from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, TypedDict

from summit.evidence.writer import EvidencePaths, default_paths, write_json


class Finding(TypedDict):
    workflow: str
    status: str
    gap_analysis: str


@dataclass
class PalantirEvidenceWriter:
    root_dir: Path
    git_sha: str
    scenario: str

    @property
    def evidence_id(self) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        return f"EVID:palantir:{date_str}:{self.git_sha}:{self.scenario}"

    def write_artifacts(
        self,
        summary: str,
        findings: List[Finding],
        metrics: dict[str, float],
        config: dict[str, Any],
    ) -> EvidencePaths:
        """
        Writes deterministic Palantir competitive analysis evidence.
        """
        paths = default_paths(self.root_dir / "reports" / "palantir")

        # Calculate config hash for stamp
        config_str = json.dumps(config, sort_keys=True)
        config_hash = hashlib.sha256(config_str.encode("utf-8")).hexdigest()

        # 1. Report
        report_data = {
            "evidence_id": self.evidence_id,
            "summary": summary,
            "artifacts": ["metrics.json", "stamp.json"],
            "findings": findings
        }
        write_json(paths.report, report_data)

        # 2. Metrics
        metrics_data = {
            "evidence_id": self.evidence_id,
            "metrics": {
                "runtime_ms": metrics.get("runtime_ms", 0.0),
                "memory_mb": metrics.get("memory_mb", 0.0),
                "cost_usd_est": metrics.get("cost_usd_est", 0.0),
                **{k: v for k, v in metrics.items() if k not in ["runtime_ms", "memory_mb", "cost_usd_est"]}
            }
        }
        write_json(paths.metrics, metrics_data)

        # 3. Stamp (The only place with timestamps)
        stamp_data = {
            "evidence_id": self.evidence_id,
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "git_sha": self.git_sha,
            "config_hash": config_hash
        }
        write_json(paths.stamp, stamp_data)

        return paths
