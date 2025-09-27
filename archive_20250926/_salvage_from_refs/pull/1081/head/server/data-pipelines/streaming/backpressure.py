"""
Backpressure Control System
Manages flow control and prevents system overload during streaming processing
"""

import asyncio
import statistics
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

from ..utils.logging import get_logger


class FlowControlState(Enum):
    """States of flow control"""

    NORMAL = "normal"
    THROTTLED = "throttled"
    BACKPRESSURE = "backpressure"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class FlowMetrics:
    """Metrics for flow control decisions"""

    messages_per_second: float
    processing_latency_p95: float
    buffer_utilization: float
    error_rate: float
    memory_usage_percent: float
    cpu_usage_percent: float

    def to_dict(self) -> dict[str, float]:
        return {
            "messages_per_second": self.messages_per_second,
            "processing_latency_p95": self.processing_latency_p95,
            "buffer_utilization": self.buffer_utilization,
            "error_rate": self.error_rate,
            "memory_usage_percent": self.memory_usage_percent,
            "cpu_usage_percent": self.cpu_usage_percent,
        }


@dataclass
class FlowControlConfig:
    """Configuration for flow control"""

    # Buffer limits
    max_buffer_size: int = 1000
    buffer_high_watermark: float = 0.8  # 80% of max buffer
    buffer_low_watermark: float = 0.3  # 30% of max buffer

    # Processing limits
    max_messages_per_second: float = 100.0
    max_processing_latency_ms: float = 5000.0  # 5 seconds

    # Error thresholds
    max_error_rate: float = 0.1  # 10% error rate
    circuit_breaker_error_threshold: int = 5
    circuit_breaker_timeout_seconds: int = 60

    # Resource limits
    max_memory_usage_percent: float = 85.0
    max_cpu_usage_percent: float = 80.0

    # Throttling parameters
    throttle_factor: float = 0.5  # Reduce rate by 50% when throttling
    backpressure_delay_ms: int = 100
    adaptive_delay_enabled: bool = True


