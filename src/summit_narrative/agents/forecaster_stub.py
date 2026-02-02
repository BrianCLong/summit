from __future__ import annotations

from typing import Any, Dict

from .base import AgentMeta


class ForecasterStub:
    meta = AgentMeta(
        name="forecaster",
        version="0.1.0",
        capabilities={"role": "forecast", "outputs": ["risk_scores"]},
    )

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        inputs.setdefault("risk_scores", {})
        return inputs
