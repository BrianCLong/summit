from __future__ import annotations

from pathlib import Path

from summit.evidence.memory_store import MemoryStore


class WorkstationMemory:
    def __init__(self, memory_file: Path) -> None:
        self.store = MemoryStore(memory_file)

    def remember(self, channel: str, task_id: str, data: dict[str, object]) -> str:
        return self.store.put(f"{channel}:{task_id}", data)

    def recall(self, channel: str, task_id: str) -> dict[str, object] | None:
        return self.store.get(f"{channel}:{task_id}")
