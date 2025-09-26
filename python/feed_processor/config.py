"""Configuration dataclasses for the real-time feed processor."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass(slots=True)
class KafkaConfig:
    """Kafka connectivity and topic configuration."""

    bootstrap_servers: str
    input_topic: str
    output_topic: Optional[str] = None
    consumer_group: str = "feed-processor"
    auto_offset_reset: str = "latest"
    security_protocol: str = "PLAINTEXT"
    extra_consumer_config: Dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class ProcessorConfig:
    """Runtime behavior for the processor."""

    poll_timeout_ms: int = 1000
    max_batch_size: int = 256
    max_retries: int = 5
    retry_backoff_seconds: float = 0.5
    dead_letter_topic: Optional[str] = None


@dataclass(slots=True)
class TelemetryConfig:
    """OpenTelemetry configuration."""

    service_name: str = "feed-processor"
    otlp_endpoint: Optional[str] = None
    sampling_ratio: float = 0.2
    prometheus_port: int = 9464
