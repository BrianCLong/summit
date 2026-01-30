from summit_sim.agents.tools import Tool
from typing import Dict, Any

class EchoTool(Tool):
    @property
    def name(self) -> str:
        return "echo"

    def execute(self, params: Dict[str, Any]) -> Any:
        return params.get("message", "")
