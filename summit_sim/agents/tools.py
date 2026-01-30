from abc import ABC, abstractmethod
from typing import Any, Dict, List


class Tool(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def execute(self, params: dict[str, Any]) -> Any:
        pass

class ToolRegistryInterface(ABC):
    @abstractmethod
    def get_tool(self, name: str) -> Tool:
        pass

    @abstractmethod
    def list_tools(self) -> list[str]:
        pass
