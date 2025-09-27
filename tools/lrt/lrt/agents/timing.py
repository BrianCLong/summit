"""Timing side-channel agent stub."""
from __future__ import annotations

import math

from .base import AttackAgent
from ..api import AttackSession, ProtectedAPI


class TimingSideChannelAgent(AttackAgent):
    """Records artificial latency measurements alongside responses."""

    name = "timing-side-channel"

    def run(self, api: ProtectedAPI, session: AttackSession) -> None:
        for step in range(3):
            prompt = f"Measure latency hint {step}?"
            response = api.query(prompt)
            latency = self._simulate_latency(response)
            session.record(
                prompt,
                response,
                self._tick(step),
                metadata={"latency_ms": latency},
            )

    def _simulate_latency(self, response: str) -> float:
        base = 50.0
        modifier = 25.0 if "No sensitive" in response else 75.0
        jitter = math.sin(len(response) + self.seed) * 5.0
        return round(base + modifier + jitter, 3)
