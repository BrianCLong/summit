# Stub only: real MCP client/server integration must pass security gates first.
# MCP is a JSON-RPC based protocol with a public spec.
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class MCPAdapter:
    server_url: str

    def invoke(self, tool_name: str, args: Dict[str, Any]) -> Any:
        # TODO: implement JSON-RPC call after adding:
        # - path canonicalization utilities
        # - argument allowlists
        # - timeout + retries
        # - transcript redaction
        raise NotImplementedError("MCPAdapter disabled until security gates are implemented")
