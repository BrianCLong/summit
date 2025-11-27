"""Optimization toolkit for high-performance data pipelines."""

from .batching import AdaptiveBatcher, BatchPlan
from .benchmark import BenchmarkResult, BenchmarkSuite
from .ml_benchmarking import (
    ABTestResult,
    ABTestRunner,
    BenchmarkingSummary,
    DeploymentDecision,
    DeploymentManager,
    HyperparameterOptimizer,
    ModelBenchmarkingSuite,
    ModelRegistry,
    ModelVersion,
    RegressionDetector,
    RegressionReport,
    TrialResult,
)
from .monitoring import PipelineDashboard, PipelineMetrics, PipelineMonitor
from .pipeline_optimizer import PipelineOptimizer, PipelineTask, RetryPolicy
from .queue import PriorityJobQueue, QueuedJob
from .resilience import CircuitBreaker, RetryError, retry_with_backoff
from .streaming import stream_dataframe, stream_iterable

__all__ = [
    "AdaptiveBatcher",
    "BatchPlan",
    "BenchmarkResult",
    "BenchmarkSuite",
    "ABTestResult",
    "ABTestRunner",
    "BenchmarkingSummary",
    "DeploymentDecision",
    "DeploymentManager",
    "HyperparameterOptimizer",
    "ModelBenchmarkingSuite",
    "ModelRegistry",
    "ModelVersion",
    "RegressionDetector",
    "RegressionReport",
    "TrialResult",
    "CircuitBreaker",
    "PipelineDashboard",
    "PipelineMetrics",
    "PipelineMonitor",
    "PipelineOptimizer",
    "PipelineTask",
    "PriorityJobQueue",
    "QueuedJob",
    "RetryError",
    "RetryPolicy",
    "retry_with_backoff",
    "stream_dataframe",
    "stream_iterable",
]
