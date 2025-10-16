"""Advanced pipeline optimizer with concurrency, batching, and resilience."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable, Iterable, MutableMapping, Sequence
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass, field
from typing import (
    Any,
)

from .batching import AdaptiveBatcher, BatchPlan
from .monitoring import PipelineMonitor
from .queue import PriorityJobQueue, QueuedJob
from .resilience import CircuitBreaker, RetryError, retry_with_backoff


@dataclass(frozen=True)
class RetryPolicy:
    retries: int = 3
    base_delay: float = 0.2
    max_delay: float = 2.0
    jitter: float = 0.05


@dataclass
class PipelineTask:
    name: str
    func: Callable[[PipelineExecutionContext], Any]
    dependencies: Sequence[str] = field(default_factory=list)
    criticality: str = "medium"
    metadata: MutableMapping[str, Any] = field(default_factory=dict)
    retry_policy: RetryPolicy | None = None
    circuit_breaker: CircuitBreaker | None = None


@dataclass(frozen=True)
class TaskResult:
    name: str
    status: str
    latency_ms: float
    attempts: int
    output: Any = None
    error: str | None = None


@dataclass(frozen=True)
class PipelineAnalysis:
    stages: list[list[str]]
    max_parallelism: int
    critical_path_length: int
    critical_tasks: list[str]


class PipelineExecutionContext:
    """Context object shared across tasks."""

    def __init__(
        self,
        *,
        batcher: AdaptiveBatcher,
        monitor: PipelineMonitor,
        shared_state: MutableMapping[str, Any] | None = None,
    ) -> None:
        self.batcher = batcher
        self.monitor = monitor
        self.shared_state: MutableMapping[str, Any]
        if shared_state is None:
            self.shared_state = {}
        else:
            self.shared_state = shared_state
        self._lock = threading.Lock()

    def plan_batch(self, pending_records: int) -> BatchPlan:
        plan = self.batcher.suggest_batch_plan(pending_records)
        with self._lock:
            plans: list[BatchPlan] = self.shared_state.setdefault("batch_plans", [])  # type: ignore[assignment]
            plans.append(plan)
        return plan

    def record_batch(self, size: int, latency_ms: float) -> None:
        self.batcher.record_batch_outcome(size, latency_ms)

    def record_custom_metric(self, name: str, value: Any) -> None:
        with self._lock:
            metrics = self.shared_state.setdefault("custom_metrics", {})
            metrics[name] = value


class PipelineOptimizer:
    def __init__(
        self,
        tasks: Iterable[PipelineTask],
        *,
        max_workers: int = 4,
        batcher: AdaptiveBatcher | None = None,
        monitor: PipelineMonitor | None = None,
        continue_on_failure: bool = False,
    ) -> None:
        self._tasks: dict[str, PipelineTask] = {task.name: task for task in tasks}
        if not self._tasks:
            raise ValueError("At least one task is required")
        self._max_workers = max(1, max_workers)
        self._batcher = batcher or AdaptiveBatcher()
        self._monitor = monitor or PipelineMonitor()
        self._continue_on_failure = continue_on_failure
        self._lock = threading.Lock()

    def analyze(self) -> PipelineAnalysis:
        in_degree: dict[str, int] = {name: 0 for name in self._tasks}
        adjacency: dict[str, list[str]] = defaultdict(list)
        for task in self._tasks.values():
            for dep in task.dependencies:
                if dep not in self._tasks:
                    raise ValueError(f"Unknown dependency '{dep}' referenced by task '{task.name}'")
                in_degree[task.name] += 1
                adjacency[dep].append(task.name)
        layers: list[list[str]] = []
        queue: deque[str] = deque([name for name, degree in in_degree.items() if degree == 0])
        while queue:
            level_size = len(queue)
            layer: list[str] = []
            for _ in range(level_size):
                node = queue.popleft()
                layer.append(node)
                for neighbor in adjacency.get(node, []):
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)
            layers.append(layer)
        if sum(len(layer) for layer in layers) != len(self._tasks):
            raise ValueError("Cycle detected in pipeline definition")
        max_parallelism = max((len(layer) for layer in layers), default=1)
        critical_path_length = len(layers)
        critical_tasks = [
            task.name
            for task in sorted(
                self._tasks.values(),
                key=lambda t: (
                    _CRITICALITY_RANK.get(t.criticality.lower(), 3),
                    -len(t.dependencies),
                ),
            )
        ][:max_parallelism]
        return PipelineAnalysis(
            stages=layers,
            max_parallelism=max_parallelism,
            critical_path_length=critical_path_length,
            critical_tasks=critical_tasks,
        )

    def execute(
        self, *, shared_state: MutableMapping[str, Any] | None = None
    ) -> dict[str, TaskResult]:
        """Execute the pipeline and return structured task results."""

        self.analyze()  # Validate topology before executing
        dependency_map = self._dependency_counts()
        in_degree: dict[str, int] = {name: len(deps) for name, deps in dependency_map.items()}
        ready_queue = PriorityJobQueue()
        for name, deps in dependency_map.items():
            if not deps:
                ready_queue.enqueue(
                    QueuedJob(
                        name=name,
                        criticality=self._tasks[name].criticality,
                        payload=self._tasks[name],
                    )
                )
        context = PipelineExecutionContext(
            batcher=self._batcher,
            monitor=self._monitor,
            shared_state=shared_state,
        )
        results: dict[str, TaskResult] = {}
        dependents = self._reverse_dependencies()
        with ThreadPoolExecutor(max_workers=self._max_workers) as executor:
            running: dict[Future[TaskResult], PipelineTask] = {}

            def schedule_ready() -> None:
                while ready_queue and len(running) < self._max_workers:
                    job = ready_queue.dequeue()
                    task = job.payload
                    future = executor.submit(self._execute_task, task, context)
                    running[future] = task

            schedule_ready()
            while running:
                done, _ = wait(running.keys(), return_when=FIRST_COMPLETED)
                for future in done:
                    task = running.pop(future)
                    result = future.result()
                    results[task.name] = result
                    if result.status != "success" and not self._continue_on_failure:
                        for pending in running:
                            pending.cancel()
                        raise RuntimeError(
                            f"Pipeline halted due to failure in task '{task.name}': {result.error}"
                        )
                    for dependent in dependents.get(task.name, []):
                        in_degree[dependent] -= 1
                        if in_degree[dependent] == 0:
                            dependent_task = self._tasks[dependent]
                            ready_queue.enqueue(
                                QueuedJob(
                                    name=dependent_task.name,
                                    criticality=dependent_task.criticality,
                                    payload=dependent_task,
                                )
                            )
                schedule_ready()
        return results

    def _dependency_counts(self) -> dict[str, set[str]]:
        counts: dict[str, set[str]] = {name: set() for name in self._tasks}
        for task in self._tasks.values():
            counts[task.name] = set(task.dependencies)
        return counts

    def _reverse_dependencies(self) -> dict[str, list[str]]:
        dependents: dict[str, list[str]] = defaultdict(list)
        for task in self._tasks.values():
            for dep in task.dependencies:
                dependents[dep].append(task.name)
        return dependents

    def _execute_task(self, task: PipelineTask, context: PipelineExecutionContext) -> TaskResult:
        start = time.perf_counter()
        attempts = 0
        retried = False
        self._monitor.record_task_start(task.criticality)

        def invoke() -> Any:
            nonlocal attempts, retried
            attempts += 1
            if attempts > 1:
                retried = True
            return task.func(context)

        try:
            if task.retry_policy:
                result = retry_with_backoff(
                    invoke,
                    retries=task.retry_policy.retries,
                    base_delay=task.retry_policy.base_delay,
                    max_delay=task.retry_policy.max_delay,
                    jitter=task.retry_policy.jitter,
                    circuit_breaker=task.circuit_breaker,
                )
            else:
                if task.circuit_breaker and not task.circuit_breaker.allow():
                    raise RetryError("Circuit breaker open")
                result = invoke()
                if task.circuit_breaker:
                    task.circuit_breaker.record_success()
        except Exception as exc:  # pylint: disable=broad-except
            if task.circuit_breaker:
                task.circuit_breaker.record_failure()
            latency_ms = (time.perf_counter() - start) * 1000
            self._monitor.record_task_end(
                latency_ms, success=False, retried=retried, criticality=task.criticality
            )
            return TaskResult(
                name=task.name,
                status="failed",
                latency_ms=latency_ms,
                attempts=attempts,
                error=str(exc),
            )
        else:
            latency_ms = (time.perf_counter() - start) * 1000
            self._monitor.record_task_end(
                latency_ms, success=True, retried=retried, criticality=task.criticality
            )
            return TaskResult(
                name=task.name,
                status="success",
                latency_ms=latency_ms,
                attempts=attempts,
                output=result,
            )
        finally:
            self._monitor.snapshot.last_updated = time.time()

    def shutdown(self) -> None:  # pragma: no cover - maintained for API compatibility
        """Compatibility shim: executors are cleaned up per execution."""
        return None


_CRITICALITY_RANK = {
    "blocker": 0,
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 4,
    "deferred": 5,
}
