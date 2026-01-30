from typing import Any, Dict

from summit_sim.agents.tools import Tool


class EchoTool(Tool):
    @property
    def name(self) -> str:
        return "echo"

    def execute(self, params: dict[str, Any]) -> Any:
        return params.get("message", "")
