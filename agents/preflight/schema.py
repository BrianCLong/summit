from __future__ import annotations

import json
from pathlib import Path

from agents.preflight.plan_types import AgentPlan

PLAN_SCHEMA: dict[str, object] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "AgentPlan",
    "type": "object",
    "required": ["goal", "acceptance_criteria"],
    "properties": {
        "goal": {"type": "string", "minLength": 1},
        "constraints": {
            "type": "array",
            "items": {"type": "string"},
            "default": [],
        },
        "acceptance_criteria": {
            "type": "array",
            "items": {"type": "string", "minLength": 1},
            "minItems": 1,
        },
        "risks": {
            "type": "array",
            "items": {"type": "string"},
            "default": [],
        },
    },
    "additionalProperties": False,
}


def write_run_plan_artifact(plan: AgentPlan, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(plan.to_dict(), indent=2, sort_keys=True) + "\n")
    return output_path
