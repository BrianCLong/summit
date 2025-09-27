"""
Advanced monitoring and observability module for IntelGraph ML service
Supports GPU acceleration, quantum computing, and distributed training metrics
"""

from .health import (
    GPUHealthChecker,
    # New advanced health checks
    HealthCheck,
    HealthCheckResult,
    HealthStatus,
    PyTorchHealthChecker,
    ServiceHealthChecker,
    SystemHealthChecker,
    health_checker,
)
from .metrics import (
    GPUMetrics,
    MetricsCollector,
    # New advanced metrics
    MLMetrics,
    ModelMetrics,
    QuantumMetrics,
    SystemMetrics,
    get_content_type,
    get_metrics,
    track_cache_operation,
    track_entity_extraction,
    track_error,
    track_graph_operation,
    track_http_request,
    track_ml_prediction,
    track_model_loading,
    track_task_processing,
)

__all__ = [
    # Legacy metrics
    "track_http_request",
    "track_ml_prediction",
    "track_task_processing",
    "track_entity_extraction",
    "track_graph_operation",
    "track_error",
    "track_cache_operation",
    "track_model_loading",
    "get_metrics",
    "get_content_type",
    "health_checker",
    # Advanced metrics
    "MLMetrics",
    "MetricsCollector",
    "SystemMetrics",
    "GPUMetrics",
    "ModelMetrics",
    "QuantumMetrics",
    # Advanced health
    "HealthCheck",
    "HealthStatus",
    "HealthCheckResult",
    "SystemHealthChecker",
    "GPUHealthChecker",
    "PyTorchHealthChecker",
    "ServiceHealthChecker",
]
