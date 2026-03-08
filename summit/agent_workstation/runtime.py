from __future__ import annotations

from pathlib import Path
from typing import Any

from summit.agent_workstation.memory import WorkstationMemory
from summit.agent_workstation.orchestrator import MultiAgentOrchestrator
from summit.evidence.write_evidence import write_json


class AgentWorkstation:
    def __init__(self, config: dict[str, Any], feature_flag: bool = False):
        self.enabled = feature_flag
        self.config = config
        memory_path = Path(config.get("memory_path", "artifacts/memory_store.json"))
        self.memory = WorkstationMemory(memory_path)

    def run(
        self,
        *,
        task_id: str,
        task: str,
        channel: str,
        agents: dict[str, Any],
        output_dir: Path,
    ) -> dict[str, Path]:
        if not self.enabled:
            raise RuntimeError("agent_workstation is disabled; set feature flag ON")

        orchestrator = MultiAgentOrchestrator(
            agents,
            deterministic_order=self.config.get("deterministic_order", True),
            concurrency_limit=self.config.get("concurrency_limit", 2),
        )
        results = orchestrator.run(task)
        memory_key = self.memory.remember(
            channel,
            task_id,
            {
                "task": task,
                "results": results,
            },
        )

        report = {
            "task_id": task_id,
            "channel": channel,
            "results": results,
            "memory_key": memory_key,
        }
        metrics = {
            "agent_count": len(results),
            "concurrency_limit": self.config.get("concurrency_limit", 2),
            "deterministic_order": self.config.get("deterministic_order", True),
        }
        stamp = {
            "module": "agent_workstation",
            "deterministic": True,
            "feature_flag": self.enabled,
        }

        output_dir.mkdir(parents=True, exist_ok=True)
        report_path = output_dir / "report.json"
        metrics_path = output_dir / "metrics.json"
        stamp_path = output_dir / "stamp.json"
        write_json(report_path, report)
        write_json(metrics_path, metrics)
        write_json(stamp_path, stamp)
        return {"report": report_path, "metrics": metrics_path, "stamp": stamp_path}
