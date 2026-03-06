from __future__ import annotations

from runtime.spar.types import Task


class TaskAllocator:
    """Allocates tasks by complexity and priority for deterministic worker assignment."""

    @staticmethod
    def allocate(tasks: list[Task]) -> list[Task]:
        return sorted(tasks, key=lambda task: (-task.complexity, -task.priority, task.task_id))
