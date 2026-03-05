from dataclasses import dataclass
from typing import Any, Dict, Protocol


@dataclass(frozen=True)
class RunRequest:
    engine: str
    mode: str  # "dry_run" | "execute"
    payload: dict[str, Any]

@dataclass(frozen=True)
class RunResult:
    ok: bool
    evidence_path: str
    summary: dict[str, Any]

class Engine(Protocol):
    name: str
    def run(self, req: RunRequest) -> RunResult: ...
