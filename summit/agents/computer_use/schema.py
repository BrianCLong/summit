from __future__ import annotations

import json
from pathlib import Path
from typing import Any

try:
    import yaml
except Exception:  # pragma: no cover - only used when PyYAML is unavailable
    yaml = None


class PlanValidationError(ValueError):
    """Raised when a computer-use plan file does not satisfy the required schema."""


def _ensure_dict(value: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PlanValidationError(f"{field_name} must be an object")
    return value


def _ensure_str(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PlanValidationError(f"{field_name} must be a non-empty string")
    return value


def _validate_step(raw_step: Any, idx: int) -> dict[str, Any]:
    step = _ensure_dict(raw_step, f"steps[{idx}]")
    step_id = _ensure_str(step.get("id"), f"steps[{idx}].id")
    action = _ensure_str(step.get("action"), f"steps[{idx}].action")

    normalized = {
        "action": action,
        "id": step_id,
    }
    if "input" in step:
        normalized["input"] = step["input"]
    if "target" in step:
        normalized["target"] = step["target"]
    if "args" in step:
        normalized["args"] = step["args"]
    return normalized


def _load_raw_plan(path: Path) -> dict[str, Any]:
    payload = path.read_text(encoding="utf-8")
    if path.suffix.lower() in {".yaml", ".yml"}:
        if yaml is not None:
            data = yaml.safe_load(payload)
        else:
            try:
                # JSON is a subset of YAML and provides a no-dependency fallback.
                data = json.loads(payload)
            except json.JSONDecodeError as exc:
                raise PlanValidationError(
                    "YAML parser unavailable. Install PyYAML or provide JSON-formatted plan content."
                ) from exc
    else:
        data = json.loads(payload)

    if not isinstance(data, dict):
        raise PlanValidationError("plan root must be an object")
    return data


def load_plan(path: str | Path) -> dict[str, Any]:
    plan_path = Path(path)
    if not plan_path.exists():
        raise PlanValidationError(f"plan file not found: {plan_path}")

    raw = _load_raw_plan(plan_path)
    plan_name = _ensure_str(raw.get("name"), "name")

    policy = _ensure_dict(raw.get("policy"), "policy")
    policy_name = _ensure_str(policy.get("name"), "policy.name")
    allow_actions = policy.get("allow_actions")
    if allow_actions is not None:
        if not isinstance(allow_actions, list) or not all(
            isinstance(item, str) and item.strip() for item in allow_actions
        ):
            raise PlanValidationError("policy.allow_actions must be a list of strings")

    steps = raw.get("steps")
    if not isinstance(steps, list) or not steps:
        raise PlanValidationError("steps must be a non-empty array")

    normalized_steps = [_validate_step(step, idx) for idx, step in enumerate(steps)]
    evidence_id = raw.get("evidence_id")
    if evidence_id is not None:
        evidence_id = _ensure_str(evidence_id, "evidence_id")

    return {
        "evidence_id": evidence_id,
        "name": plan_name,
        "policy": {
            "allow_actions": allow_actions,
            "name": policy_name,
        },
        "steps": normalized_steps,
    }
