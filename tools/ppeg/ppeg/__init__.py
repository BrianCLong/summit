"""Provenance-Preserving ETL Generator (PPEG).

This package exposes the public API for the ppeg code generation tool.
"""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version

try:  # pragma: no cover - best effort metadata discovery
    __version__ = version("ppeg")
except PackageNotFoundError:  # pragma: no cover - used in repo tests
    __version__ = "0.1.0"

__all__ = ["__version__"]
