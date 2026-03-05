# Repo Reality Check: Generative Interface Runtime

This document records the initial assumptions and paths for the new Generative Interface Runtime (GenUI) based on the project overview.

- **Monorepo Structure**: Expected `packages/agents`, `packages/genui`, `packages/api` etc.
- **GraphQL Schema**: Expected to exist to be extended for `getInterface` query.
- **Frontend Layer**: A rendering layer that supports converting UIBlocks into React/Vue components.
- **Agent Event Bus**: Agents output structured specs that GenUI can intercept and process.
