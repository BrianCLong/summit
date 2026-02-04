from __future__ import annotations

import os

ENV_ENABLE = "SUMMIT_WORLDMODEL_ENABLE"
ENV_BACKEND = "SUMMIT_WORLDMODEL_BACKEND"


def worldmodel_enabled() -> bool:
    return os.getenv(ENV_ENABLE, "0").lower() in {"1", "true", "yes", "on"}


def selected_backend() -> str:
    return os.getenv(ENV_BACKEND, "none")