class BackpressureController:
    """
    Controls backpressure and flow control for streaming systems
    """

    def __init__(self, config: FlowControlConfig = None):
        self.config = config or FlowControlConfig()
        self.logger = get_logger("backpressure-controller")

        # Current state
        self.state = FlowControlState.NORMAL
        self.buffer_size = 0
        self.processing_times: list[float] = []
        self.error_count = 0
        self.total_processed = 0

        # Circuit breaker
        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure: datetime | None = None

        # Metrics tracking
        self.metrics_window_size = 100
        self.last_metrics_calculation = time.time()
        self.message_timestamps: list[float] = []

        # Rate limiting
        self.current_rate_limit: float | None = None
        self.last_message_time = 0.0

    async def should_accept_message(self) -> bool:
        """
        Determine if a new message should be accepted for processing

        Returns:
            True if message should be accepted, False if backpressure should be applied
        """
        current_metrics = self._calculate_current_metrics()

        # Update flow control state based on metrics
        await self._update_flow_control_state(current_metrics)

        # Apply flow control decisions
        if self.state == FlowControlState.CIRCUIT_OPEN:
            return False
        elif self.state == FlowControlState.BACKPRESSURE:
            # Apply backpressure delay
            await asyncio.sleep(self.config.backpressure_delay_ms / 1000.0)
            return True
        elif self.state == FlowControlState.THROTTLED:
            # Apply rate limiting
            return await self._apply_rate_limiting()
        else:
            # Normal flow
            return True

    async def on_message_received(self):
        """Called when a message is received"""
        self.buffer_size += 1
        self.message_timestamps.append(time.time())

        # Keep only recent timestamps for rate calculation
        cutoff_time = time.time() - 60  # Last minute
        self.message_timestamps = [t for t in self.message_timestamps if t > cutoff_time]

    async def on_message_processed(self, processing_time_ms: float, success: bool):
        """Called when a message processing is completed"""
        self.buffer_size = max(0, self.buffer_size - 1)
        self.total_processed += 1

        # Track processing times
        self.processing_times.append(processing_time_ms)
        if len(self.processing_times) > self.metrics_window_size:
            self.processing_times = self.processing_times[-self.metrics_window_size :]

        # Track errors
        if not success:
            self.error_count += 1
            self.circuit_breaker_failures += 1
            self.circuit_breaker_last_failure = datetime.now()
        else:
            # Reset circuit breaker on success
            self.circuit_breaker_failures = 0

    async def _update_flow_control_state(self, metrics: FlowMetrics):
        """Update flow control state based on current metrics"""

        # Check circuit breaker
        if (
            self.circuit_breaker_failures >= self.config.circuit_breaker_error_threshold
            and self.circuit_breaker_last_failure
            and (datetime.now() - self.circuit_breaker_last_failure).total_seconds()
            < self.config.circuit_breaker_timeout_seconds
        ):
            if self.state != FlowControlState.CIRCUIT_OPEN:
                self.logger.warning("Opening circuit breaker due to high error rate")
                self.state = FlowControlState.CIRCUIT_OPEN
            return

        # Reset circuit breaker if timeout passed
        if (
            self.state == FlowControlState.CIRCUIT_OPEN
            and self.circuit_breaker_last_failure
            and (datetime.now() - self.circuit_breaker_last_failure).total_seconds()
            >= self.config.circuit_breaker_timeout_seconds
        ):
            self.logger.info("Circuit breaker timeout passed, attempting to recover")
            self.circuit_breaker_failures = 0
            self.state = FlowControlState.NORMAL

        # Check if we need backpressure (severe conditions)
        if (
            metrics.buffer_utilization > self.config.buffer_high_watermark
            or metrics.processing_latency_p95 > self.config.max_processing_latency_ms
            or metrics.memory_usage_percent > self.config.max_memory_usage_percent
            or metrics.cpu_usage_percent > self.config.max_cpu_usage_percent
        ):
            if self.state != FlowControlState.BACKPRESSURE:
                self.logger.warning(
                    f"Applying backpressure: buffer={metrics.buffer_utilization:.2%}, "
                    f"latency={metrics.processing_latency_p95:.0f}ms, "
                    f"memory={metrics.memory_usage_percent:.1f}%, "
                    f"cpu={metrics.cpu_usage_percent:.1f}%"
                )
                self.state = FlowControlState.BACKPRESSURE
            return

        # Check if we need throttling (moderate conditions)
        if (
            metrics.messages_per_second > self.config.max_messages_per_second
            or metrics.error_rate > self.config.max_error_rate
            or metrics.buffer_utilization > self.config.buffer_low_watermark
        ):
            if self.state != FlowControlState.THROTTLED:
                self.logger.info(
                    f"Applying throttling: rate={metrics.messages_per_second:.1f}/s, "
                    f"error_rate={metrics.error_rate:.2%}, "
                    f"buffer={metrics.buffer_utilization:.2%}"
                )
                self.state = FlowControlState.THROTTLED

                # Calculate new rate limit
                target_rate = self.config.max_messages_per_second * self.config.throttle_factor
                self.current_rate_limit = target_rate
            return

        # Return to normal if conditions are good
        if self.state != FlowControlState.NORMAL:
            self.logger.info("Flow control returning to normal state")
            self.state = FlowControlState.NORMAL
            self.current_rate_limit = None

    async def _apply_rate_limiting(self) -> bool:
        """Apply rate limiting based on current limit"""
        if not self.current_rate_limit:
            return True

        current_time = time.time()
        min_interval = 1.0 / self.current_rate_limit

        if current_time - self.last_message_time < min_interval:
            # Need to wait
            wait_time = min_interval - (current_time - self.last_message_time)
            await asyncio.sleep(wait_time)

        self.last_message_time = time.time()
        return True

    def _calculate_current_metrics(self) -> FlowMetrics:
        """Calculate current flow metrics"""
        current_time = time.time()

        # Messages per second (last minute)
        recent_messages = [t for t in self.message_timestamps if current_time - t <= 60]
        messages_per_second = len(recent_messages) / 60.0 if recent_messages else 0.0

        # Processing latency P95
        if self.processing_times:
            processing_latency_p95 = statistics.quantiles(self.processing_times, n=20)[
                18
            ]  # 95th percentile
        else:
            processing_latency_p95 = 0.0

        # Buffer utilization
        buffer_utilization = self.buffer_size / self.config.max_buffer_size

        # Error rate (last 100 messages)
        error_rate = (
            self.error_count / max(1, self.total_processed) if self.total_processed > 0 else 0.0
        )

        # System resource usage (simplified - in real implementation would use psutil)
        memory_usage_percent = 0.0  # Placeholder
        cpu_usage_percent = 0.0  # Placeholder

        return FlowMetrics(
            messages_per_second=messages_per_second,
            processing_latency_p95=processing_latency_p95,
            buffer_utilization=buffer_utilization,
            error_rate=error_rate,
            memory_usage_percent=memory_usage_percent,
            cpu_usage_percent=cpu_usage_percent,
        )

    def get_current_state(self) -> dict[str, Any]:
        """Get current state and metrics"""
        metrics = self._calculate_current_metrics()

        return {
            "state": self.state.value,
            "buffer_size": self.buffer_size,
            "max_buffer_size": self.config.max_buffer_size,
            "total_processed": self.total_processed,
            "error_count": self.error_count,
            "circuit_breaker_failures": self.circuit_breaker_failures,
            "current_rate_limit": self.current_rate_limit,
            "metrics": metrics.to_dict(),
        }

    async def reset_circuit_breaker(self):
        """Manually reset circuit breaker"""
        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure = None
        if self.state == FlowControlState.CIRCUIT_OPEN:
            self.state = FlowControlState.NORMAL
        self.logger.info("Circuit breaker manually reset")


