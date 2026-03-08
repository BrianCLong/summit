import hashlib
import json
from typing import Any, Dict, List, Optional


class MCPBridge:
    def __init__(self):
        self._known_tools_hash: Optional[str] = None
        self._tools: list[dict[str, Any]] = []

    def load_tools(self, tools: list[dict[str, Any]]) -> str:
        """
        Loads tools and returns their hash.
        """
        self._tools = sorted(tools, key=lambda x: x.get("name", ""))
        self._known_tools_hash = self._calculate_hash(self._tools)
        return self._known_tools_hash

    def _calculate_hash(self, tools: list[dict[str, Any]]) -> str:
        json_str = json.dumps(tools, sort_keys=True)
        return hashlib.sha256(json_str.encode('utf-8')).hexdigest()

    def on_tools_list_changed(self, new_tools: list[dict[str, Any]]) -> bool:
        """
        Returns True if tools changed (drift detected).
        """
        new_hash = self._calculate_hash(sorted(new_tools, key=lambda x: x.get("name", "")))
        if new_hash != self._known_tools_hash:
            # Update known hash? Policy decides. Here we just detect.
            return True
        return False
