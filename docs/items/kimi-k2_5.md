# ITEM: Kimi K2.5 (Moonshot AI)

**Source**: VentureBeat, "Moonshot’s Kimi K2.5 is ‘open,’ 595GB, and built for agent swarms — Reddit wants a smaller one" (Michael Nuñez, January 29, 2026).
**Link**: [VentureBeat Article](https://venturebeat.com/orchestration/moonshots-kimi-k2-5-is-open-595gb-and-built-for-agent-swarms-reddit-wants-a-smaller-one)

## Core Claims

*   **Model Weights**: ~595GB download size; published "modified-mit" (Source: Hugging Face).
*   **Agent Swarm**:
    *   Coordinates up to **100 sub-agents**.
    *   Design enforces **separate sub-agent memory** (prevents context rot).
    *   Coordinator receives bounded summaries/artifacts, not full traces.
    *   Claims up to **4.5× speedup** on tasks.
*   **Operational Issues (AMA)**:
    *   Context rot.
    *   Token budgets.
    *   Prompt governance (identity drift mitigation).
    *   "Personality/taste" drift across releases.

## Verified Facts

*   595GB weights / Hugging Face presence.
*   "Agent swarm" capability advertised.
*   Kimi Linear paper exists (KV-cache reduction).

## Harvested Patterns

*   **Memory Isolation**: Worker memory is separate; coordinator gets bounded outputs.
*   **Test-time Scaling**: Parallelism (swarm) + RL.
*   **Token Governance**: Orchestrator assigns budgets.
*   **Prompt Governance**: Identity drift mitigation.

## Threats / Failure Modes

*   **Usability**: "Open weights but unusable locally" -> Adoption cliff.
*   **Swarm Risks**: Coordinator bottleneck, tool spam, non-determinism, cost blowups.
*   **Identity**: Drift / brand leakage.
