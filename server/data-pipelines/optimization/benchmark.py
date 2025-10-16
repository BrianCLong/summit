"""Benchmark suite that demonstrates optimizer performance gains."""

from __future__ import annotations

import time
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from .pipeline_optimizer import PipelineOptimizer, PipelineTask


@dataclass(frozen=True)
class BenchmarkResult:
    name: str
    baseline_ms: float
    optimized_ms: float

    @property
    def improvement_pct(self) -> float:
        if self.baseline_ms == 0:
            return 0.0
        return ((self.baseline_ms - self.optimized_ms) / self.baseline_ms) * 100


class BenchmarkSuite:
    """Runs synthetic workloads to validate performance characteristics."""

    def __init__(self, tasks: Sequence[PipelineTask], *, workers: int = 4) -> None:
        self.tasks = list(tasks)
        self.workers = workers

    @staticmethod
    def _sequential_runtime(tasks: Sequence[PipelineTask]) -> float:
        optimizer = PipelineOptimizer(tasks, max_workers=1)
        start = time.perf_counter()
        optimizer.execute(shared_state={"baseline": True})
        elapsed_ms = (time.perf_counter() - start) * 1000
        optimizer.shutdown()
        return elapsed_ms

    def run(self) -> BenchmarkResult:
        baseline_ms = self._sequential_runtime(self.tasks)
        optimizer = PipelineOptimizer(self.tasks, max_workers=self.workers)
        optimized_start = time.perf_counter()
        optimizer.execute(shared_state={"benchmark": True})
        optimized_ms = (time.perf_counter() - optimized_start) * 1000
        optimizer.shutdown()
        return BenchmarkResult(
            name="pipeline-optimizer",
            baseline_ms=baseline_ms,
            optimized_ms=optimized_ms,
        )

    @classmethod
    def build_default_suite(cls) -> BenchmarkSuite:
        durations = [0.008, 0.006, 0.005, 0.007, 0.004, 0.009]

        def make_task(name: str, duration: float, dependencies: Iterable[str]) -> PipelineTask:
            def _task(_: object) -> dict[str, float]:
                time.sleep(duration)
                return {"duration": duration}

            return PipelineTask(
                name=name, func=_task, dependencies=list(dependencies), criticality="high"
            )

        tasks = [
            make_task("extract", durations[0], []),
            make_task("transform_a", durations[1], ["extract"]),
            make_task("transform_b", durations[2], ["extract"]),
            make_task("load", durations[3], ["transform_a", "transform_b"]),
            make_task("analytics_a", durations[4], ["transform_a"]),
            make_task("analytics_b", durations[5], ["transform_b"]),
        ]
        return cls(tasks)
