from typing import List, Dict, Any, Optional
import copy

class WideSeekContext:
    def __init__(self, parent_id: Optional[str] = None, isolated: bool = True):
        self.messages: List[Dict[str, str]] = []
        self.parent_id = parent_id
        self.isolated = isolated
        self.metadata: Dict[str, Any] = {}

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def fork(self, subagent_id: str) -> 'WideSeekContext':
        """Creates an isolated context for a subagent."""
        # In WideSeek, subagents start fresh or with specific instructions,
        # they don't necessarily inherit the full parent history to avoid pollution.
        # But they might need the task.
        new_ctx = WideSeekContext(parent_id=subagent_id, isolated=True)
        # Optionally copy system prompt or task instructions here
        return new_ctx

    def get_history(self) -> List[Dict[str, str]]:
        return self.messages
