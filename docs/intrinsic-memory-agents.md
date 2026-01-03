# Intrinsic Memory Agents

Intrinsic Memory Agents provide per-agent structured memory that feeds conversation context for multi-agent runs. When enabled, each agent keeps a JSON memory payload that is injected into prompts alongside the initial task and the most recent turns that fit the token budget.

## Enabling

Set the feature flag before starting the service:

- `INTRINSIC_MEMORY_ENABLED=1` to turn on memory construction and per-turn updates.
- `INTRINSIC_MEMORY_TOKEN_BUDGET` (optional) to control the token budget used when selecting recent turns (default: `3200`).
- `INTRINSIC_MEMORY_TEMPLATE=dynamic` (optional) to allow a one-time LLM call to generate a task-specific memory template; otherwise a generic template is used.

With the flag disabled, existing agent execution flows remain unchanged.

## How it works

1. **Context construction**: For each speaking agent, the runner builds context using the initial task description, the agent's current JSON memory, and the newest turns that fit the token budget.
2. **Per-turn memory updates**: After each agent LLM output, a dedicated memory-update prompt asks the model to return updated JSON. Invalid JSON responses fall back to the previous memory.
3. **Template strategy**: By default, a generic template tracks task summary, role focus, requirements, risks, actions, and glossary terms. An optional dynamic template call can tailor the structure to the specific task.

## Costs and tokens

Including structured memory consumes additional context tokens per turn. Tune `INTRINSIC_MEMORY_TOKEN_BUDGET` to balance recall vs. cost, and prefer the generic template when budget is tight.
