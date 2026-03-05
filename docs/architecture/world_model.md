# Summit World-Model Architecture (SWMA)

**Status:** scaffolded (feature flag: `WORLD_MODEL_ENABLED=false`)
**Evidence:** EVD-WORLD_MODEL-ARCH-001

## Overview

SWMA extends Summit from a retrieval platform into an enterprise planning system
by layering a world-model on top of Self-Flow latent representations and the
existing GraphRAG knowledge graph.

```
Observation Layer        src/connectors/observation_pipeline.ts
       ↓
Representation Layer     src/graphrag/world_model/representation.ts
       ↓
State Model              src/graphrag/world_model/state_model.ts
       ↓
Dynamics Model           src/agents/world_model/dynamics_model.ts
       ↓
Planning Engine          src/agents/planning/simulation_engine.ts
       ↓
Agent Execution          src/agents/world_model/world_model.ts
       ↓
API Layer                src/api/graphql/world_model_resolver.ts
```

## Module Map

| Architecture Layer | Summit Module | Path |
|---|---|---|
| Observation | connectors | `src/connectors/` |
| Representation | graphrag | `src/graphrag/world_model/` |
| State model | graphrag + agents | `src/graphrag/world_model/` |
| Dynamics model | agents | `src/agents/world_model/` |
| Planning engine | agents | `src/agents/planning/` |
| Execution | API layer | `src/api/graphql/` |

## Key Types

- `Observation` — raw enterprise signal (text / image / video / audio / graph)
- `UnifiedStateVector` — Self-Flow latent embedding (number[])
- `WorldState` — KG-anchored enterprise state snapshot
- `AgentAction` — typed enterprise action (deploy_software, launch_campaign, …)
- `RolloutResult` — outcome of a planning simulation

## Eval Targets

| Metric | Target |
|---|---|
| Prediction accuracy | +25% vs baseline |
| Planning success rate | +30% vs baseline |
| RAG grounding | +20% vs baseline |

## Rollback

Disable the feature flag:

```
WORLD_MODEL_ENABLED=false
```

Remove `src/agents/world_model/` and `src/graphrag/world_model/` if full removal
is required.
