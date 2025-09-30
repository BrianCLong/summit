"""Real-time feed processor package.

This package provides a Kafka-backed streaming pipeline that processes
incoming intelligence feeds with resiliency and telemetry hooks.  It is designed
so that the production deployment can run inside Summit's data plane while
tests rely on lightweight in-memory doubles.
"""

from .config import KafkaConfig, ProcessorConfig, TelemetryConfig
from .metrics import RealtimeMetrics, ThroughputTracker, configure_otel
from .streaming import RealtimeFeedProcessor, ProcessingError, RetryableProcessingError

__all__ = [
    "KafkaConfig",
    "ProcessorConfig",
    "TelemetryConfig",
    "RealtimeMetrics",
    "ThroughputTracker",
    "configure_otel",
    "RealtimeFeedProcessor",
    "ProcessingError",
    "RetryableProcessingError",
]
