from __future__ import annotations

from uuid import uuid4

from runtime.spar.allocator import TaskAllocator
from runtime.spar.executor import LocalParallelExecutor
from runtime.spar.monitor import ArtifactMonitor
from runtime.spar.planner import GoalPlanner
from runtime.spar.types import RunRecord, now_epoch


class AgentController:
    """Goal -> plan -> allocate -> execute -> artifact pipeline."""

    def __init__(
        self,
        planner: GoalPlanner | None = None,
        allocator: TaskAllocator | None = None,
        executor: LocalParallelExecutor | None = None,
        monitor: ArtifactMonitor | None = None,
    ) -> None:
        self.planner = planner or GoalPlanner()
        self.allocator = allocator or TaskAllocator()
        self.executor = executor or LocalParallelExecutor()
        self.monitor = monitor or ArtifactMonitor()

    def run_goal(self, goal: str) -> tuple[RunRecord, dict[str, str]]:
        started_at = now_epoch()
        tasks = self.planner.plan(goal)
        allocated = self.allocator.allocate(tasks)
        results = self.executor.execute(allocated)
        finished_at = now_epoch()

        record = RunRecord(
            run_id=f'spar-{uuid4().hex[:12]}',
            goal=goal,
            tasks=allocated,
            results=results,
            started_at=started_at,
            finished_at=finished_at,
        )
        artifacts = self.monitor.write(record)
        return record, artifacts
