from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from summit.flags import is_feature_enabled

from .tool_registry import AgentToolRegistry
from .transcript import Transcript


def _canonical_json(value: dict[str, Any]) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


class AgentOrchestrator:
    """Feature-flagged deterministic orchestrator scaffold (PR1)."""

    def __init__(
        self,
        tool_registry: AgentToolRegistry,
        budget_tokens: int = 20_000,
        budget_cost_usd: float = 0.10,
        agent_version: str = "v0",
        enabled: bool | None = None,
    ):
        self._tools = tool_registry
        self._budget_tokens = budget_tokens
        self._budget_cost_usd = budget_cost_usd
        self._agent_version = agent_version
        self._enabled = (
            is_feature_enabled("SUMMIT_AGENT_ENABLED", default=False)
            if enabled is None
            else enabled
        )

    def run(self, task: str, out_dir: str | Path | None = None) -> dict[str, Any]:
        if not self._enabled:
            return {"action": "skip", "reason": "feature_flag_disabled"}

        transcript = Transcript(task_slug=task)
        transcript.add_event("task_ingested", {"task": task})

        tool_name = self._tools.select_tool(task)
        transcript.add_event("tool_selected", {"tool": tool_name})

        tool_result = self._tools.execute_tool(tool_name, {"task": task})
        transcript.add_event("tool_executed", {"tool": tool_name, "result": tool_result})

        report = {
            "task": task,
            "selected_tool": tool_name,
            "tool_result": tool_result,
            "transcript": transcript.events,
        }
        metrics = {
            "budget": {
                "max_tokens": self._budget_tokens,
                "max_cost_usd": self._budget_cost_usd,
            },
            "usage": {"tokens": 0, "cost_usd": 0.0},
            "tool_calls": 1,
        }

        hash_input = {
            "report": report,
            "metrics": metrics,
            "evidence_ids": transcript.evidence_ids,
            "agent_version": self._agent_version,
        }
        deterministic_hash = hashlib.sha256(_canonical_json(hash_input)).hexdigest()
        stamp = {
            "agent_version": self._agent_version,
            "evidence_ids": transcript.evidence_ids,
            "deterministic_hash": deterministic_hash,
        }

        bundle = {"report": report, "metrics": metrics, "stamp": stamp}
        if out_dir is not None:
            root = Path(out_dir)
            _write_json(root / "report.json", report)
            _write_json(root / "metrics.json", metrics)
            _write_json(root / "stamp.json", stamp)

        return bundle
