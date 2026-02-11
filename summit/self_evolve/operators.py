from .policy import EvolutionOperator

OPERATORS = {
    "OP_PROMPT_PATCH": EvolutionOperator("OP_PROMPT_PATCH", "Bounded prompt modification"),
    "OP_TOOL_POLICY_PATCH": EvolutionOperator("OP_TOOL_POLICY_PATCH", "Whitelist-only tool changes"),
    "OP_MEMORY_SCHEMA_PATCH": EvolutionOperator("OP_MEMORY_SCHEMA_PATCH", "Add-only memory schema changes"),
}
