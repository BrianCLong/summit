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
    track_automl_job,
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

try:  # pragma: no cover - optional heavy dependencies
    from .health import (
        health_checker,
        # New advanced health checks
        HealthCheck,
        HealthStatus,
        HealthCheckResult,
        SystemHealthChecker,
        GPUHealthChecker,
        PyTorchHealthChecker,
        ServiceHealthChecker,
    )
except Exception:  # pragma: no cover - provide lightweight fallbacks
    health_checker = None

    class HealthCheck:  # type: ignore
        def __init__(self, *args, **kwargs):
            self._status = {'status': 'unknown'}

        async def initialize(self):  # pragma: no cover - simple stub
            return None

        async def check_health(self):
            return self._status

        def get_system_info(self):
            return {'status': 'unknown'}

    class HealthStatus:  # type: ignore
        pass

    class HealthCheckResult:  # type: ignore
        pass

    class SystemHealthChecker:  # type: ignore
        pass

    class GPUHealthChecker:  # type: ignore
        pass

    class PyTorchHealthChecker:  # type: ignore
        pass

    class ServiceHealthChecker:  # type: ignore
        pass

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
    'track_automl_job',
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