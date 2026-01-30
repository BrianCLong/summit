from __future__ import annotations

import os

WORLD_MODEL_ENABLE_FLAG = "SUMMIT_WORLDMODEL_ENABLE"
WORLD_MODEL_BACKEND_FLAG = "SUMMIT_WORLDMODEL_BACKEND"


def _is_truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_worldmodel_enabled() -> bool:
    """Kill-switch gate for world model features."""

    return _is_truthy(os.getenv(WORLD_MODEL_ENABLE_FLAG))


def selected_backend() -> str:
    """Return the configured backend identifier (default: none)."""

    return os.getenv(WORLD_MODEL_BACKEND_FLAG, "none")
