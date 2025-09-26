import json
import os
import sys
import time
from collections import deque
from types import SimpleNamespace
from typing import Any, Dict, Optional

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from feed_processor import (
    KafkaConfig,
    ProcessorConfig,
    RealtimeFeedProcessor,
    RealtimeMetrics,
    RetryableProcessingError,
    TelemetryConfig,
)


class DummyConsumer:
    def __init__(self, messages: deque[Any]):
        self.messages = messages
        self.committed: list[Any] = []

    def poll(self, timeout_ms: int) -> Optional[Any]:  # pragma: no cover - simple wrapper
        try:
            return self.messages.popleft()
        except IndexError:
            time.sleep(timeout_ms / 1000.0)
            return None

    def commit(self, message: Any) -> None:
        self.committed.append(message)


class DummyProducer:
    def __init__(self) -> None:
        self.produced: list[Dict[str, Any]] = []

    def produce(self, topic: str, key: Optional[bytes], value: bytes) -> None:
        self.produced.append({"topic": topic, "key": key, "value": value})


@pytest.fixture
def telemetry() -> TelemetryConfig:
    return TelemetryConfig(service_name="test-feed-processor")


@pytest.fixture
def metrics(telemetry: TelemetryConfig) -> RealtimeMetrics:
    return RealtimeMetrics(telemetry)


def test_successful_processing(metrics: RealtimeMetrics) -> None:
    payload = {"id": "1", "title": "intel"}
    message = SimpleNamespace(
        key=lambda: b"1",
        value=lambda: json.dumps(payload).encode("utf-8"),
        partition=lambda: 0,
        offset=lambda: 10,
    )
    consumer = DummyConsumer(deque([message]))
    producer = DummyProducer()

    def handler(data: Dict[str, Any]) -> Dict[str, Any]:
        data["processed"] = True
        return data

    processor = RealtimeFeedProcessor(
        kafka_config=KafkaConfig(
            bootstrap_servers="localhost:9092",
            input_topic="intel.raw",
            output_topic="intel.enriched",
        ),
        processor_config=ProcessorConfig(),
        metrics=metrics,
        handler=handler,
        consumer=consumer,
        producer=producer,
    )

    assert processor._poll_once() == 1
    assert producer.produced[0]["topic"] == "intel.enriched"
    assert json.loads(producer.produced[0]["value"]) == {"id": "1", "title": "intel", "processed": True}


def test_retry_and_dead_letter(metrics: RealtimeMetrics) -> None:
    message = SimpleNamespace(
        key=lambda: b"2",
        value=lambda: json.dumps({"id": "2"}).encode("utf-8"),
        partition=lambda: 1,
        offset=lambda: 11,
    )
    consumer = DummyConsumer(deque([message]))
    producer = DummyProducer()

    attempts = {"count": 0}

    def handler(_: Dict[str, Any]) -> Dict[str, Any]:
        attempts["count"] += 1
        raise RetryableProcessingError("temporary failure")

    processor = RealtimeFeedProcessor(
        kafka_config=KafkaConfig(
            bootstrap_servers="localhost:9092",
            input_topic="intel.raw",
            output_topic="intel.enriched",
        ),
        processor_config=ProcessorConfig(max_retries=2, retry_backoff_seconds=0, dead_letter_topic="intel.dlq"),
        metrics=metrics,
        handler=handler,
        consumer=consumer,
        producer=producer,
    )

    assert processor._poll_once() == 0
    assert attempts["count"] == 2
    assert producer.produced[-1]["topic"] == "intel.dlq"


def test_throughput_calculation(metrics: RealtimeMetrics) -> None:
    payload = {"id": "1"}
    message = SimpleNamespace(
        key=lambda: b"1",
        value=lambda: json.dumps(payload).encode("utf-8"),
        partition=lambda: 0,
        offset=lambda: 10,
    )
    consumer = DummyConsumer(deque([message]))

    def handler(data: Dict[str, Any]) -> Dict[str, Any]:
        return data

    processor = RealtimeFeedProcessor(
        kafka_config=KafkaConfig(bootstrap_servers="localhost:9092", input_topic="intel.raw"),
        processor_config=ProcessorConfig(),
        metrics=metrics,
        handler=handler,
        consumer=consumer,
        producer=None,
    )
    processor._poll_once()
    assert processor.current_throughput() > 0
