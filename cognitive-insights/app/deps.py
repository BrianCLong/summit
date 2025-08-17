from __future__ import annotations

from .config import Settings, get_settings


def get_config() -> Settings:
    return get_settings()
