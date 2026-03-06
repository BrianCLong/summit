from __future__ import annotations

from dataclasses import asdict, dataclass
from time import time
from typing import Any


@dataclass(frozen=True)
class Task:
    task_id: str
    summary: str
    command: str
    complexity: int
    priority: int


@dataclass(frozen=True)
class WorkerResult:
    task_id: str
    worker_id: int
    status: str
    output: str
    started_at: float
    finished_at: float

    @property
    def duration_ms(self) -> int:
        return int((self.finished_at - self.started_at) * 1000)


@dataclass(frozen=True)
class RunRecord:
    run_id: str
    goal: str
    tasks: list[Task]
    results: list[WorkerResult]
    started_at: float
    finished_at: float

    @property
    def total_duration_ms(self) -> int:
        return int((self.finished_at - self.started_at) * 1000)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data['total_duration_ms'] = self.total_duration_ms
        return data


def now_epoch() -> float:
    return time()
