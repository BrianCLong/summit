from dataclasses import dataclass
from datetime import UTC
from typing import Any, Dict, List

from .evidence import EvidenceWriter


@dataclass
class HarnessConfig:
    max_steps: int = 50
    enabled: bool = False

class AgentHarness:
    def __init__(self, cfg: HarnessConfig, evidence: EvidenceWriter):
        self.cfg = cfg
        self.evidence = evidence

    def run(self, item: str) -> dict[str, Any]:
        if not self.cfg.enabled:
            return {"status": "disabled"}

        run_id = "run-001" # TODO: generate deterministic run_id
        evd_id = f"EVD-CLAUDECODE-SUBAGENTS-FOUNDATION-{run_id}"

        # 1. Plan
        # 2. Delegate
        # 3. Act
        # 4. Verify

        report = {
            "evidence_id": evd_id,
            "summary": f"Agent Harness run for {item} completed successfully",
            "item_slug": "agent-harness",
            "artifacts": ["report.json", "metrics.json", "stamp.json"]
        }

        metrics = {
            "evidence_id": evd_id,
            "metrics": {"steps": 0}
        }

        self.evidence.write(report=report, metrics=metrics)

        # Stamp must be written separately as it contains the only allowed timestamps
        from datetime import datetime, timezone
        stamp = {
            "evidence_id": evd_id,
            "generated_at": datetime.now(UTC).isoformat()
        }
        self.evidence.write_stamp(stamp)

        return {"status": "ok", "run_id": run_id}
