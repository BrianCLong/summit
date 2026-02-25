from abc import ABC, abstractmethod
from typing import Any, Dict, List


class MCPTransport(ABC):
    """Abstract base class for Model Context Protocol transports."""

    @abstractmethod
    def list_tools(self) -> list[dict[str, Any]]:
        """List available tools from the MCP server."""
        pass

    @abstractmethod
    def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool on the MCP server."""
        pass
