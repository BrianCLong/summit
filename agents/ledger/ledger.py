from __future__ import annotations

from dataclasses import dataclass, field

from agents.ledger.storage import LedgerStorage


@dataclass(frozen=True)
class LedgerEntry:
    task_id: str
    state: str
    evidence_refs: list[str] = field(default_factory=list)


class ExecutionLedger:
    def __init__(self, storage: LedgerStorage) -> None:
        self.storage = storage
        self.entries: list[LedgerEntry] = []

    def append(self, entry: LedgerEntry) -> None:
        self.entries.append(entry)

    def persist(self) -> str:
        payload = {
            "tasks": [
                {
                    "task_id": entry.task_id,
                    "state": entry.state,
                    "evidence_refs": sorted(entry.evidence_refs),
                }
                for entry in sorted(self.entries, key=lambda item: item.task_id)
            ]
        }
        return self.storage.save(payload)
