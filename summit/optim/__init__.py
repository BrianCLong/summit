"""Optimizer extensions for Summit."""

from __future__ import annotations

from typing import Any

__all__ = ["SAM"]


def __getattr__(name: str) -> Any:
    if name == "SAM":
        from .sam import SAM

        return SAM
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
