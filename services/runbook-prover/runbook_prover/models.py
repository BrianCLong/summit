import dataclasses
import datetime as dt
from typing import Any


@dataclasses.dataclass
class StepSpec:
    id: str
    description: str
    action: str
    params: dict[str, Any]
    deps: list[str]


@dataclasses.dataclass
class RunbookSpec:
    id: str
    name: str
    description: str
    parameters: dict[str, Any]
    preconditions: dict[str, Any]
    postconditions: dict[str, Any]
    steps: list[StepSpec]


@dataclasses.dataclass
class StepResult:
    id: str
    status: str
    started_at: str | None
    finished_at: str | None
    logs: list[str]
    output: dict[str, Any]


@dataclasses.dataclass
class RunState:
    run_id: str
    runbook_id: str
    started_at: str
    finished_at: str | None
    parameters: dict[str, Any]
    parameter_diff: dict[str, Any]
    steps: dict[str, StepResult]
    context: dict[str, Any]
    proof_path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "runbook_id": self.runbook_id,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "parameters": self.parameters,
            "parameter_diff": self.parameter_diff,
            "steps": {k: dataclasses.asdict(v) for k, v in self.steps.items()},
            "context": self.context,
            "proof_path": self.proof_path,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RunState":
        steps = {k: StepResult(**v) for k, v in data.get("steps", {}).items()}
        return cls(
            run_id=data["run_id"],
            runbook_id=data["runbook_id"],
            started_at=data["started_at"],
            finished_at=data.get("finished_at"),
            parameters=data.get("parameters", {}),
            parameter_diff=data.get("parameter_diff", {}),
            steps=steps,
            context=data.get("context", {}),
            proof_path=data.get("proof_path"),
        )


def utcnow_iso() -> str:
    return dt.datetime.utcnow().replace(tzinfo=dt.UTC).isoformat()
