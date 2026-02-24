#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from summit.agents.orchestrator import AgentOrchestrator
from summit.agents.replay import compute_replay_diff, write_replay_diff
from summit.agents.tool_registry import AgentToolRegistry


def _new_orchestrator() -> AgentOrchestrator:
    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool("deterministic_echo", lambda payload: {"echo": payload["task"], "status": "ok"})
    return AgentOrchestrator(registry, enabled=True)


def _load_bundle(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"Baseline bundle at {path} must be a JSON object.")
    return data


def _write_bundle(path: Path, bundle: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(bundle, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Replay deterministic Summit agent orchestrator and emit diff.")
    parser.add_argument("--task", default="Investigate pipeline drift")
    parser.add_argument("--baseline", default="artifacts/eval/agent_replay_baseline.json")
    parser.add_argument("--out", default="artifacts/eval/replay_diff.json")
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="Persist current bundle to baseline path after replay.",
    )
    args = parser.parse_args(argv)

    baseline_path = Path(args.baseline)
    out_path = Path(args.out)

    orchestrator = _new_orchestrator()
    current = orchestrator.run(args.task)
    baseline_exists = baseline_path.exists()
    baseline = _load_bundle(baseline_path) if baseline_exists else current

    diff = compute_replay_diff(baseline, current)
    write_replay_diff(out_path, diff)

    if args.update_baseline or not baseline_exists:
        _write_bundle(baseline_path, current)

    return 1 if baseline_exists and diff["match"] is False else 0


if __name__ == "__main__":
    raise SystemExit(main())
