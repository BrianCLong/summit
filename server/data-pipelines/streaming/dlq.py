"""
Dead Letter Queue Implementation
Handles failed message processing with retry and recovery mechanisms
"""

import json
import uuid
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any

import redis

from ..utils.logging import get_logger


class MessageStatus(Enum):
    """Status of messages in DLQ"""

    PENDING = "pending"
    PROCESSING = "processing"
    RETRY = "retry"
    FAILED = "failed"
    POISONED = "poisoned"  # Messages that consistently fail


@dataclass
class FailedMessage:
    """Represents a message that failed processing"""

    id: str
    original_topic: str
    original_partition: int
    original_offset: int
    message_key: str | None
    message_value: Any
    headers: dict[str, str]
    failure_reason: str
    failure_timestamp: datetime
    retry_count: int = 0
    max_retries: int = 3
    next_retry_at: datetime | None = None
    status: MessageStatus = MessageStatus.PENDING

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        # Convert datetime objects to ISO strings
        data["failure_timestamp"] = self.failure_timestamp.isoformat()
        if self.next_retry_at:
            data["next_retry_at"] = self.next_retry_at.isoformat()
        data["status"] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FailedMessage":
        """Create from dictionary"""
        # Convert ISO strings back to datetime objects
        data["failure_timestamp"] = datetime.fromisoformat(data["failure_timestamp"])
        if data.get("next_retry_at"):
            data["next_retry_at"] = datetime.fromisoformat(data["next_retry_at"])
        data["status"] = MessageStatus(data["status"])
        return cls(**data)


