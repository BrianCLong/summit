"""Runtime configuration for the feed processor workers."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration values read from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    redis_url: str = Field(
        default="redis://localhost:6379",
        validation_alias=AliasChoices("REDIS_URL"),
    )
    queue_name: str = Field(
        default="feed:ingest",
        validation_alias=AliasChoices("FEED_QUEUE_NAME"),
    )
    batch_size: int = Field(
        default=500,
        validation_alias=AliasChoices("FEED_BATCH_SIZE"),
    )
    dequeue_timeout: float = Field(
        default=1.0,
        validation_alias=AliasChoices("FEED_DEQUEUE_TIMEOUT"),
    )
    worker_concurrency: int = Field(
        default=4,
        validation_alias=AliasChoices("FEED_WORKER_CONCURRENCY"),
    )
    processing_workers: int = Field(
        default=8,
        validation_alias=AliasChoices("FEED_PARALLELISM"),
    )
    flush_interval: float = Field(
        default=5.0,
        validation_alias=AliasChoices("FEED_FLUSH_INTERVAL"),
    )
    max_pending_batches: int = Field(
        default=16,
        validation_alias=AliasChoices("FEED_MAX_PENDING_BATCHES"),
    )
    tracing_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("FEED_TRACING_ENABLED"),
    )
    service_name: str = Field(
        default="feed-processor",
        validation_alias=AliasChoices("FEED_SERVICE_NAME"),
    )
    service_namespace: str = Field(
        default="intelgraph",
        validation_alias=AliasChoices("FEED_SERVICE_NAMESPACE"),
    )
    service_version: str = Field(
        default="0.2.0",
        validation_alias=AliasChoices("FEED_SERVICE_VERSION"),
    )
    jaeger_host: str = Field(
        default="jaeger",
        validation_alias=AliasChoices("JAEGER_HOST"),
    )
    jaeger_port: int = Field(
        default=6831,
        validation_alias=AliasChoices("JAEGER_PORT"),
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        validation_alias=AliasChoices("FEED_LOG_LEVEL"),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached `Settings` instance."""

    return Settings()  # type: ignore[call-arg]
