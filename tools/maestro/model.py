from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


DEFAULT_TIMEOUT_SECONDS = 300
MAX_TIMEOUT_SECONDS = 900


@dataclass
class Step:
    name: str
    command: str
    id: Optional[str] = None
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS
    retries: int = 0

    @classmethod
    def from_dict(cls, data: Dict[str, Any], index: int) -> "Step":
        return cls(
            id=data.get("id") or f"step-{index+1}",
            name=data.get("name") or f"step-{index+1}",
            command=data["command"],
            timeout_seconds=int(data.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)),
            retries=int(data.get("retries", 0)),
        )


@dataclass
class JobSpec:
    name: str
    owner: str
    environment: str
    steps: List[Step]
    required_policies: List[str] = field(default_factory=list)
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    @classmethod
    def from_dict(cls, raw: Dict[str, Any]) -> "JobSpec":
        if "steps" not in raw or not isinstance(raw["steps"], list):
            raise ValueError("Job spec must include a 'steps' array")
        steps = [Step.from_dict(step, idx) for idx, step in enumerate(raw["steps"])]
        return cls(
            name=raw["name"],
            owner=raw["owner"],
            environment=raw.get("environment", "dev"),
            steps=steps,
            required_policies=raw.get("required_policies", []),
            inputs=raw.get("inputs", {}),
            outputs=raw.get("outputs", {}),
            metadata=raw.get("metadata", {}),
            trace_id=raw.get("trace_id") or str(uuid.uuid4()),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "owner": self.owner,
            "environment": self.environment,
            "required_policies": self.required_policies,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "metadata": self.metadata,
            "trace_id": self.trace_id,
            "steps": [
                {
                    "id": step.id,
                    "name": step.name,
                    "command": step.command,
                    "timeout_seconds": step.timeout_seconds,
                    "retries": step.retries,
                }
                for step in self.steps
            ],
        }

    def write(self, path: Path) -> None:
        path.write_text(json.dumps(self.to_dict(), indent=2))