class FlowControl:
    """
    High-level flow control manager for streaming applications
    """

    def __init__(self, config: FlowControlConfig = None):
        self.backpressure_controller = BackpressureController(config)
        self.logger = get_logger("flow-control")

        # Monitoring
        self.metrics_callbacks: list[Callable[[dict[str, Any]], None]] = []
        self._monitoring_task: asyncio.Task | None = None
        self.monitoring_interval_seconds = 30

    def add_metrics_callback(self, callback: Callable[[dict[str, Any]], None]):
        """Add callback for metrics reporting"""
        self.metrics_callbacks.append(callback)

    async def start_monitoring(self):
        """Start background monitoring task"""
        if self._monitoring_task is None:
            self._monitoring_task = asyncio.create_task(self._monitoring_loop())
            self.logger.info("Started flow control monitoring")

    async def stop_monitoring(self):
        """Stop background monitoring"""
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
            self._monitoring_task = None
            self.logger.info("Stopped flow control monitoring")

    async def _monitoring_loop(self):
        """Background monitoring loop"""
        while True:
            try:
                await asyncio.sleep(self.monitoring_interval_seconds)

                # Get current state
                state = self.backpressure_controller.get_current_state()

                # Log state if not normal
                if state["state"] != FlowControlState.NORMAL.value:
                    self.logger.info(
                        f"Flow control state: {state['state']}, metrics: {state['metrics']}"
                    )

                # Call metrics callbacks
                for callback in self.metrics_callbacks:
                    try:
                        callback(state)
                    except Exception as e:
                        self.logger.error(f"Metrics callback failed: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")

    async def process_message(self, processor: Callable, message: Any) -> bool:
        """
        Process a message with flow control

        Args:
            processor: Function to process the message
            message: Message to process

        Returns:
            True if processing succeeded, False otherwise
        """
        # Check if we should accept this message
        if not await self.backpressure_controller.should_accept_message():
            self.logger.debug("Message rejected due to flow control")
            return False

        # Record message received
        await self.backpressure_controller.on_message_received()

        # Process the message
        start_time = time.time()
        success = False

        try:
            result = await processor(message)
            success = result if isinstance(result, bool) else True

        except Exception as e:
            self.logger.error(f"Message processing failed: {e}")
            success = False

        finally:
            # Record processing completion
            processing_time_ms = (time.time() - start_time) * 1000
            await self.backpressure_controller.on_message_processed(processing_time_ms, success)

        return success


# Utility functions
def create_adaptive_flow_control(
    initial_config: FlowControlConfig = None,
    adaptation_interval_seconds: int = 300,  # 5 minutes
    adaptation_factor: float = 0.1,
) -> FlowControl:
    """
    Create flow control with adaptive parameters based on system performance
    """
    config = initial_config or FlowControlConfig()
    flow_control = FlowControl(config)

    async def adaptive_adjustment():
        """Periodically adjust flow control parameters"""
        while True:
            try:
                await asyncio.sleep(adaptation_interval_seconds)

                state = flow_control.backpressure_controller.get_current_state()
                metrics = state["metrics"]

                # Adaptive rate limiting
                if state["state"] == FlowControlState.NORMAL.value:
                    # System is healthy, can increase limits slightly
                    current_max_rate = config.max_messages_per_second
                    new_max_rate = current_max_rate * (1 + adaptation_factor)
                    config.max_messages_per_second = new_max_rate

                elif state["state"] in [
                    FlowControlState.THROTTLED.value,
                    FlowControlState.BACKPRESSURE.value,
                ]:
                    # System is under pressure, decrease limits
                    current_max_rate = config.max_messages_per_second
                    new_max_rate = current_max_rate * (1 - adaptation_factor)
                    config.max_messages_per_second = max(1.0, new_max_rate)  # Minimum 1 msg/s

            except asyncio.CancelledError:
                break
            except Exception as e:
                flow_control.logger.error(f"Adaptive adjustment error: {e}")

    # Start adaptive adjustment task
    asyncio.create_task(adaptive_adjustment())

    return flow_control


async def create_consumer_with_flow_control(
    consumer_factory: Callable, processor: Callable, flow_config: FlowControlConfig = None
) -> Callable:
    """
    Create a consumer wrapper with built-in flow control
    """
    flow_control = FlowControl(flow_config)
    await flow_control.start_monitoring()

    async def controlled_consumer():
        """Consumer with flow control"""
        consumer = await consumer_factory()

        try:
            async for message in consumer:
                success = await flow_control.process_message(processor, message)

                if not success:
                    # Handle failed message (could send to DLQ)
                    flow_control.logger.warning(f"Failed to process message: {message}")

        finally:
            await flow_control.stop_monitoring()
            if hasattr(consumer, "close"):
                await consumer.close()

    return controlled_consumer
