import importlib.util
import sys
import time
from pathlib import Path
from threading import Event

OPTIMIZATION_DIR = Path(__file__).resolve().parents[1] / "optimization"
spec = importlib.util.spec_from_file_location(
    "pipeline_optimization", OPTIMIZATION_DIR / "__init__.py"
)
optimization = importlib.util.module_from_spec(spec)
sys.modules["pipeline_optimization"] = optimization
assert spec.loader is not None
spec.loader.exec_module(optimization)

AdaptiveBatcher = optimization.AdaptiveBatcher
BenchmarkSuite = optimization.BenchmarkSuite
PipelineDashboard = optimization.PipelineDashboard
PipelineMonitor = optimization.PipelineMonitor
PipelineOptimizer = optimization.PipelineOptimizer
PipelineTask = optimization.PipelineTask
PriorityJobQueue = optimization.PriorityJobQueue
QueuedJob = optimization.QueuedJob
RetryPolicy = optimization.RetryPolicy
CircuitBreaker = optimization.CircuitBreaker
stream_iterable = optimization.stream_iterable


def test_priority_queue_orders_by_criticality():
    queue = PriorityJobQueue()
    queue.extend(
        [
            QueuedJob(name="low", criticality="low", payload=None),
            QueuedJob(name="critical", criticality="critical", payload=None),
            QueuedJob(name="blocker", criticality="blocker", payload=None),
            QueuedJob(name="medium", criticality="medium", payload=None),
        ]
    )
    order = [job.name for job in queue.drain()]
    assert order == ["blocker", "critical", "medium", "low"]


def test_adaptive_batcher_suggests_plan_based_on_history():
    batcher = AdaptiveBatcher(min_batch_size=10, max_batch_size=200, latency_slo_ms=120)
    # Seed history with a mix of latencies
    for size, latency in [(10, 40.0), (50, 150.0), (40, 80.0)]:
        batcher.record_batch_outcome(size, latency)
    plan = batcher.suggest_batch_plan(500)
    assert 10 <= plan.size <= 200
    assert plan.expected_latency_ms > 0
    assert plan.throughput_per_second > 0


def test_pipeline_optimizer_runs_parallel_tasks_and_updates_metrics():
    monitor = PipelineMonitor()
    start_event = Event()

    def make_task(name: str) -> PipelineTask:
        def _task(context):
            start_event.wait(0.01)
            context.record_custom_metric(f"{name}_start", time.perf_counter())
            time.sleep(0.01)
            return name

        return PipelineTask(name=name, func=_task, criticality="high")

    tasks = [make_task("task_a"), make_task("task_b"), make_task("task_c")]
    optimizer = PipelineOptimizer(tasks, max_workers=3, monitor=monitor)
    shared_state = {}

    start_event.set()
    results = optimizer.execute(shared_state=shared_state)

    assert all(result.status == "success" for result in results.values())
    assert monitor.snapshot.succeeded_tasks == 3
    starts = list(shared_state.get("custom_metrics", {}).values())
    assert len(starts) == 3
    assert max(starts) - min(starts) < 0.03


def test_retry_and_circuit_breaker_integration():
    monitor = PipelineMonitor()
    attempts = {"count": 0}

    def flaky_task(context):
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise RuntimeError("transient failure")
        context.record_custom_metric("flaky_attempts", attempts["count"])
        return "ok"

    task = PipelineTask(
        name="flaky",
        func=flaky_task,
        criticality="critical",
        retry_policy=RetryPolicy(retries=3, base_delay=0.001, max_delay=0.002, jitter=0.0),
        circuit_breaker=CircuitBreaker(failure_threshold=3, recovery_timeout=0.1),
    )

    optimizer = PipelineOptimizer([task], monitor=monitor)
    results = optimizer.execute(shared_state={})
    assert results["flaky"].status == "success"
    assert results["flaky"].attempts == 3
    assert monitor.snapshot.retried_tasks == 1
    assert monitor.snapshot.failed_tasks == 0


def test_stream_iterable_batches_data():
    batches = list(stream_iterable(range(5), chunk_size=2))
    assert batches == [[0, 1], [2, 3], [4]]


def test_dashboard_routes_registered():
    monitor = PipelineMonitor()
    monitor.record_task_start("critical")
    monitor.record_task_end(12.0, success=True, retried=False, criticality="critical")
    dashboard = PipelineDashboard(monitor)
    app = dashboard.build_app()
    routes = {route.resource.canonical for route in app.router.routes()}
    assert "/" in routes and "/metrics" in routes and "/prometheus" in routes


def test_benchmark_suite_improvement_over_40_percent():
    suite = BenchmarkSuite.build_default_suite()
    result = suite.run()
    assert result.improvement_pct >= 40
