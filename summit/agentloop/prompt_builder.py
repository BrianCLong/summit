from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass(frozen=True)
class PromptItem:
    type: str
    role: str
    content: str

class PromptBuilder:
    """
    Stateless builder: produces an append-only list of items for each turn.
    """
    def __init__(self, *, sandbox_md: str, tool_list: List[Dict[str, Any]]):
        self._sandbox_md = sandbox_md
        self._tools = tool_list

    def initial_items(self, *, agents_text: str, cwd: str, shell: str) -> List[PromptItem]:
        """
        Constructs the initial prompt sequence.
        Layering:
        1. Developer (Sandbox constraints/instructions)
        2. User (Project specific instructions from AGENTS.md)
        3. User (Environment context)
        """
        return [
            PromptItem(type="message", role="developer", content=self._sandbox_md),
            PromptItem(type="message", role="user", content=agents_text),
            PromptItem(type="message", role="user", content=f"<environment_context><cwd>{cwd}</cwd><shell>{shell}</shell></environment_context>"),
        ]
