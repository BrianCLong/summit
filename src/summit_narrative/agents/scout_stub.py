from __future__ import annotations

from typing import Any, Dict

from .base import AgentMeta


class ScoutStub:
    meta = AgentMeta(
        name="scout",
        version="0.1.0",
        capabilities={"role": "ingest", "outputs": ["candidates"]},
    )

    def run(self, inputs: dict[str, Any]) -> dict[str, Any]:
        inputs.setdefault("candidates", [])
        return inputs
