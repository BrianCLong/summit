"""Unit tests for the streaming inference engine."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from prometheus_client import CollectorRegistry

# Ensure the ML engine source directory is importable
PROJECT_ROOT = Path(__file__).resolve().parents[1] / "src" / "python"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from streaming_inference import MetricsRecorder, StreamingConfig, StreamingInferenceEngine


class _FakePublisher:
    def __init__(self) -> None:
        self.messages = []

    def publish(self, payload):
        self.messages.append(payload)


class _FakeConsumer:
    def __iter__(self):
        return iter(())

    def close(self):
        return None


class _DeterministicClock:
    def __init__(self, *values: float) -> None:
        self._values = list(values)
        self._index = 0

    def __call__(self) -> float:
        value = self._values[self._index]
        self._index = min(self._index + 1, len(self._values) - 1)
        return value


class _EchoAdapter:
    def predict(self, features, metadata=None):
        return [[sum(row) for row in features]]


class _FailingAdapter:
    def predict(self, features, metadata=None):
        raise RuntimeError("boom")


@pytest.fixture()
def base_config() -> StreamingConfig:
    return StreamingConfig(
        bootstrap_servers="localhost:9092",
        input_topic="ml.test",
        group_id="ml-test",
        redis_url="redis://example",
    )


def _make_engine(
    config: StreamingConfig,
    *,
    adapter,
    publisher,
    metrics,
    clock,
):
    return StreamingInferenceEngine(
        config,
        consumer=_FakeConsumer(),
        model_adapter=adapter,
        publisher=publisher,
        metrics=metrics,
        clock=clock,
    )


def test_process_record_publishes_predictions_and_metrics(base_config: StreamingConfig):
    registry = CollectorRegistry()
    metrics = MetricsRecorder(registry=registry)
    publisher = _FakePublisher()
    clock = _DeterministicClock(1.0, 1.002)
    engine = _make_engine(
        base_config,
        adapter=_EchoAdapter(),
        publisher=publisher,
        metrics=metrics,
        clock=clock,
    )

    payload = engine.process_record({"model_id": "model-A", "features": [[0.2, 0.3], [0.1, 0.1]]})

    assert payload is not None
    assert payload["model_id"] == "model-A"
    assert pytest.approx(payload["latency_ms"], rel=1e-3) == 2.0
    assert publisher.messages, "Prediction payload should be published"
    assert publisher.messages[0]["predictions"] == [[0.5, 0.2]]

    count = registry.get_sample_value(
        "ml_stream_inference_latency_seconds_count",
        {"model_id": "model-A"},
    )
    assert count == 1
    total = registry.get_sample_value(
        "ml_stream_inference_latency_seconds_sum",
        {"model_id": "model-A"},
    )
    assert pytest.approx(total, rel=1e-3) == 0.002
    throughput = registry.get_sample_value(
        "ml_stream_inference_predictions_total",
        {"model_id": "model-A"},
    )
    assert throughput == 1


def test_process_record_records_errors_on_failure(base_config: StreamingConfig):
    registry = CollectorRegistry()
    metrics = MetricsRecorder(registry=registry)
    publisher = _FakePublisher()
    clock = _DeterministicClock(1.0, 1.0)
    engine = _make_engine(
        base_config,
        adapter=_FailingAdapter(),
        publisher=publisher,
        metrics=metrics,
        clock=clock,
    )

    result = engine.process_record({"model_id": "model-A", "features": [[1.0]]})

    assert result is None
    assert publisher.messages == []
    errors = registry.get_sample_value(
        "ml_stream_inference_errors_total",
        {"model_id": "model-A"},
    )
    assert errors == 1


def test_process_record_uses_default_model_id(base_config: StreamingConfig):
    base_config.default_model_id = "fallback"
    registry = CollectorRegistry()
    metrics = MetricsRecorder(registry=registry)
    publisher = _FakePublisher()
    clock = _DeterministicClock(1.0, 1.001)
    engine = _make_engine(
        base_config,
        adapter=_EchoAdapter(),
        publisher=publisher,
        metrics=metrics,
        clock=clock,
    )

    payload = engine.process_record({"features": [[0.5]]})

    assert payload is not None
    assert payload["model_id"] == "fallback"
    errors = registry.get_sample_value(
        "ml_stream_inference_errors_total",
        {"model_id": "fallback"},
    )
    assert errors is None
