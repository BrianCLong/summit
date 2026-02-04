from dataclasses import dataclass
from typing import Dict, Any, Protocol

@dataclass(frozen=True)
class RunRequest:
    engine: str
    mode: str  # "dry_run" | "execute"
    payload: Dict[str, Any]

@dataclass(frozen=True)
class RunResult:
    ok: bool
    evidence_path: str
    summary: Dict[str, Any]

class Engine(Protocol):
    name: str
    def run(self, req: RunRequest) -> RunResult: ...
