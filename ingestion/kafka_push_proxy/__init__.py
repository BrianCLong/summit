"""Kafka push proxy ingestion mode.

This package provides a feature-flagged scaffold for a push-based Kafka proxy
path intended for constrained clients that cannot maintain direct broker
connectivity.
"""

from __future__ import annotations

import os


def kafka_push_proxy_enabled() -> bool:
    """Return whether the push proxy ingestion path is enabled."""

    return os.getenv("KAFKA_PUSH_PROXY_ENABLED", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

