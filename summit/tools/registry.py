import hashlib
import json
from typing import List, Dict, Any, Tuple

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[Tuple[str, str], Dict[str, Any]] = {}

    def register_tool(self, tool_def: Dict[str, Any]):
        """
        Registers a tool. tool_def must have 'type' and 'function' (with 'name').
        """
        t_type = tool_def.get("type")
        if t_type == "function":
            name = tool_def.get("function", {}).get("name")
        else:
            # Fallback for other tool types if any
            name = tool_def.get("name", "unknown")

        if not t_type or not name:
             raise ValueError("Tool definition must have type and name")

        key = (t_type, name)
        self._tools[key] = tool_def

    def get_tools_sorted(self) -> List[Dict[str, Any]]:
        """
        Returns tools sorted by (type, name).
        """
        sorted_keys = sorted(self._tools.keys())
        return [self._tools[k] for k in sorted_keys]

    def get_tools_hash(self) -> str:
        """
        Returns a SHA256 hash of the sorted tool definitions.
        """
        tools = self.get_tools_sorted()
        # Use sort_keys=True for deterministic JSON serialization
        json_str = json.dumps(tools, sort_keys=True)
        return hashlib.sha256(json_str.encode('utf-8')).hexdigest()
