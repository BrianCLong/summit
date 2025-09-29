"""Utilities for AI/ML features in IntelGraph.

This module exposes the public API for narrative generation and feedback
training utilities so they can be imported directly from the package,
e.g. ``from intelgraph_ai_ml import generate_narrative``.
"""

from .narrative_generator import Event, format_prompt, generate_narrative, traverse_graph
from .narrative_prompt_trainer import record_feedback

__all__ = [
  "Event",
  "format_prompt",
  "generate_narrative",
  "traverse_graph",
  "record_feedback",
]
