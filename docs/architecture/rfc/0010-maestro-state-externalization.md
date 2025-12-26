# RFC 0010: Maestro State Externalization

| Status        | Proposed |
| :---          | :--- |
| **Author**    | Jules |
| **Created**   | 2025-10-26 |
| **Updated**   | 2025-10-26 |
| **Problem**   | [Maestro Scalability & Coupling](2025-Q4-PROBLEM_STATEMENTS.md#1-maestro-orchestrator-scalability--coupling) |

## Context
The current `MaestroService` persists critical operational state (Autonomic Loops, Agent Profiles, Experiments, Playbooks) in a single local JSON file (`maestro_db.json`). While `runs` have been migrated to a database repository, the control plane configuration and "active loop" state remain in this file. This prevents horizontal scaling, creates a single point of failure, and causes race conditions during concurrent updates.

## Options

### Option 1: Full PostgreSQL Migration (Recommended)
Migrate all JSON entities (`loops`, `experiments`, `playbooks`, `agents`) to normalized PostgreSQL tables.
- **Pros**: ACID compliance, join capability with `runs`, leverages existing PG infrastructure, supports horizontal scaling immediately (stateless service).
- **Cons**: Requires schema migration, slightly higher latency for simple reads compared to in-memory cache.
- **Implementation**:
  - Create tables: `maestro_loops`, `maestro_agents`, `maestro_experiments`.
  - Update `MaestroService` to use `knex` or `prisma` repositories instead of `fs`.

### Option 2: Distributed Key-Value Store (Redis)
Move the JSON state to Redis keys (e.g., `maestro:loop:cost-optimization`).
- **Pros**: Very fast reads, supports pub/sub for updates.
- **Cons**: Weaker consistency guarantees, adds Redis dependency for *persistent* data (unless AOF is strictly managed), relational queries (e.g., "Find all failed experiments") are hard.

### Option 3: Event Sourcing
Model all state changes as events in the `ProvenanceLedger` and rebuild state in-memory on startup.
- **Pros**: Perfect audit trail, time-travel debugging.
- **Cons**: High complexity, slow startup time as history grows, eventual consistency challenges for UI.

## Decision
**Recommend Option 1**. The data is relational and configuration-heavy, fitting PostgreSQL well. Redis can be used as a cache layer later if needed.

## Consequences
- `MaestroService` becomes stateless.
- `maestro_db.json` is deprecated.
- Database migrations are required.
