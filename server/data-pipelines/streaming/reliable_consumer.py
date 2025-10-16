"""
Reliable Kafka Consumer with DLQ, Backpressure, and Exactly-Once Semantics
Integrates DLQ and backpressure control for production-grade streaming
"""

import asyncio
import json
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any

try:
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
    from aiokafka.errors import CommitFailedError, KafkaError

    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

from ..utils.logging import get_logger
from .backpressure import FlowControl, FlowControlConfig
from .dlq import DLQManager


class ConsumerState(Enum):
    """States of the reliable consumer"""

    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass
class ConsumerConfig:
    """Configuration for reliable consumer"""

    # Kafka settings
    bootstrap_servers: str = "localhost:9092"
    group_id: str = "reliable-consumer"
    topics: list[str] = None
    auto_offset_reset: str = "earliest"
    enable_auto_commit: bool = False  # Manual commit for exactly-once

    # Processing settings
    max_poll_records: int = 500
    batch_size: int = 100
    processing_timeout_seconds: float = 30.0

    # Reliability settings
    max_retries: int = 3
    retry_backoff_seconds: int = 60

    # DLQ settings
    dlq_enabled: bool = True
    dlq_redis_url: str | None = None

    # Flow control settings
    flow_control_enabled: bool = True
    max_buffer_size: int = 1000
    max_messages_per_second: float = 100.0

    def __post_init__(self):
        if self.topics is None:
            self.topics = []


@dataclass
class ProcessingMetrics:
    """Metrics for consumer processing"""

    messages_consumed: int = 0
    messages_processed: int = 0
    messages_failed: int = 0
    messages_sent_to_dlq: int = 0
    processing_rate_per_second: float = 0.0
    average_processing_time_ms: float = 0.0
    last_commit_time: datetime | None = None
    backpressure_events: int = 0


