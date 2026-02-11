from __future__ import annotations

from typing import Any, Dict

from .base import AgentMeta


class StrategistStub:
    meta = AgentMeta(
        name="strategist",
        version="0.1.0",
        capabilities={"role": "strategy", "outputs": ["interventions"]},
    )

    def run(self, inputs: dict[str, Any]) -> dict[str, Any]:
        inputs.setdefault("interventions", [])
        return inputs
