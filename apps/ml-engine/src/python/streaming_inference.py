"""Streaming inference pipeline for low-latency Kafka workloads."""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, Optional
from uuid import uuid4

try:  # pragma: no cover - optional dependency for typing
    from kafka import KafkaConsumer  # type: ignore
except Exception:  # pragma: no cover - allow tests without kafka-python
    KafkaConsumer = None  # type: ignore

try:  # pragma: no cover - optional dependency for typing
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None  # type: ignore

from prometheus_client import Counter, Histogram, start_http_server
from prometheus_client.core import CollectorRegistry

LOGGER = logging.getLogger("ml_engine.streaming")


@dataclass
class StreamingConfig:
    """Configuration for the streaming inference engine."""

    bootstrap_servers: str
    input_topic: str
    group_id: str
    redis_url: str
    redis_channel: str = "ml:stream:inference"
    model_path: Optional[str] = None
    model_framework: str = "torch"
    prometheus_port: Optional[int] = None
    default_model_id: Optional[str] = None
    auto_offset_reset: str = "latest"
    consumer_timeout_ms: int = 1000


class MetricsRecorder:
    """Prometheus helpers for latency/error accounting."""

    def __init__(self, registry: Optional[CollectorRegistry] = None) -> None:
        self.registry = registry or CollectorRegistry()
        self.latency = Histogram(
            "ml_stream_inference_latency_seconds",
            "Latency of streaming ML predictions",
            labelnames=("model_id",),
            registry=self.registry,
            buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5),
        )
        self.throughput = Counter(
            "ml_stream_inference_predictions_total",
            "Total streaming predictions produced",
            labelnames=("model_id",),
            registry=self.registry,
        )
        self.errors = Counter(
            "ml_stream_inference_errors_total",
            "Total streaming prediction errors",
            labelnames=("model_id",),
            registry=self.registry,
        )

    def observe_success(self, model_id: str, latency_seconds: float) -> None:
        self.latency.labels(model_id=model_id).observe(latency_seconds)
        self.throughput.labels(model_id=model_id).inc()

    def observe_error(self, model_id: str) -> None:
        self.errors.labels(model_id=model_id).inc()


class RedisPublisher:
    """Simple Redis Pub/Sub publisher."""

    def __init__(self, redis_client: Any, channel: str) -> None:
        self._redis = redis_client
        self._channel = channel

    def publish(self, payload: Dict[str, Any]) -> None:
        message = json.dumps(payload)
        self._redis.publish(self._channel, message)


class BaseModelAdapter:
    """Interface for ML model adapters."""

    def predict(self, features: Any, metadata: Optional[Dict[str, Any]] = None) -> Any:  # pragma: no cover - interface
        raise NotImplementedError


class PyTorchModelAdapter(BaseModelAdapter):
    """PyTorch-backed inference adapter."""

    def __init__(self, model_path: Optional[str]) -> None:
        try:  # pragma: no cover - skip when torch not installed
            import torch  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("PyTorch is required for torch inference") from exc

        self._torch = torch
        self._model = None
        if model_path and os.path.exists(model_path):
            self._model = torch.jit.load(model_path)
            self._model.eval()

    def predict(self, features: Any, metadata: Optional[Dict[str, Any]] = None) -> Any:
        tensor = self._torch.tensor(features, dtype=self._torch.float32)
        with self._torch.no_grad():
            outputs = self._model(tensor) if self._model is not None else tensor
        return outputs.detach().cpu().tolist()


class TensorFlowModelAdapter(BaseModelAdapter):
    """TensorFlow-backed inference adapter."""

    def __init__(self, model_path: Optional[str]) -> None:
        try:  # pragma: no cover - skip when tensorflow not installed
            import tensorflow as tf  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("TensorFlow is required for tf inference") from exc

        self._tf = tf
        self._model = None
        if model_path and os.path.exists(model_path):
            self._model = tf.saved_model.load(model_path)

    def predict(self, features: Any, metadata: Optional[Dict[str, Any]] = None) -> Any:
        tensor = self._tf.convert_to_tensor(features, dtype=self._tf.float32)
        outputs = self._model(tensor) if self._model is not None else tensor
        if hasattr(outputs, "numpy"):
            outputs = outputs.numpy()
        return outputs.tolist()


def load_model_adapter(model_path: Optional[str], framework: str) -> BaseModelAdapter:
    framework_normalized = (framework or "torch").lower()
    if framework_normalized in {"torch", "pytorch"}:
        return PyTorchModelAdapter(model_path)
    if framework_normalized in {"tf", "tensorflow"}:
        return TensorFlowModelAdapter(model_path)
    raise ValueError(f"Unsupported framework '{framework}'")