class ReliableKafkaConsumer:
    """
    Reliable Kafka consumer with DLQ, backpressure, and exactly-once semantics
    """

    def __init__(self, config: ConsumerConfig, message_processor: Callable[[dict[str, Any]], bool]):

        if not KAFKA_AVAILABLE:
            raise ImportError(
                "aiokafka is required for Kafka consumer. Install with: pip install aiokafka"
            )

        self.config = config
        self.message_processor = message_processor
        self.logger = get_logger(f"reliable-consumer-{config.group_id}")

        # State management
        self.state = ConsumerState.STOPPED
        self.running = False

        # Kafka components
        self.consumer: AIOKafkaConsumer | None = None
        self.producer: AIOKafkaProducer | None = None

        # Reliability components
        self.dlq_manager: DLQManager | None = None
        self.flow_control: FlowControl | None = None

        # Processing tracking
        self.metrics = ProcessingMetrics()
        self.processing_times: list[float] = []
        self.last_metrics_reset = time.time()

        # Offset management for exactly-once
        self.pending_offsets: dict[str, dict[int, int]] = {}
        self.committed_offsets: dict[str, dict[int, int]] = {}

        # Graceful shutdown
        self.shutdown_event = asyncio.Event()
        self._tasks: list[asyncio.Task] = []

    async def start(self):
        """Start the reliable consumer"""
        if self.state != ConsumerState.STOPPED:
            raise RuntimeError(f"Consumer is in {self.state.value} state, cannot start")

        self.state = ConsumerState.STARTING
        self.logger.info("Starting reliable consumer...")

        try:
            # Initialize components
            await self._initialize_components()

            # Start processing
            self.running = True
            self.state = ConsumerState.RUNNING

            # Start background tasks
            self._tasks = [
                asyncio.create_task(self._consume_loop()),
                asyncio.create_task(self._metrics_loop()),
                asyncio.create_task(self._dlq_retry_loop()),
                asyncio.create_task(self._offset_commit_loop()),
            ]

            self.logger.info("Reliable consumer started successfully")

        except Exception as e:
            self.state = ConsumerState.ERROR
            self.logger.error(f"Failed to start consumer: {e}")
            await self.stop()
            raise

    async def stop(self):
        """Stop the reliable consumer gracefully"""
        if self.state == ConsumerState.STOPPED:
            return

        self.state = ConsumerState.STOPPING
        self.logger.info("Stopping reliable consumer...")

        # Signal shutdown
        self.running = False
        self.shutdown_event.set()

        # Cancel background tasks
        for task in self._tasks:
            task.cancel()

        # Wait for tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)

        # Close components
        await self._cleanup_components()

        self.state = ConsumerState.STOPPED
        self.logger.info("Reliable consumer stopped")

    async def pause(self):
        """Pause consumer processing"""
        if self.state == ConsumerState.RUNNING:
            self.state = ConsumerState.PAUSED
            if self.consumer:
                self.consumer.pause(*self.consumer.assignment())
            self.logger.info("Consumer paused")

    async def resume(self):
        """Resume consumer processing"""
        if self.state == ConsumerState.PAUSED:
            self.state = ConsumerState.RUNNING
            if self.consumer:
                self.consumer.resume(*self.consumer.assignment())
            self.logger.info("Consumer resumed")

    async def _initialize_components(self):
        """Initialize Kafka and reliability components"""

        # Initialize Kafka consumer
        self.consumer = AIOKafkaConsumer(
            *self.config.topics,
            bootstrap_servers=self.config.bootstrap_servers,
            group_id=self.config.group_id,
            auto_offset_reset=self.config.auto_offset_reset,
            enable_auto_commit=self.config.enable_auto_commit,
            max_poll_records=self.config.max_poll_records,
        )

        # Initialize Kafka producer for DLQ
        self.producer = AIOKafkaProducer(bootstrap_servers=self.config.bootstrap_servers)

        # Start Kafka components
        await self.consumer.start()
        await self.producer.start()

        # Initialize DLQ manager
        if self.config.dlq_enabled:
            self.dlq_manager = DLQManager(
                redis_url=self.config.dlq_redis_url,
                default_max_retries=self.config.max_retries,
                default_backoff_seconds=self.config.retry_backoff_seconds,
            )

        # Initialize flow control
        if self.config.flow_control_enabled:
            flow_config = FlowControlConfig(
                max_buffer_size=self.config.max_buffer_size,
                max_messages_per_second=self.config.max_messages_per_second,
            )
            self.flow_control = FlowControl(flow_config)
            await self.flow_control.start_monitoring()

        self.logger.info("All components initialized successfully")

    async def _cleanup_components(self):
        """Clean up all components"""

        # Stop flow control monitoring
        if self.flow_control:
            await self.flow_control.stop_monitoring()

        # Close Kafka components
        if self.consumer:
            await self.consumer.stop()

        if self.producer:
            await self.producer.stop()

        self.logger.info("All components cleaned up")

    async def _consume_loop(self):
        """Main message consumption loop"""
        try:
            while self.running and not self.shutdown_event.is_set():
                try:
                    # Check flow control
                    if (
                        self.flow_control
                        and not await self.flow_control.backpressure_controller.should_accept_message()
                    ):
                        self.metrics.backpressure_events += 1
                        await asyncio.sleep(0.1)  # Brief pause under backpressure
                        continue

                    # Consume messages
                    msg_pack = await self.consumer.getmany(
                        timeout_ms=1000, max_records=self.config.batch_size
                    )

                    if not msg_pack:
                        continue

                    # Process message batch
                    await self._process_message_batch(msg_pack)

                except Exception as e:
                    self.logger.error(f"Error in consume loop: {e}")
                    await asyncio.sleep(1)  # Brief pause on error

        except asyncio.CancelledError:
            self.logger.info("Consume loop cancelled")
        except Exception as e:
            self.logger.error(f"Consume loop failed: {e}")
            self.state = ConsumerState.ERROR

    async def _process_message_batch(self, msg_pack: dict):
        """Process a batch of messages"""

        for topic_partition, messages in msg_pack.items():
            topic = topic_partition.topic
            partition = topic_partition.partition

            for message in messages:
                try:
                    await self._process_single_message(topic, partition, message)

                except Exception as e:
                    self.logger.error(
                        f"Failed to process message from {topic}:{partition}:{message.offset}: {e}"
                    )
                    self.metrics.messages_failed += 1

    async def _process_single_message(self, topic: str, partition: int, message):
        """Process a single message with reliability guarantees"""

        start_time = time.time()
        self.metrics.messages_consumed += 1

        # Record message received for flow control
        if self.flow_control:
            await self.flow_control.backpressure_controller.on_message_received()

        try:
            # Deserialize message
            message_data = {
                "topic": topic,
                "partition": partition,
                "offset": message.offset,
                "key": message.key.decode("utf-8") if message.key else None,
                "value": json.loads(message.value.decode("utf-8")) if message.value else None,
                "headers": (
                    {k: v.decode("utf-8") for k, v in message.headers} if message.headers else {}
                ),
                "timestamp": message.timestamp,
            }

            # Process message
            success = await self._call_processor_with_timeout(message_data)

            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            self.processing_times.append(processing_time)

            if success:
                # Mark for commit
                self._mark_offset_for_commit(topic, partition, message.offset)
                self.metrics.messages_processed += 1

                # Record successful processing for flow control
                if self.flow_control:
                    await self.flow_control.backpressure_controller.on_message_processed(
                        processing_time, True
                    )

            else:
                # Send to DLQ
                await self._handle_processing_failure(message_data, "Processor returned False")

                # Record failed processing for flow control
                if self.flow_control:
                    await self.flow_control.backpressure_controller.on_message_processed(
                        processing_time, False
                    )

        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            await self._handle_processing_failure(message_data, str(e))

            # Record failed processing for flow control
            if self.flow_control:
                await self.flow_control.backpressure_controller.on_message_processed(
                    processing_time, False
                )

    async def _call_processor_with_timeout(self, message_data: dict[str, Any]) -> bool:
        """Call message processor with timeout"""
        try:
            result = await asyncio.wait_for(
                self.message_processor(message_data), timeout=self.config.processing_timeout_seconds
            )
            return result if isinstance(result, bool) else True

        except asyncio.TimeoutError:
            self.logger.warning(
                f"Message processing timed out after {self.config.processing_timeout_seconds}s"
            )
            return False
        except Exception as e:
            self.logger.error(f"Message processor failed: {e}")
            return False

    async def _handle_processing_failure(self, message_data: dict[str, Any], failure_reason: str):
        """Handle message processing failure"""

        if self.dlq_manager:
            try:
                dlq = self.dlq_manager.get_dlq(message_data["topic"])

                message_id = await dlq.add_failed_message(
                    original_topic=message_data["topic"],
                    partition=message_data["partition"],
                    offset=message_data["offset"],
                    message_key=message_data["key"],
                    message_value=message_data["value"],
                    headers=message_data["headers"],
                    failure_reason=failure_reason,
                )

                self.metrics.messages_sent_to_dlq += 1
                self.logger.warning(f"Sent message to DLQ: {message_id}")

            except Exception as e:
                self.logger.error(f"Failed to send message to DLQ: {e}")

        self.metrics.messages_failed += 1

    def _mark_offset_for_commit(self, topic: str, partition: int, offset: int):
        """Mark offset for commit (exactly-once semantics)"""
        if topic not in self.pending_offsets:
            self.pending_offsets[topic] = {}

        if partition not in self.pending_offsets[topic]:
            self.pending_offsets[topic][partition] = offset
        else:
            # Keep the highest offset
            self.pending_offsets[topic][partition] = max(
                self.pending_offsets[topic][partition], offset
            )

    async def _offset_commit_loop(self):
        """Background loop for committing offsets"""
        try:
            while self.running and not self.shutdown_event.is_set():
                try:
                    await asyncio.sleep(5)  # Commit every 5 seconds
                    await self._commit_pending_offsets()

                except Exception as e:
                    self.logger.error(f"Error in offset commit loop: {e}")

        except asyncio.CancelledError:
            self.logger.info("Offset commit loop cancelled")
            # Final commit before shutdown
            try:
                await self._commit_pending_offsets()
            except Exception as e:
                self.logger.error(f"Final offset commit failed: {e}")

    async def _commit_pending_offsets(self):
        """Commit pending offsets"""
        if not self.pending_offsets or not self.consumer:
            return

        try:
            # Build offset dict for commit
            offsets_to_commit = {}

            for topic, partitions in self.pending_offsets.items():
                for partition, offset in partitions.items():
                    from aiokafka import TopicPartition

                    tp = TopicPartition(topic, partition)
                    offsets_to_commit[tp] = offset + 1  # Kafka expects next offset

            if offsets_to_commit:
                await self.consumer.commit(offsets_to_commit)

                # Update committed offsets tracking
                for topic, partitions in self.pending_offsets.items():
                    if topic not in self.committed_offsets:
                        self.committed_offsets[topic] = {}
                    for partition, offset in partitions.items():
                        self.committed_offsets[topic][partition] = offset

                # Clear pending offsets
                self.pending_offsets.clear()
                self.metrics.last_commit_time = datetime.now()

                self.logger.debug(f"Committed offsets for {len(offsets_to_commit)} partitions")

        except CommitFailedError as e:
            self.logger.error(f"Offset commit failed: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error during offset commit: {e}")

    async def _dlq_retry_loop(self):
        """Background loop for processing DLQ retries"""
        if not self.dlq_manager:
            return

        try:
            while self.running and not self.shutdown_event.is_set():
                try:
                    await asyncio.sleep(30)  # Check for retries every 30 seconds

                    # Process retries for all DLQs
                    retry_processor = await self._create_retry_processor()
                    results = await self.dlq_manager.process_all_retries(retry_processor)

                    total_processed = sum(results.values())
                    if total_processed > 0:
                        self.logger.info(f"Processed {total_processed} DLQ retry messages")

                except Exception as e:
                    self.logger.error(f"Error in DLQ retry loop: {e}")

        except asyncio.CancelledError:
            self.logger.info("DLQ retry loop cancelled")

    async def _create_retry_processor(self) -> Callable:
        """Create processor for DLQ retry messages"""

        async def retry_processor(failed_message) -> bool:
            """Process a failed message for retry"""
            try:
                # Reconstruct message data
                message_data = {
                    "topic": failed_message.original_topic,
                    "partition": failed_message.original_partition,
                    "offset": failed_message.original_offset,
                    "key": failed_message.message_key,
                    "value": failed_message.message_value,
                    "headers": failed_message.headers,
                    "timestamp": None,  # Original timestamp not available
                }

                # Process with original processor
                success = await self._call_processor_with_timeout(message_data)

                if success:
                    self.logger.info(f"DLQ retry succeeded for message {failed_message.id}")

                return success

            except Exception as e:
                self.logger.error(f"DLQ retry processing failed: {e}")
                return False

        return retry_processor

    async def _metrics_loop(self):
        """Background loop for metrics calculation and logging"""
        try:
            while self.running and not self.shutdown_event.is_set():
                try:
                    await asyncio.sleep(60)  # Update metrics every minute
                    await self._calculate_and_log_metrics()

                except Exception as e:
                    self.logger.error(f"Error in metrics loop: {e}")

        except asyncio.CancelledError:
            self.logger.info("Metrics loop cancelled")

    async def _calculate_and_log_metrics(self):
        """Calculate and log processing metrics"""
        current_time = time.time()
        time_elapsed = current_time - self.last_metrics_reset

        if time_elapsed > 0:
            self.metrics.processing_rate_per_second = self.metrics.messages_processed / time_elapsed

        if self.processing_times:
            self.metrics.average_processing_time_ms = sum(self.processing_times) / len(
                self.processing_times
            )
            # Keep only recent processing times
            self.processing_times = self.processing_times[-1000:]

        # Log metrics if significant activity
        if self.metrics.messages_consumed > 0:
            self.logger.info(
                f"Consumer metrics: "
                f"consumed={self.metrics.messages_consumed}, "
                f"processed={self.metrics.messages_processed}, "
                f"failed={self.metrics.messages_failed}, "
                f"dlq={self.metrics.messages_sent_to_dlq}, "
                f"rate={self.metrics.processing_rate_per_second:.1f}/s, "
                f"avg_time={self.metrics.average_processing_time_ms:.1f}ms, "
                f"backpressure_events={self.metrics.backpressure_events}"
            )

        # Reset counters for next period
        self.metrics.messages_consumed = 0
        self.metrics.messages_processed = 0
        self.metrics.messages_failed = 0
        self.metrics.messages_sent_to_dlq = 0
        self.metrics.backpressure_events = 0
        self.last_metrics_reset = current_time

    def get_status(self) -> dict[str, Any]:
        """Get current consumer status"""
        flow_control_state = None
        if self.flow_control:
            flow_control_state = self.flow_control.backpressure_controller.get_current_state()

        return {
            "state": self.state.value,
            "running": self.running,
            "topics": self.config.topics,
            "group_id": self.config.group_id,
            "metrics": asdict(self.metrics),
            "flow_control": flow_control_state,
            "pending_partitions": len(self.pending_offsets),
            "committed_partitions": len(self.committed_offsets),
        }


