from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .policy import ComputerUsePolicy
from .schema import load_plan

CANONICAL_GENERATED_AT = "1970-01-01T00:00:00Z"


def _canonical_json(value: dict[str, Any]) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256(value: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical_json(value)).hexdigest()


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


class ComputerUseExecutor:
    """Deterministic simulation runtime for policy-gated computer-use plans."""

    def __init__(self, policy: ComputerUsePolicy):
        self._policy = policy

    def execute(
        self,
        plan: dict[str, Any],
        output_dir: str | Path,
    ) -> dict[str, Any]:
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)

        steps = plan["steps"]
        simulated_steps: list[dict[str, Any]] = []
        action_counts: dict[str, int] = {}

        for idx, step in enumerate(steps):
            self._policy.validate_step(step, sandbox_root=out)
            action = step["action"]
            action_counts[action] = action_counts.get(action, 0) + 1

            step_material = {
                "action": step["action"],
                "args": step.get("args"),
                "id": step["id"],
                "idx": idx,
                "input": step.get("input"),
                "target": step.get("target"),
            }
            simulated_steps.append(
                {
                    "action": action,
                    "id": step["id"],
                    "result": {
                        "fingerprint": hashlib.sha256(
                            _canonical_json(step_material)
                        ).hexdigest()[:16],
                        "status": "simulated",
                    },
                }
            )

        plan_hash = _sha256(plan)
        evidence_id = plan.get("evidence_id") or (
            f"SUMMIT-NOTION-AGENT-{plan_hash[:3].upper()}"
        )

        report = {
            "agent": "computer_use",
            "artifacts": ["report.json", "metrics.json", "stamp.json"],
            "evidence_id": evidence_id,
            "mode": "simulation",
            "plan_name": plan["name"],
            "policy_name": self._policy.name,
            "steps": simulated_steps,
            "summary": "Deterministic computer-use simulation completed.",
        }
        metrics = {
            "evidence_id": evidence_id,
            "metrics": {
                "action_counts": action_counts,
                "simulated_latency_ms": len(steps) * 7,
                "steps_executed": len(steps),
                "steps_total": len(steps),
            },
        }
        report_hash = _sha256(report)
        metrics_hash = _sha256(metrics)
        stamp = {
            "evidence_id": evidence_id,
            "generated_at": CANONICAL_GENERATED_AT,
            "metrics_sha256": metrics_hash,
            "plan_sha256": plan_hash,
            "policy_name": self._policy.name,
            "report_sha256": report_hash,
        }

        _write_json(out / "report.json", report)
        _write_json(out / "metrics.json", metrics)
        _write_json(out / "stamp.json", stamp)

        return {
            "evidence_id": evidence_id,
            "output_dir": str(out),
            "policy_name": self._policy.name,
            "status": "ok",
        }


def run_plan_file(plan_path: str | Path, output_dir: str | Path) -> dict[str, Any]:
    plan = load_plan(plan_path)
    policy = ComputerUsePolicy.from_plan(plan)
    return ComputerUseExecutor(policy).execute(plan=plan, output_dir=output_dir)
