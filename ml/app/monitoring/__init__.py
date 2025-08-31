"""
Advanced monitoring and observability module for IntelGraph ML service
Supports GPU acceleration, quantum computing, and distributed training metrics
"""

from .metrics import (
    track_http_request,
    track_ml_prediction,
    track_task_processing,
    track_entity_extraction,
    track_graph_operation,
    track_error,
    track_cache_operation,
    track_model_loading,
    get_metrics,
    get_content_type,
    # New advanced metrics
    MLMetrics,
    MetricsCollector,
    SystemMetrics,
    GPUMetrics,
    ModelMetrics,
    QuantumMetrics
)

from .health import (
    health_checker,
    # New advanced health checks
    HealthCheck,
    HealthStatus,
    HealthCheckResult,
    SystemHealthChecker,
    GPUHealthChecker,
    PyTorchHealthChecker,
    ServiceHealthChecker
)

__all__ = [
    # Legacy metrics
    'track_http_request',
    'track_ml_prediction', 
    'track_task_processing',
    'track_entity_extraction',
    'track_graph_operation',
    'track_error',
    'track_cache_operation',
    'track_model_loading',
    'get_metrics',
    'get_content_type',
    'health_checker',
    # Advanced metrics
    'MLMetrics',
    'MetricsCollector',
    'SystemMetrics',
    'GPUMetrics', 
    'ModelMetrics',
    'QuantumMetrics',
    # Advanced health
    'HealthCheck',
    'HealthStatus',
    'HealthCheckResult',
    'SystemHealthChecker',
    'GPUHealthChecker',
    'PyTorchHealthChecker',
    'ServiceHealthChecker'
]