class DeadLetterQueue:
    """
    Dead Letter Queue for storing and managing failed messages
    """

    def __init__(
        self,
        name: str,
        storage_backend: str = "redis",
        redis_url: str | None = None,
        max_retries: int = 3,
        retry_backoff_seconds: int = 60,
    ):

        self.name = name
        self.storage_backend = storage_backend
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.logger = get_logger(f"dlq-{name}")

        # Storage backend
        if storage_backend == "redis":
            self.redis_client = redis.from_url(redis_url or "redis://localhost:6379/0")
        elif storage_backend == "file":
            self.storage_path = Path(f"dlq_{name}.json")
            self._load_from_file()

        # In-memory tracking for active processing
        self.processing_messages: dict[str, FailedMessage] = {}

    async def add_failed_message(
        self,
        original_topic: str,
        partition: int,
        offset: int,
        message_key: str | None,
        message_value: Any,
        headers: dict[str, str],
        failure_reason: str,
        message_id: str | None = None,
    ) -> str:
        """Add a failed message to the DLQ"""

        if not message_id:
            message_id = str(uuid.uuid4())

        failed_message = FailedMessage(
            id=message_id,
            original_topic=original_topic,
            original_partition=partition,
            original_offset=offset,
            message_key=message_key,
            message_value=message_value,
            headers=headers,
            failure_reason=failure_reason,
            failure_timestamp=datetime.now(),
            max_retries=self.max_retries,
        )

        await self._store_message(failed_message)

        self.logger.warning(
            f"Added message to DLQ: {message_id} from {original_topic}:{partition}:{offset} - {failure_reason}"
        )

        return message_id

    async def get_retry_messages(self, limit: int = 100) -> list[FailedMessage]:
        """Get messages ready for retry"""
        now = datetime.now()
        retry_messages = []

        if self.storage_backend == "redis":
            retry_messages = await self._get_retry_messages_redis(now, limit)
        elif self.storage_backend == "file":
            retry_messages = await self._get_retry_messages_file(now, limit)

        return retry_messages

    async def mark_retry_success(self, message_id: str):
        """Mark a retry as successful and remove from DLQ"""
        if message_id in self.processing_messages:
            message = self.processing_messages[message_id]
            await self._remove_message(message)
            del self.processing_messages[message_id]

            self.logger.info(f"Message {message_id} retry succeeded, removed from DLQ")

    async def mark_retry_failure(self, message_id: str, failure_reason: str):
        """Mark a retry as failed and schedule next retry or mark as poisoned"""
        if message_id not in self.processing_messages:
            self.logger.warning(f"Message {message_id} not found in processing messages")
            return

        message = self.processing_messages[message_id]
        message.retry_count += 1
        message.failure_reason = f"Retry {message.retry_count}: {failure_reason}"
        message.failure_timestamp = datetime.now()

        if message.retry_count >= message.max_retries:
            # Mark as poisoned
            message.status = MessageStatus.POISONED
            self.logger.error(
                f"Message {message_id} marked as poisoned after {message.retry_count} retries"
            )
        else:
            # Schedule next retry with exponential backoff
            backoff_seconds = self.retry_backoff_seconds * (2 ** (message.retry_count - 1))
            message.next_retry_at = datetime.now() + timedelta(seconds=backoff_seconds)
            message.status = MessageStatus.RETRY

            self.logger.warning(
                f"Message {message_id} retry {message.retry_count} failed, next retry at {message.next_retry_at}"
            )

        await self._store_message(message)
        del self.processing_messages[message_id]

    async def get_poisoned_messages(self, limit: int = 100) -> list[FailedMessage]:
        """Get messages marked as poisoned for manual intervention"""
        poisoned_messages = []

        if self.storage_backend == "redis":
            poisoned_messages = await self._get_poisoned_messages_redis(limit)
        elif self.storage_backend == "file":
            poisoned_messages = await self._get_poisoned_messages_file(limit)

        return poisoned_messages

    async def requeue_poisoned_message(self, message_id: str, reset_retry_count: bool = True):
        """Requeue a poisoned message for retry"""
        message = await self._get_message_by_id(message_id)

        if message and message.status == MessageStatus.POISONED:
            message.status = MessageStatus.PENDING
            if reset_retry_count:
                message.retry_count = 0
            message.next_retry_at = None

            await self._store_message(message)
            self.logger.info(f"Requeued poisoned message {message_id}")

    async def get_statistics(self) -> dict[str, Any]:
        """Get DLQ statistics"""
        stats = {
            "total_messages": 0,
            "pending_messages": 0,
            "retry_messages": 0,
            "poisoned_messages": 0,
            "processing_messages": len(self.processing_messages),
            "oldest_message": None,
            "retry_ready_count": 0,
        }

        if self.storage_backend == "redis":
            await self._get_stats_redis(stats)
        elif self.storage_backend == "file":
            await self._get_stats_file(stats)

        return stats

    # Redis-specific implementations
    async def _store_message(self, message: FailedMessage):
        """Store message in Redis"""
        if self.storage_backend != "redis":
            return

        try:
            key = f"dlq:{self.name}:message:{message.id}"
            data = json.dumps(message.to_dict(), default=str)

            # Store with TTL (30 days)
            self.redis_client.setex(key, 86400 * 30, data)

            # Add to status-based sets for efficient querying
            status_key = f"dlq:{self.name}:status:{message.status.value}"
            self.redis_client.sadd(status_key, message.id)

            # If message has retry time, add to sorted set for time-based retrieval
            if message.next_retry_at:
                retry_key = f"dlq:{self.name}:retry_schedule"
                timestamp = message.next_retry_at.timestamp()
                self.redis_client.zadd(retry_key, {message.id: timestamp})

        except Exception as e:
            self.logger.error(f"Failed to store message in Redis: {e}")

    async def _get_retry_messages_redis(self, now: datetime, limit: int) -> list[FailedMessage]:
        """Get retry messages from Redis"""
        try:
            retry_key = f"dlq:{self.name}:retry_schedule"
            now_timestamp = now.timestamp()

            # Get messages scheduled for retry before now
            message_ids = self.redis_client.zrangebyscore(
                retry_key, 0, now_timestamp, start=0, num=limit
            )

            messages = []
            for message_id in message_ids:
                message_id = message_id.decode() if isinstance(message_id, bytes) else message_id
                message = await self._get_message_by_id(message_id)
                if message:
                    # Mark as processing
                    message.status = MessageStatus.PROCESSING
                    self.processing_messages[message.id] = message
                    messages.append(message)

                    # Remove from retry schedule
                    self.redis_client.zrem(retry_key, message_id)

            return messages

        except Exception as e:
            self.logger.error(f"Failed to get retry messages from Redis: {e}")
            return []

    async def _get_message_by_id(self, message_id: str) -> FailedMessage | None:
        """Get message by ID from Redis"""
        try:
            key = f"dlq:{self.name}:message:{message_id}"
            data = self.redis_client.get(key)

            if data:
                if isinstance(data, bytes):
                    data = data.decode()
                message_dict = json.loads(data)
                return FailedMessage.from_dict(message_dict)

        except Exception as e:
            self.logger.error(f"Failed to get message {message_id} from Redis: {e}")

        return None

    async def _remove_message(self, message: FailedMessage):
        """Remove message from Redis"""
        try:
            key = f"dlq:{self.name}:message:{message.id}"
            self.redis_client.delete(key)

            # Remove from status sets
            for status in MessageStatus:
                status_key = f"dlq:{self.name}:status:{status.value}"
                self.redis_client.srem(status_key, message.id)

            # Remove from retry schedule
            retry_key = f"dlq:{self.name}:retry_schedule"
            self.redis_client.zrem(retry_key, message.id)

        except Exception as e:
            self.logger.error(f"Failed to remove message {message.id} from Redis: {e}")

    # File-based implementations (fallback)
    def _load_from_file(self):
        """Load DLQ from file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path) as f:
                    data = json.load(f)
                    self.messages = {
                        msg_id: FailedMessage.from_dict(msg_data)
                        for msg_id, msg_data in data.items()
                    }
            except Exception as e:
                self.logger.error(f"Failed to load DLQ from file: {e}")
                self.messages = {}
        else:
            self.messages = {}


class DLQManager:
    """
    Manages multiple Dead Letter Queues and provides unified interface
    """

    def __init__(
        self,
        redis_url: str | None = None,
        default_max_retries: int = 3,
        default_backoff_seconds: int = 60,
    ):

        self.redis_url = redis_url
        self.default_max_retries = default_max_retries
        self.default_backoff_seconds = default_backoff_seconds
        self.dlqs: dict[str, DeadLetterQueue] = {}
        self.logger = get_logger("dlq-manager")

    def get_dlq(self, name: str, **kwargs) -> DeadLetterQueue:
        """Get or create a DLQ for a specific source/topic"""
        if name not in self.dlqs:
            self.dlqs[name] = DeadLetterQueue(
                name=name,
                redis_url=self.redis_url,
                max_retries=kwargs.get("max_retries", self.default_max_retries),
                retry_backoff_seconds=kwargs.get(
                    "retry_backoff_seconds", self.default_backoff_seconds
                ),
            )

        return self.dlqs[name]

    async def process_all_retries(
        self, processor: Callable[[FailedMessage], bool]
    ) -> dict[str, int]:
        """Process retries across all DLQs"""
        results = {}

        for dlq_name, dlq in self.dlqs.items():
            retry_messages = await dlq.get_retry_messages()
            processed = 0

            for message in retry_messages:
                try:
                    success = await processor(message)
                    if success:
                        await dlq.mark_retry_success(message.id)
                        processed += 1
                    else:
                        await dlq.mark_retry_failure(message.id, "Processor returned False")

                except Exception as e:
                    await dlq.mark_retry_failure(message.id, str(e))
                    self.logger.error(f"Failed to process retry message {message.id}: {e}")

            results[dlq_name] = processed

            if processed > 0:
                self.logger.info(f"Processed {processed} retry messages from DLQ {dlq_name}")

        return results

    async def get_global_statistics(self) -> dict[str, dict[str, Any]]:
        """Get statistics for all DLQs"""
        stats = {}

        for dlq_name, dlq in self.dlqs.items():
            stats[dlq_name] = await dlq.get_statistics()

        return stats

    async def cleanup_old_messages(self, max_age_days: int = 30):
        """Clean up old messages from all DLQs"""
        cutoff_date = datetime.now() - timedelta(days=max_age_days)

        for dlq_name, dlq in self.dlqs.items():
            cleaned_count = 0

            if dlq.storage_backend == "redis":
                # Get all message IDs
                pattern = f"dlq:{dlq_name}:message:*"
                keys = dlq.redis_client.keys(pattern)

                for key in keys:
                    try:
                        data = dlq.redis_client.get(key)
                        if data:
                            if isinstance(data, bytes):
                                data = data.decode()
                            message_dict = json.loads(data)
                            failure_time = datetime.fromisoformat(message_dict["failure_timestamp"])

                            if failure_time < cutoff_date:
                                message = FailedMessage.from_dict(message_dict)
                                await dlq._remove_message(message)
                                cleaned_count += 1

                    except Exception as e:
                        self.logger.error(f"Failed to cleanup message {key}: {e}")

            if cleaned_count > 0:
                self.logger.info(f"Cleaned up {cleaned_count} old messages from DLQ {dlq_name}")


# Utility functions for common DLQ patterns
async def create_retry_processor(original_processor: Callable) -> Callable[[FailedMessage], bool]:
    """Create a retry processor that wraps the original processing logic"""

    async def retry_processor(failed_message: FailedMessage) -> bool:
        """Process a failed message for retry"""
        try:
            # Reconstruct original message format
            message_data = {
                "key": failed_message.message_key,
                "value": failed_message.message_value,
                "headers": failed_message.headers,
                "topic": failed_message.original_topic,
                "partition": failed_message.original_partition,
                "offset": failed_message.original_offset,
            }

            # Call original processor
            success = await original_processor(message_data)
            return success

        except Exception:
            # Log the error but don't re-raise to allow DLQ to handle it
            return False

    return retry_processor
