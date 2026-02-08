import requests
import json
from typing import Any, Dict, List
from .base import MCPTransport

class HttpMCPTransport(MCPTransport):
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})

    def _rpc_request(self, method: str, params: Dict[str, Any] = None) -> Any:
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": 1
        }
        # MCP HTTP binding typically uses POST for client messages
        response = self.session.post(f"{self.base_url}/messages", json=payload)
        response.raise_for_status()
        result = response.json()

        if "error" in result:
            raise RuntimeError(f"MCP Error: {result['error']}")
        return result.get("result")

    def list_tools(self) -> List[Dict[str, Any]]:
        response = self._rpc_request("tools/list")
        # Handle both flat list or dict with 'tools' key depending on server implementation
        if isinstance(response, dict) and "tools" in response:
            return response["tools"]
        return response if isinstance(response, list) else []

    def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        params = {
            "name": name,
            "arguments": arguments
        }
        return self._rpc_request("tools/call", params)
