from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from summit.integrations.palantir import SummitGraphSchema, SummitTool
from summit.governance.palantir_policy import PalantirActionWrapper

@dataclass
class AgentPrompt:
    content: str
    intent: str  # "query", "action", "chitchat"
    requested_types: List[str]

class OntologyAwareAgent:
    """
    An AIP-style agent that is constrained by the Summit Graph Schema.
    It cannot 'hallucinate' object types or actions that don't exist in the schema.
    """
    def __init__(self, schema: SummitGraphSchema, tools: List[SummitTool], agent_id: str):
        self.schema = schema
        self.valid_types = {n['label'] for n in schema.nodes}
        self.tools = {t.name: PalantirActionWrapper(t, agent_id) for t in tools}
        self.agent_id = agent_id

    def parse_prompt(self, content: str) -> AgentPrompt:
        """
        Mock NLU: Extracts requested object types from prompt text.
        Simple heuristic: Check if type names appear in text.
        """
        # In reality, this would be an LLM call or NER
        requested = []
        words = content.replace("?", "").replace(".", "").split()

        # Check against schema labels (case-insensitive match for demo)
        schema_map = {t.lower(): t for t in self.valid_types}

        for w in words:
            if w.lower() in schema_map:
                requested.append(schema_map[w.lower()])

        intent = "query"
        if "delete" in content.lower() or "create" in content.lower() or "update" in content.lower():
            intent = "action"

        return AgentPrompt(content, intent, requested)

    def execute(self, content: str, params: dict = None) -> str:
        """
        Main Agent Loop: Parse -> Validate -> Act
        """
        prompt = self.parse_prompt(content)

        # 1. Constraint Check: Are we talking about real things?
        if not prompt.requested_types and prompt.intent == "query":
             # Strict AIP mode: Don't answer generic questions not about the data
             return "I can only answer questions about the Ontology. Please specify an Object Type."

        # 2. Action Execution
        if prompt.intent == "action":
            # Infer tool from content (Mock)
            # "Delete Person X" -> "delete_person"
            action_name = self._infer_action(content)
            if not action_name or action_name not in self.tools:
                 return f"I cannot perform that action. It is not defined in the Ontology."

            tool_wrapper = self.tools[action_name]
            try:
                result = tool_wrapper.execute(params or {})
                return f"Action Complete: {result}"
            except PermissionError as e:
                return f"Action Denied by Policy: {e}"

        # 3. Query Execution (Mock)
        return f"Found {len(prompt.requested_types)} relevant types: {', '.join(prompt.requested_types)}"

    def _infer_action(self, content: str) -> Optional[str]:
        # Simple heuristic mapping for the demo
        if "delete" in content.lower() and "person" in content.lower():
            return "delete_person"
        return None

class ToolFactory:
    """
    Generates dynamic Tool definitions from the Ontology.
    """
    @staticmethod
    def create_tools_from_schema(schema: SummitGraphSchema) -> List[SummitTool]:
        """
        (Placeholder) If schema had embedded actions, we'd extract them here.
        Currently relies on external action lists.
        """
        return []
