import json
import uuid
from pathlib import Path
from typing import Any

import yaml

from .actions import ActionRegistry
from .models import RunbookSpec, RunState, StepResult, StepSpec, utcnow_iso
from .proof import emit_proof_bundle
from .storage import Storage


class RunbookEngine:
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.storage = Storage(base_path / "runs")
        self.proofs_dir = base_path / "proofs"
        self.actions = ActionRegistry(base_path)

    def load_spec(self, path: Path) -> RunbookSpec:
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f) if path.suffix in {".yaml", ".yml"} else json.load(f)
        steps = [
            StepSpec(
                id=s["id"],
                description=s.get("description", ""),
                action=s.get("action", "noop"),
                params=s.get("params", {}),
                deps=s.get("deps", []),
            )
            for s in data.get("steps", [])
        ]
        return RunbookSpec(
            id=data.get("id", path.stem),
            name=data.get("name", path.stem),
            description=data.get("description", ""),
            parameters=data.get("parameters", {}),
            preconditions=data.get("preconditions", {}),
            postconditions=data.get("postconditions", {}),
            steps=steps,
        )

    def parameter_diff(self, provided: dict[str, Any], defaults: dict[str, Any]) -> dict[str, Any]:
        diff = {}
        for key, default_value in defaults.items():
            if provided.get(key) != default_value:
                diff[key] = {"provided": provided.get(key), "default": default_value}
        for key, value in provided.items():
            if key not in defaults:
                diff[key] = {"provided": value, "default": None}
        return diff

    def init_state(self, spec: RunbookSpec, params: dict[str, Any]) -> RunState:
        run_id = uuid.uuid4().hex[:10]
        now = utcnow_iso()
        steps = {
            step.id: StepResult(
                id=step.id,
                status="pending",
                started_at=None,
                finished_at=None,
                logs=[],
                output={},
            )
            for step in spec.steps
        }
        return RunState(
            run_id=run_id,
            runbook_id=spec.id,
            started_at=now,
            finished_at=None,
            parameters=params,
            parameter_diff=self.parameter_diff(params, spec.parameters),
            steps=steps,
            context={},
        )

    def run(self, runbook_path: Path, params: dict[str, Any], resume_run_id: str = "") -> RunState:
        spec = self.load_spec(runbook_path)
        if resume_run_id:
            state = self.storage.load_run(resume_run_id)
        else:
            state = self.init_state(spec, {**spec.parameters, **params})
        for step in self._topological_sort(spec.steps):
            step_state = state.steps[step.id]
            if step_state.status == "success":
                continue
            if not all(state.steps[dep].status == "success" for dep in step.deps):
                step_state.logs.append("blocked: waiting for dependencies")
                continue
            self._execute_step(step, state)
            self.storage.save_run(state)
        state.finished_at = state.finished_at or utcnow_iso()
        proof_path, bundle = emit_proof_bundle(state, dataclass_to_dict(spec), self.proofs_dir)
        if not bundle.get("exports_allowed") and bundle.get("ombuds_review_token"):
            state.context["ombuds_review_token"] = bundle["ombuds_review_token"]
        state.proof_path = str(proof_path)
        self.storage.save_run(state)
        return state

    def _execute_step(self, step: StepSpec, state: RunState) -> None:
        step_state = state.steps[step.id]
        step_state.started_at = utcnow_iso()
        try:
            action = self.actions.get(step.action)
            output = action(state.context, step.params)
            step_state.output = output
            step_state.logs.append(f"ran {step.action} with {step.params}")
            state.context.update(output)
            step_state.status = "success"
        except Exception as exc:  # pragma: no cover - we want to record failures
            step_state.status = "failed"
            step_state.logs.append(f"error: {exc}")
        finally:
            step_state.finished_at = utcnow_iso()

    def _topological_sort(self, steps: list[StepSpec]) -> list[StepSpec]:
        resolved: list[str] = []
        ordered: list[StepSpec] = []
        steps_by_id = {s.id: s for s in steps}

        def visit(step_id: str):
            if step_id in resolved:
                return
            step = steps_by_id[step_id]
            for dep in step.deps:
                visit(dep)
            resolved.append(step_id)
            ordered.append(step)

        for step in steps:
            visit(step.id)
        return ordered


def dataclass_to_dict(spec: RunbookSpec) -> dict[str, Any]:
    return {
        "id": spec.id,
        "name": spec.name,
        "description": spec.description,
        "parameters": spec.parameters,
        "preconditions": spec.preconditions,
        "postconditions": spec.postconditions,
        "steps": [
            {
                "id": step.id,
                "description": step.description,
                "action": step.action,
                "params": step.params,
                "deps": step.deps,
            }
            for step in spec.steps
        ],
    }
