"""Event models for context compression actions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

EventType = Literal[
    "TOOL_RESULT_OFFLOADED",
    "TOOL_INPUTS_TRUNCATED",
    "HISTORY_SUMMARIZED",
]


@dataclass(frozen=True)
class CompressionEvent:
    type: EventType
    trigger_reason: str
    tokens_delta: int
    fs_paths_written: list[str]
    preview_in_context: bool = False
