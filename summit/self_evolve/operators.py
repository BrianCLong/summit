from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class EvolutionOperator:
    name: str
    description: str

class OperatorRegistry:
    def __init__(self):
        self._operators: Dict[str, EvolutionOperator] = {}

    def register(self, op: EvolutionOperator):
        self._operators[op.name] = op

    def get(self, name: str) -> EvolutionOperator:
        if name not in self._operators:
            raise ValueError(f"Operator '{name}' not found.")
        return self._operators[name]

# Define standard operators (ITEM:CLAIM-08)
OP_PROMPT_PATCH = EvolutionOperator(
    name="OP_PROMPT_PATCH",
    description="Bounded diff for system prompt; max N tokens changed."
)

OP_TOOL_POLICY_PATCH = EvolutionOperator(
    name="OP_TOOL_POLICY_PATCH",
    description="Whitelist-only tool policy update."
)

OP_MEMORY_SCHEMA_PATCH = EvolutionOperator(
    name="OP_MEMORY_SCHEMA_PATCH",
    description="Add-only memory schema update."
)

registry = OperatorRegistry()
registry.register(OP_PROMPT_PATCH)
registry.register(OP_TOOL_POLICY_PATCH)
registry.register(OP_MEMORY_SCHEMA_PATCH)
