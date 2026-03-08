from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Dict

from .critic import CriticAgent
from .executor import ExecutorAgent
from .planner import PlannerAgent

AGENT_VERSION = "0.1.0"
DEFAULT_EVIDENCE_ID = "EVD-SUMMIT-MULTIAGENT-001"


def _canonical(data: Dict[str, object]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def run_task(task: str, out_dir: Path, evidence_id: str = DEFAULT_EVIDENCE_ID) -> Dict[str, str]:
    planner = PlannerAgent(name="planner", version=AGENT_VERSION)
    executor = ExecutorAgent(name="executor", version=AGENT_VERSION)
    critic = CriticAgent(name="critic", version=AGENT_VERSION)

    planning = planner.run(task, {})
    execution = executor.run(task, planning)
    review = critic.run(task, execution)

    report = {
        "evidence_id": evidence_id,
        "item": "Build and Deploy Multi-Agent AI with Python and Docker",
        "summary": "Deterministic multi-agent run completed.",
        "artifacts": ["report.json", "metrics.json", "stamp.json"],
        "pipeline": {
            "planner": planning,
            "executor": execution,
            "critic": review,
        },
    }
    metrics = {
        "evidence_id": evidence_id,
        "metrics": {
            "agent_count": 3,
            "task_length": len(task.strip()),
            "quality": review["quality"],
        },
    }

    deterministic_hash = hashlib.sha256(
        f"{_canonical(report)}|{_canonical(metrics)}".encode("utf-8")
    ).hexdigest()
    stamp = {
        "evidence_id": evidence_id,
        "agent_version": AGENT_VERSION,
        "deterministic_hash": deterministic_hash,
        "created_at": "1970-01-01T00:00:00Z",
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out_dir / "stamp.json").write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return {"deterministic_hash": deterministic_hash, "out_dir": str(out_dir)}