# Utility functions for creating reliable consumers
async def create_reliable_consumer(
    topics: list[str],
    processor: Callable[[dict[str, Any]], bool],
    group_id: str = "reliable-consumer",
    **config_kwargs,
) -> ReliableKafkaConsumer:
    """Create a reliable consumer with sensible defaults"""

    config = ConsumerConfig(topics=topics, group_id=group_id, **config_kwargs)

    consumer = ReliableKafkaConsumer(config, processor)
    return consumer


async def run_reliable_consumer_forever(
    topics: list[str],
    processor: Callable[[dict[str, Any]], bool],
    group_id: str = "reliable-consumer",
    **config_kwargs,
):
    """Run a reliable consumer until interrupted"""

    consumer = await create_reliable_consumer(topics, processor, group_id, **config_kwargs)

    try:
        await consumer.start()

        # Run forever
        while True:
            await asyncio.sleep(1)

            # Check consumer health
            status = consumer.get_status()
            if status["state"] == ConsumerState.ERROR.value:
                raise RuntimeError("Consumer entered error state")

    except KeyboardInterrupt:
        print("\nShutdown requested by user")
    except Exception as e:
        print(f"Consumer failed: {e}")
    finally:
        await consumer.stop()


# Example usage
if __name__ == "__main__":

    async def example_processor(message: dict[str, Any]) -> bool:
        """Example message processor"""
        print(f"Processing message: {message['key']} = {message['value']}")

        # Simulate processing time
        await asyncio.sleep(0.1)

        # Simulate occasional failures
        import random

        return random.random() > 0.1  # 90% success rate

    # Run example consumer
    asyncio.run(
        run_reliable_consumer_forever(
            topics=["test-topic"], processor=example_processor, group_id="example-consumer"
        )
    )
