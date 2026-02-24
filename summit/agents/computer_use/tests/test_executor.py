from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.agents.computer_use.executor import run_plan_file
from summit.agents.computer_use.policy import PolicyViolation
from summit.agents.computer_use.schema import PlanValidationError


def _write_plan(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def test_deterministic_artifacts_repeatable(tmp_path: Path) -> None:
    plan = {
        "name": "computer_use_demo",
        "policy": {"name": "computer_use_deny_by_default"},
        "steps": [
            {"id": "s1", "action": "open_page", "target": "workspace:inbox"},
            {"id": "s2", "action": "extract_text", "input": "draft status"},
        ],
    }
    plan_path = tmp_path / "plan.yaml"
    _write_plan(plan_path, plan)

    out1 = tmp_path / "out1"
    out2 = tmp_path / "out2"
    run_plan_file(plan_path=plan_path, output_dir=out1)
    run_plan_file(plan_path=plan_path, output_dir=out2)

    assert (out1 / "report.json").read_bytes() == (out2 / "report.json").read_bytes()
    assert (out1 / "metrics.json").read_bytes() == (out2 / "metrics.json").read_bytes()
    assert (out1 / "stamp.json").read_bytes() == (out2 / "stamp.json").read_bytes()

    stamp = json.loads((out1 / "stamp.json").read_text(encoding="utf-8"))
    assert stamp["generated_at"] == "1970-01-01T00:00:00Z"


def test_network_actions_are_blocked(tmp_path: Path) -> None:
    plan = {
        "name": "blocked_network",
        "policy": {"name": "computer_use_deny_by_default"},
        "steps": [
            {"id": "s1", "action": "network_call", "target": "https://example.com"},
        ],
    }
    plan_path = tmp_path / "plan.yaml"
    _write_plan(plan_path, plan)

    with pytest.raises(PolicyViolation, match="network action denied"):
        run_plan_file(plan_path=plan_path, output_dir=tmp_path / "out")


def test_policy_declaration_required(tmp_path: Path) -> None:
    plan = {
        "name": "missing_policy",
        "steps": [{"id": "s1", "action": "open_page", "target": "workspace:inbox"}],
    }
    plan_path = tmp_path / "plan.yaml"
    _write_plan(plan_path, plan)

    with pytest.raises(PlanValidationError, match="policy must be an object"):
        run_plan_file(plan_path=plan_path, output_dir=tmp_path / "out")
