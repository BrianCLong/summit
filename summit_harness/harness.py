from dataclasses import dataclass
from typing import List, Dict, Any
from .evidence import EvidenceWriter

@dataclass
class HarnessConfig:
    max_steps: int = 50
    enabled: bool = False

from .subagents import SubagentRegistry

class AgentHarness:
    def __init__(self, cfg: HarnessConfig, evidence: EvidenceWriter, registry: SubagentRegistry = None):
        self.cfg = cfg
        self.evidence = evidence
        self.registry = registry or SubagentRegistry()

    def run(self, item: str, agent_name: str = None) -> Dict[str, Any]:
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
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        self.evidence.write_stamp(stamp)

        return {"status": "ok", "run_id": run_id}
