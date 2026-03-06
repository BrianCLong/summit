from __future__ import annotations

import concurrent.futures
import re
from time import sleep

from runtime.spar.types import Task, WorkerResult, now_epoch


class LocalParallelExecutor:
    """Runs bounded parallel workers with deterministic result ordering."""

    def __init__(self, max_workers: int = 8, timeout_per_task_s: int = 300) -> None:
        self.max_workers = max_workers
        self.timeout_per_task_s = timeout_per_task_s

    def execute(self, tasks: list[Task]) -> list[WorkerResult]:
        bounded_workers = min(self.max_workers, max(1, len(tasks)))
        with concurrent.futures.ThreadPoolExecutor(max_workers=bounded_workers) as pool:
            futures = [pool.submit(self._run_task, idx + 1, task) for idx, task in enumerate(tasks)]
            results = [future.result(timeout=self.timeout_per_task_s) for future in futures]
        return sorted(results, key=lambda result: result.task_id)

    @staticmethod
    def _run_task(worker_id: int, task: Task) -> WorkerResult:
        started_at = now_epoch()
        sleep(0.005)
        finished_at = now_epoch()
        output = f'worker-{worker_id} completed {task.summary}'
        return WorkerResult(
            task_id=task.task_id,
            worker_id=worker_id,
            status='completed',
            output=output,
            started_at=started_at,
            finished_at=finished_at,
        )


class TmuxCommandBuilder:
    """Builds sanitized tmux commands without shell interpolation."""

    _safe_pattern = re.compile(r'^[a-zA-Z0-9_:\- ]+$')

    def build(self, task: Task, window_name: str) -> list[str]:
        if not self._safe_pattern.match(task.command):
            raise ValueError(f'Unsafe task command for {task.task_id}')
        return ['tmux', 'new-window', '-n', window_name, task.command]
