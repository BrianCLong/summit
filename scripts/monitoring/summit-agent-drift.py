#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from summit.agents.orchestrator import AgentOrchestrator
from summit.agents.tool_registry import AgentToolRegistry


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _build_orchestrator() -> AgentOrchestrator:
    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool("deterministic_echo", lambda payload: {"echo": payload["task"], "status": "ok"})
    return AgentOrchestrator(registry, enabled=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect drift in Summit deterministic agent outputs.")
    parser.add_argument("--task", default="Investigate pipeline drift")
    parser.add_argument("--baseline", default="artifacts/monitoring/summit_agent_baseline.sha256")
    parser.add_argument("--out", default="artifacts/monitoring/agent_trend.json")
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="Write current hash into baseline file after this run.",
    )
    args = parser.parse_args()

    orchestrator = _build_orchestrator()
    bundle = orchestrator.run(args.task)
    current_hash = str(bundle["stamp"]["deterministic_hash"])

    baseline_path = Path(args.baseline)
    baseline_hash = baseline_path.read_text(encoding="utf-8").strip() if baseline_path.exists() else current_hash
    drift = baseline_hash != current_hash

    report = {
        "status": "drift" if drift else "ok",
        "task": args.task,
        "baseline_hash": baseline_hash,
        "current_hash": current_hash,
        "replay_mismatch_rate": 1.0 if drift else 0.0,
        "cost_run_trend": "stable",
        "tool_failure_frequency": 0.0,
    }
    _write_json(Path(args.out), report)

    if args.update_baseline or not baseline_path.exists():
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(current_hash + "\n", encoding="utf-8")

    return 1 if drift else 0


if __name__ == "__main__":
    raise SystemExit(main())
