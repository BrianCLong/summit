from typing import Dict, Any, List, Set
from .operators import registry as operator_registry

class EvolutionPolicy:
    def __init__(self, allowed_operators: Set[str] = None):
        # Deny-by-default (ITEM:CLAIM-08)
        self.allowed_operators = allowed_operators or set()
        self.max_steps = 3
        self.max_tokens_added = 2000

    def is_operator_allowed(self, operator_name: str) -> bool:
        return operator_name in self.allowed_operators

    def validate_evolution_step(self, step_count: int, tokens_added: int) -> bool:
        if step_count >= self.max_steps:
            return False
        if tokens_added > self.max_tokens_added:
            return False
        return True

    def authorize_mutation(self, operator_name: str, params: Dict[str, Any]) -> bool:
        if not self.is_operator_allowed(operator_name):
            return False

        # Additional safety checks based on operator type
        if operator_name == "OP_PROMPT_PATCH":
            # Ensure it's a bounded diff
            if "diff" not in params:
                return False

        if operator_name == "OP_TOOL_POLICY_PATCH":
            # Ensure whitelist-only
            if "remove" in params:
                return False

        return True
