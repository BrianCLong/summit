"""Context compression middleware stub."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .thresholds import CompressionThresholds


@dataclass
class ContextCompressionConfig:
    enabled: bool = False
    offload_tool_results: bool = False
    offload_tool_inputs: bool = False
    summarization: bool = False
    thresholds: CompressionThresholds = CompressionThresholds()


class ContextCompressionMiddleware:
    def __init__(self, cfg: ContextCompressionConfig, fs: Any) -> None:
        self.cfg = cfg
        self.fs = fs

    def apply(self, run_state: dict[str, Any]) -> dict[str, Any]:
        """Apply compression stages to the run state (stubbed)."""
        run_state.setdefault("compression_events", [])
        if not isinstance(run_state["compression_events"], list):
            run_state["compression_events"] = []
        return run_state
