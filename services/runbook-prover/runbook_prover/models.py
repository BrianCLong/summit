import dataclasses
import datetime as dt
from typing import Any, Dict, List, Optional


@dataclasses.dataclass
class StepSpec:
    id: str
    description: str
    action: str
    params: Dict[str, Any]
    deps: List[str]


@dataclasses.dataclass
class RunbookSpec:
    id: str
    name: str
    description: str
    parameters: Dict[str, Any]
    preconditions: Dict[str, Any]
    postconditions: Dict[str, Any]
    steps: List[StepSpec]


@dataclasses.dataclass
class StepResult:
    id: str
    status: str
    started_at: Optional[str]
    finished_at: Optional[str]
    logs: List[str]
    output: Dict[str, Any]


@dataclasses.dataclass
class RunState:
    run_id: str
    runbook_id: str
    started_at: str
    finished_at: Optional[str]
    parameters: Dict[str, Any]
    parameter_diff: Dict[str, Any]
    steps: Dict[str, StepResult]
    context: Dict[str, Any]
    proof_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
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
    def from_dict(cls, data: Dict[str, Any]) -> "RunState":
        steps = {
            k: StepResult(**v)
            for k, v in data.get("steps", {}).items()
        }
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
    return dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc).isoformat()
