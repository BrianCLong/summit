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
    "ABTestResult",
    "ABTestRunner",
    "AdaptiveBatcher",
    "BatchPlan",
    "BenchmarkResult",
    "BenchmarkSuite",
    "BenchmarkingSummary",
    "CircuitBreaker",
    "DeploymentDecision",
    "DeploymentManager",
    "HyperparameterOptimizer",
    "ModelBenchmarkingSuite",
    "ModelRegistry",
    "ModelVersion",
    "PipelineDashboard",
    "PipelineMetrics",
    "PipelineMonitor",
    "PipelineOptimizer",
    "PipelineTask",
    "PriorityJobQueue",
    "QueuedJob",
    "RegressionDetector",
    "RegressionReport",
    "RetryError",
    "RetryPolicy",
    "TrialResult",
    "retry_with_backoff",
    "stream_dataframe",
    "stream_iterable",
]
