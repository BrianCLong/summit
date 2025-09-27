"""Streaming feed processor implementation."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, Optional

from .config import KafkaConfig, ProcessorConfig
from .metrics import RealtimeMetrics, ThroughputTracker

LOGGER = logging.getLogger("feed_processor")


class ProcessingError(Exception):
    """Raised when message processing fails."""


class RetryableProcessingError(ProcessingError):
    """Raised when a message can be retried."""


@dataclass(slots=True)
class Message:
    """Minimal message abstraction used by unit tests."""

    key: Optional[bytes]
    value: bytes
    partition: int = 0
    offset: int = 0


class RealtimeFeedProcessor:
    """Core loop for handling streaming feed data."""

    def __init__(
        self,
        kafka_config: KafkaConfig,
        processor_config: ProcessorConfig,
        metrics: RealtimeMetrics,
        handler: Callable[[Dict[str, Any]], Dict[str, Any]],
        consumer: Any,
        producer: Optional[Any] = None,
        throughput_tracker: Optional[ThroughputTracker] = None,
    ) -> None:
        self.kafka_config = kafka_config
        self.processor_config = processor_config
        self.metrics = metrics
        self.handler = handler
        self.consumer = consumer
        self.producer = producer
        self.throughput_tracker = throughput_tracker or ThroughputTracker()
        self._running = False

    def start(self) -> None:
        self._running = True
        LOGGER.info("Starting real-time feed processor loop")
        while self._running:
            processed = self._poll_once()
            if processed == 0:
                continue

    def stop(self) -> None:
        LOGGER.info("Stopping real-time feed processor loop")
        self._running = False

    def _poll_once(self) -> int:
        raw_message = self.consumer.poll(
            timeout_ms=self.processor_config.poll_timeout_ms
        )
        if raw_message is None:
            return 0

        if hasattr(raw_message, "error") and raw_message.error():  # pragma: no cover - passthrough
            LOGGER.error("Kafka consumer error: %s", raw_message.error())
            self.metrics.record_failure()
            return 0

        message = self._to_message(raw_message)
        LOGGER.debug(
            "Processing message partition=%s offset=%s",
            message.partition,
            message.offset,
        )
        start = time.perf_counter()
        with self.metrics.span("process_message"):
            try:
                payload = self._decode(message.value)
                processed_payload = self._process_with_retries(payload)
                self._publish(processed_payload, message)
                duration = time.perf_counter() - start
                self.metrics.record_success(duration)
                self.throughput_tracker.track(message.offset, timestamp=time.time())
                if hasattr(self.consumer, "commit"):
                    self.consumer.commit(message)
                return 1
            except RetryableProcessingError as exc:
                LOGGER.warning(
                    "Retryable processing error exhausted for partition=%s offset=%s: %s",
                    message.partition,
                    message.offset,
                    exc,
                )
                self.metrics.record_failure()
                self._send_to_dlq(message)
            except ProcessingError as exc:
                LOGGER.error(
                    "Processing error for partition=%s offset=%s: %s",
                    message.partition,
                    message.offset,
                    exc,
                )
                self.metrics.record_failure()
                self._send_to_dlq(message)
            except Exception as exc:  # pragma: no cover - safety net
                LOGGER.exception("Unhandled error while processing message: %s", exc)
                self.metrics.record_failure()
                self._send_to_dlq(message)
        return 0

    def _process_with_retries(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        attempts = 0
        while True:
            try:
                return self.handler(payload)
            except RetryableProcessingError:
                attempts += 1
                self.metrics.record_retry()
                if attempts >= self.processor_config.max_retries:
                    raise
                time.sleep(self.processor_config.retry_backoff_seconds * attempts)

    def _publish(self, payload: Dict[str, Any], message: Message) -> None:
        if not self.producer or not self.kafka_config.output_topic:
            return
        try:
            self.producer.produce(
                topic=self.kafka_config.output_topic,
                key=message.key,
                value=json.dumps(payload).encode("utf-8"),
            )
        except Exception as exc:  # pragma: no cover - passthrough
            LOGGER.error("Failed to publish message to %s: %s", self.kafka_config.output_topic, exc)
            raise RetryableProcessingError("publish failed") from exc

    def _send_to_dlq(self, message: Message) -> None:
        if not self.producer or not self.processor_config.dead_letter_topic:
            return
        try:
            self.producer.produce(
                topic=self.processor_config.dead_letter_topic,
                key=message.key,
                value=message.value,
            )
        except Exception as exc:  # pragma: no cover - passthrough
            LOGGER.error("Failed to publish message to DLQ %s: %s", self.processor_config.dead_letter_topic, exc)

    @staticmethod
    def _decode(value: bytes) -> Dict[str, Any]:
        try:
            return json.loads(value.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ProcessingError("Invalid JSON payload") from exc

    @staticmethod
    def _to_message(raw_message: Any) -> Message:
        if isinstance(raw_message, Message):
            return raw_message
        return Message(
            key=getattr(raw_message, "key", lambda: None)(),
            value=getattr(raw_message, "value", lambda: b"{}")(),
            partition=getattr(raw_message, "partition", lambda: 0)(),
            offset=getattr(raw_message, "offset", lambda: 0)(),
        )

    def current_throughput(self) -> float:
        return self.throughput_tracker.events_per_second()


def build_consumer(config: KafkaConfig, consumer_factory: Callable[[Dict[str, Any]], Any]) -> Any:
    """Helper to instantiate a Kafka consumer with consistent configuration."""

    consumer_config = {
        "bootstrap.servers": config.bootstrap_servers,
        "group.id": config.consumer_group,
        "auto.offset.reset": config.auto_offset_reset,
        "security.protocol": config.security_protocol,
        **config.extra_consumer_config,
    }
    return consumer_factory(consumer_config)


def build_producer(config: KafkaConfig, producer_factory: Callable[[Dict[str, Any]], Any]) -> Any:
    producer_config = {
        "bootstrap.servers": config.bootstrap_servers,
        "security.protocol": config.security_protocol,
    }
    return producer_factory(producer_config)
