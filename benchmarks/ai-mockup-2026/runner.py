#!/usr/bin/env python3
"""Deterministic AI mockup benchmark harness."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent
DEFAULT_REPORTS = ROOT.parent.parent / "reports" / "ai-mockup-2026"
TASKS_PATH = ROOT / "tasks.yaml"
TOOLS_PATH = ROOT / "tools.yaml"
CLAIMS_PATH = ROOT / "fixtures" / "ground_truth_claims.json"
FIXTURE_HASH_PATH = ROOT / "fixtures" / "determinism.sha256"


class BenchmarkError(RuntimeError):
    pass


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise BenchmarkError(f"Expected mapping in {path}")
    return data


def deterministic_score(tool_id: str, task_id: str) -> float:
    digest = hashlib.sha256(f"{tool_id}:{task_id}".encode("utf-8")).hexdigest()
    raw = int(digest[:8], 16) % 401
    return round(0.6 + raw / 1000, 3)


def deterministic_latency_ms(tool_id: str, task_id: str) -> int:
    digest = hashlib.sha256(f"latency:{tool_id}:{task_id}".encode("utf-8")).hexdigest()
    return 200 + (int(digest[:8], 16) % 2400)


def sort_json(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: sort_json(data[k]) for k in sorted(data)}
    if isinstance(data, list):
        return [sort_json(item) for item in data]
    return data


def stable_hash(report: dict[str, Any], metrics: dict[str, Any]) -> str:
    payload = json.dumps({"report": report, "metrics": metrics}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def ensure_traceability(tools: list[dict[str, Any]], claims: dict[str, str]) -> None:
    for tool in tools:
        evidence = tool.get("evidence")
        if not isinstance(evidence, str) or not evidence.startswith("ITEM:CLAIM-"):
            raise BenchmarkError(f"Tool {tool.get('id')} missing valid evidence ID")
        if evidence not in claims:
            raise BenchmarkError(f"Tool {tool.get('id')} evidence {evidence} not in Ground Truth Capture")


def run(output_dir: Path, check: bool, update_fixture: bool) -> str:
    tasks = load_yaml(TASKS_PATH).get("tasks", [])
    tools = load_yaml(TOOLS_PATH).get("tools", [])
    claims = json.loads(CLAIMS_PATH.read_text(encoding="utf-8"))

    if not isinstance(tasks, list) or not isinstance(tools, list):
        raise BenchmarkError("tasks/tools yaml must contain lists")

    tasks = sorted(tasks, key=lambda x: x["id"])
    tools = sorted(tools, key=lambda x: x["id"])

    ensure_traceability(tools, claims)

    evaluations: list[dict[str, Any]] = []
    latencies: list[int] = []
    for tool in tools:
        for task in tasks:
            score = deterministic_score(tool["id"], task["id"])
            latency_ms = deterministic_latency_ms(tool["id"], task["id"])
            latencies.append(latency_ms)
            evaluations.append(
                {
                    "evidence": tool["evidence"],
                    "score": score,
                    "task_id": task["id"],
                    "tool_id": tool["id"],
                }
            )

    report = {
        "benchmark_id": "ai-mockup-2026",
        "claims_covered": sorted({tool["evidence"] for tool in tools}),
        "evaluation_count": len(evaluations),
        "evaluations": sorted(evaluations, key=lambda r: (r["tool_id"], r["task_id"])),
        "tools": [
            {
                "capabilities": tool["capabilities"],
                "evidence": tool["evidence"],
                "id": tool["id"],
                "name": tool["name"],
            }
            for tool in tools
        ],
    }

    total_runtime_ms = sum(latencies) // 25
    metrics = {
        "benchmark_id": "ai-mockup-2026",
        "coverage": {
            "claims_total": len(claims),
            "claims_traced": len({tool["evidence"] for tool in tools}),
            "tasks": len(tasks),
            "tools": len(tools),
        },
        "performance": {
            "estimated_runtime_ms": total_runtime_ms,
            "max_latency_ms": max(latencies),
            "mean_latency_ms": round(sum(latencies) / len(latencies), 2),
            "memory_budget_mb": 256,
            "runtime_budget_s": 10,
        },
    }

    report = sort_json(report)
    metrics = sort_json(metrics)
    det_hash = stable_hash(report, metrics)

    if check:
        if not FIXTURE_HASH_PATH.exists():
            raise BenchmarkError("Missing determinism fixture hash")
        expected = FIXTURE_HASH_PATH.read_text(encoding="utf-8").strip()
        if det_hash != expected:
            raise BenchmarkError(
                "Determinism hash changed without fixture update. "
                f"expected={expected} actual={det_hash}"
            )

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "report.json").write_text(f"{json.dumps(report, indent=2, sort_keys=True)}\n", encoding="utf-8")
    (output_dir / "metrics.json").write_text(f"{json.dumps(metrics, indent=2, sort_keys=True)}\n", encoding="utf-8")

    stamp = {
        "benchmark_id": "ai-mockup-2026",
        "determinism_hash": det_hash,
        "generated_at": int(time.time()),
    }
    (output_dir / "stamp.json").write_text(f"{json.dumps(stamp, indent=2, sort_keys=True)}\n", encoding="utf-8")

    if update_fixture or not FIXTURE_HASH_PATH.exists():
        FIXTURE_HASH_PATH.write_text(f"{det_hash}\n", encoding="utf-8")

    return det_hash


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic ai-mockup-2026 benchmark")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--check", action="store_true", help="Fail on determinism hash drift")
    parser.add_argument("--update-fixture", action="store_true", help="Rebaseline deterministic hash fixture")
    args = parser.parse_args()

    try:
        det_hash = run(output_dir=args.output_dir, check=args.check, update_fixture=args.update_fixture)
        print(f"ai-mockup-2026 determinism hash: {det_hash}")
    except BenchmarkError as error:
        print(f"ERROR: {error}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
