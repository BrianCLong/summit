from __future__ import annotations

from typing import Any, Dict

from .base import AgentMeta


class GovernorStub:
    meta = AgentMeta(
        name="governor",
        version="0.1.0",
        capabilities={"role": "governance", "outputs": ["decisions"]},
    )

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        inputs.setdefault("decisions", [])
        return inputs
