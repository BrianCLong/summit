from __future__ import annotations

from typing import Any, Dict

from .base import AgentMeta


class CartographerStub:
    meta = AgentMeta(
        name="cartographer",
        version="0.1.0",
        capabilities={"role": "graph", "outputs": ["nog_updates"]},
    )

    def run(self, inputs: dict[str, Any]) -> dict[str, Any]:
        inputs.setdefault("nog_updates", [])
        return inputs