class StreamingInferenceEngine:
    """Runs streaming inference by consuming Kafka and publishing to Redis."""

    def __init__(
        self,
        config: StreamingConfig,
        *,
        consumer: Optional[Iterable[Any]] = None,
        publisher: Optional[Any] = None,
        model_adapter: Optional[BaseModelAdapter] = None,
        metrics: Optional[MetricsRecorder] = None,
        clock: Optional[Callable[[], float]] = None,
    ) -> None:
        self.config = config
        self.metrics = metrics or MetricsRecorder()
        self.clock = clock or time.perf_counter
        self.model_adapter = model_adapter or load_model_adapter(
            config.model_path,
            config.model_framework,
        )
        self.consumer = consumer or self._create_consumer()
        self.publisher = publisher or self._create_publisher()

        if config.prometheus_port:
            start_http_server(config.prometheus_port, registry=self.metrics.registry)
            LOGGER.info("Prometheus metrics exposed", extra={"port": config.prometheus_port})

    def _create_consumer(self) -> Any:
        if KafkaConsumer is None:
            raise RuntimeError("kafka-python is required to create a consumer")
        LOGGER.info(
            "Connecting Kafka consumer",
            extra={
                "topic": self.config.input_topic,
                "bootstrap_servers": self.config.bootstrap_servers,
                "group_id": self.config.group_id,
            },
        )
        return KafkaConsumer(
            self.config.input_topic,
            bootstrap_servers=self.config.bootstrap_servers.split(","),
            group_id=self.config.group_id,
            value_deserializer=lambda value: json.loads(value.decode("utf-8")),
            auto_offset_reset=self.config.auto_offset_reset,
            consumer_timeout_ms=self.config.consumer_timeout_ms,
            enable_auto_commit=True,
        )

    def _create_publisher(self) -> RedisPublisher:
        if redis is None:
            raise RuntimeError("redis-py is required to publish inference results")
        client = redis.from_url(self.config.redis_url)  # type: ignore[attr-defined]
        LOGGER.info(
            "Publishing predictions to Redis",
            extra={"channel": self.config.redis_channel},
        )
        return RedisPublisher(client, self.config.redis_channel)

    def process_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        model_id = (
            record.get("model_id")
            or record.get("modelId")
            or self.config.default_model_id
            or "unknown"
        )
        if "features" not in record:
            LOGGER.error("Received record without features", extra={"model_id": model_id})
            self.metrics.observe_error(model_id)
            return None

        try:
            start_time = self.clock()
            predictions = self.model_adapter.predict(record["features"], record.get("metadata"))
            latency_seconds = max(self.clock() - start_time, 0.0)
            inference_id = record.get("inference_id") or record.get("inferenceId") or str(uuid4())
            payload = {
                "model_id": model_id,
                "inference_id": inference_id,
                "input_id": record.get("input_id") or record.get("inputId"),
                "predictions": predictions,
                "metadata": record.get("metadata") or {},
                "latency_ms": latency_seconds * 1000.0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.publisher.publish(payload)
            self.metrics.observe_success(model_id, latency_seconds)
            LOGGER.debug("Published streaming prediction", extra={"model_id": model_id, "inference_id": inference_id})
            return payload
        except Exception:  # pragma: no cover - error branch tested indirectly
            LOGGER.exception("Failed to run streaming inference", extra={"model_id": model_id})
            self.metrics.observe_error(model_id)
            return None

    def run_forever(self) -> None:  # pragma: no cover - integration behaviour
        LOGGER.info("Starting streaming inference loop", extra={"topic": self.config.input_topic})
        try:
            for message in self.consumer:
                record = message.value if isinstance(message, object) and hasattr(message, "value") else message
                if isinstance(record, bytes):
                    record = json.loads(record.decode("utf-8"))
                if not isinstance(record, dict):
                    LOGGER.warning("Skipping unexpected payload type", extra={"type": type(record).__name__})
                    continue
                self.process_record(record)
        finally:
            self._shutdown()

    def _shutdown(self) -> None:  # pragma: no cover - cleanup path
        if hasattr(self.consumer, "close"):
            try:
                self.consumer.close()
            except Exception:  # best-effort cleanup
                LOGGER.debug("Failed to close Kafka consumer", exc_info=True)


def _build_config_from_env() -> StreamingConfig:
    return StreamingConfig(
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        input_topic=os.getenv("KAFKA_INFERENCE_TOPIC", "ml.inference"),
        group_id=os.getenv("KAFKA_CONSUMER_GROUP", "ml-streaming"),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        redis_channel=os.getenv("ML_STREAM_REDIS_CHANNEL", "ml:stream:inference"),
        model_path=os.getenv("ML_MODEL_PATH"),
        model_framework=os.getenv("ML_MODEL_FRAMEWORK", "torch"),
        prometheus_port=(
            int(os.getenv("ML_PROMETHEUS_PORT", "")) if os.getenv("ML_PROMETHEUS_PORT") else None
        ),
        default_model_id=os.getenv("ML_DEFAULT_MODEL_ID"),
        auto_offset_reset=os.getenv("KAFKA_AUTO_OFFSET_RESET", "latest"),
    )


def main() -> None:  # pragma: no cover - integration entrypoint
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    config = _build_config_from_env()
    engine = StreamingInferenceEngine(config)

    shutdown = False

    def _handle_signal(signum: int, _frame: Any) -> None:
        nonlocal shutdown
        LOGGER.info("Received shutdown signal", extra={"signal": signum})
        shutdown = True

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    while not shutdown:
        engine.run_forever()


if __name__ == "__main__":  # pragma: no cover
    try:
        main()
    except Exception as exc:  # pragma: no cover - entrypoint guard
        LOGGER.error("Streaming inference terminated unexpectedly", exc_info=exc)
        sys.exit(1)
