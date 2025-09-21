"""Expose core classes for easy import.

This module tolerates missing optional dependencies so that lightweight
utilities (e.g., the copilot memory engine) can be imported without
requiring the full analytics stack.
"""

try:  # pragma: no cover - best effort if deps are missing
    from .models import Entity, Relationship
except Exception:  # noqa: BLE001 - allow graceful degradation
    Entity = Relationship = None  # type: ignore

from .copilot import CopilotMemory

__all__ = ["Entity", "Relationship", "CopilotMemory"]
