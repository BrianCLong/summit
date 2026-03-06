from __future__ import annotations

from runtime.spar.types import Task


class GoalPlanner:
    """Deterministic goal-to-task planner with bounded fan-out."""

    def __init__(self, max_tasks: int = 8) -> None:
        self.max_tasks = max_tasks

    def plan(self, goal: str) -> list[Task]:
        normalized = [part.strip() for part in goal.split('->') if part.strip()]
        if not normalized:
            normalized = [goal.strip()]

        tasks: list[Task] = []
        for idx, summary in enumerate(normalized[: self.max_tasks], start=1):
            complexity = max(1, min(10, len(summary.split()) // 2))
            task = Task(
                task_id=f'task-{idx}',
                summary=summary,
                command=f'execute:{summary}',
                complexity=complexity,
                priority=len(normalized) - idx + 1,
            )
            tasks.append(task)

        if len(tasks) == 1:
            base = tasks[0].summary
            tasks = [
                Task('task-1', f'Plan {base}', f'execute:plan {base}', 2, 3),
                Task('task-2', f'Implement {base}', f'execute:implement {base}', 4, 2),
                Task('task-3', f'Validate {base}', f'execute:validate {base}', 3, 1),
            ]
        return tasks
