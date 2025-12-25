# Resolver Inventory & Persistence Plan

## Resolver Inventory

### Golden Path Resolvers

| Domain | Resolver | Type | Backing Service | Notes |
|Orchestrator| `copilotRun`, `copilotEvents`, `startCopilotRun` | Real | `CopilotOrchestrator` (Postgres) | Uses BullMQ for async execution. |
| Graph Ops | `expandNeighbors`, `expandNeighborhood` | Real | `GraphOpsService` (Neo4j) | Uses Redis for caching/locking. |
| AI | `suggestLinks`, `detectAnomalies` | Real | Neo4j / GNNService | GNNService might be using heuristics or external model. |
| Entities | `searchEntities` | Real | Neo4j (Fulltext) | |
| Auth | `login`, `me` (assumed) | Real | `AuthService` (Postgres) | |

### "Demo" Resolvers
No purely "mock" resolvers found in `graphops` or `ai` modules. `CopilotOrchestrator` implementation might mock LLM calls internally if configured (not visible in resolver layer).

## Persistence Plan

### Current State
- **Neo4j**: Stores Entities, Relationships, Investigations.
- **PostgreSQL**: Stores Users, Auth, Audit Logs, Copilot Runs/Events.
- **Redis**: Caching, Pub/Sub, Rate Limiting, BullMQ.

### Migration Strategy
- Neo4j Migrations: Managed by `scripts/migrate.ts` (Cypher).
- Postgres Migrations: Managed by `prisma` or `knex` (needs verification). `server/package.json` has `db:pg:migrate`.

### Persistence Slice Proposal (Golden Path)
For the "Golden Path" E2E to be robust:
1.  **Seed Data**: Use `scripts/seed-golden-path.ts` to ensure known entities exist.
2.  **State Reset**: Before each E2E run, reset DBs to clean state (using seed script `SEED_CLEAR=true`).
3.  **Isolation**: Use tenant isolation (`tenant_golden`) to avoid conflict with other tests if running in shared env.

## Risks
- **Flaky Tests**: If async jobs (Copilot) take too long. mitigation: Mock Copilot for UI tests, or use long timeouts.
- **Data Cleanup**: `TRUNCATE` might be dangerous in production. Ensure seed script only runs in `test`/`dev`.
