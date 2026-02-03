# Agent Spec

The `AgentSpec` defines the static configuration of a simulation agent.

## Schema
See `schemas/summit_sim/agent_spec.schema.json`.

## Properties
*   `id`: Unique identifier.
*   `role`: The role of the agent (e.g., "Supporter", "Detractor").
*   `traits`: List of personality traits.
*   `moral_foundations_target`: (Optional) Target scores for MFT.
*   `emotional_climate`: (Optional) Target emotional state.
*   `memory_policy`: (Optional) Configuration for memory/RAG.
*   `tool_policy`: (Optional) Configuration for allowed tools (deny-by-default).
*   `state_machine`: (Optional) Reference to a specific state machine behavior.
