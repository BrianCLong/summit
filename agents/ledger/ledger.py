from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class LedgerEntry:
    kind: str
    value: str
    evidence_id: str


class ExecutionLedger:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.todos: List[Dict[str, Any]] = []
        self.decisions: List[Dict[str, Any]] = []

    def add_todo(self, value: str, evidence_id: str) -> None:
        self.todos.append({"value": value, "evidence_id": evidence_id})

    def add_decision(self, value: str, evidence_id: str) -> None:
        self.decisions.append({"value": value, "evidence_id": evidence_id})

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "todos": list(self.todos),
            "decisions": list(self.decisions),
        }
