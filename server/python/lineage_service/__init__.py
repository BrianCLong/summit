"""Lineage service package for exposing lineage tracking over HTTP."""

from .app import create_app

__all__ = ["create_app"]
