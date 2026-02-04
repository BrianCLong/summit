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
        elif content.startswith("ACTION:"):
            # Internal recursion intent
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

@dataclass
class PlanStep:
    tool: str
    params: dict
    reasoning: str

class CognitiveLoop:
    """
    Advanced AIP Superset: Plan -> Critic -> Execute.
    """
    def __init__(self, agent: OntologyAwareAgent):
        self.agent = agent

    def run_loop(self, prompt: str) -> str:
        # 1. Plan Proposal (Mock LLM)
        plan = self._propose_plan(prompt)

        # 2. Critic Review (Policy Check)
        critique = self._critic_review(plan)
        if critique != "APPROVED":
            return f"Plan Rejected by Critic: {critique}"

        # 3. Hallucination Check
        if not self._verify_entities(plan):
            return "Plan Rejected: Hallucinated Entities Detected."

        # 4. Execution
        results = []
        for step in plan:
            res = self.agent.execute(f"ACTION: {step.tool}", step.params)
            results.append(res)

        return "\n".join(results)

    def _propose_plan(self, prompt: str) -> List[PlanStep]:
        # Mock planner
        if "delete" in prompt.lower():
            return [PlanStep("delete_person", {"target_id": "p1"}, "User asked to delete")]
        return []

    def _critic_review(self, plan: List[PlanStep]) -> str:
        for step in plan:
            if step.tool == "delete_person":
                # Critic enforces reasoning quality (Mock)
                if len(step.reasoning) < 10:
                    return "Reasoning too shallow."
        return "APPROVED"

    def _verify_entities(self, plan: List[PlanStep]) -> bool:
        # Ensure target_ids exist in a real system
        # Here we just pass
        return True

class RecursiveReasoningAgent(OntologyAwareAgent):
    """
    Agents can spawn sub-agents to solve sub-problems.
    """
    def solve_complex(self, problem: str, depth: int = 0) -> str:
        if depth > 3: return "Max recursion depth reached."

        # Decompose problem (Mock)
        if "and" in problem:
            sub_problems = problem.split("and")
            results = []
            for sub in sub_problems:
                # Spawn sub-agent (or recurse)
                res = self.solve_complex(sub.strip(), depth + 1)
                results.append(res)
            return f"Solved parts: {'; '.join(results)}"

        return self.execute(f"ACTION: solve_simple", {"problem": problem})

class ToolSynthesizer:
    """
    Dynamically creates Python tools.
    """
    def synthesize_tool(self, goal: str) -> Callable:
        # Mock synthesis: If goal is "add numbers", return an adder
        if "add" in goal:
            def adder(a: int, b: int) -> int:
                return a + b
            return adder
        return None

class EthicalGovernor:
    """
    Scores thoughts against a Constitution.
    """
    def check_ethics(self, thought: str) -> bool:
        # Mock Constitution
        forbidden = ["steal", "lie", "harm"]
        for f in forbidden:
            if f in thought.lower():
                return False
        return True
