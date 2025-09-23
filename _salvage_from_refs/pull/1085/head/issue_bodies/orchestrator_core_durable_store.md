### Context
Source: `Orchestration Code Review — Semi-Autonomous Build (v0)`, `SUMMIT_MAESTRO_DELIVERY_PLAN.md`
Excerpt/why: The current system relies on in-memory stores, making it vulnerable to data loss on restart or crash. A durable, transactional store is required for idempotency and fault tolerance, which is a P0 requirement for reliable execution.

### Problem / Goal
The orchestrator lacks a durable persistence layer for its core objects (runs, tasks, events). This prevents crash recovery, reliable task scheduling, and guarantees of idempotency. The goal is to implement a durable store using PostgreSQL.

### Proposed Approach
- Introduce PostgreSQL as the primary data store.
- Define a clear schema for `runs`, `tasks`, and `events` tables, including idempotency keys, status fields, and timestamps.
- Refactor the orchestrator's core logic to use the new Postgres-backed store instead of the current in-memory implementation.
- Implement an outbox pattern for emitting events to ensure at-least-once delivery.

### Tasks
- [ ] Design and finalize the PostgreSQL schema.
- [ ] Set up database migrations to manage schema changes.
- [ ] Implement data access layer (DAL) for `runs`, `tasks`, and `events`.
- [ ] Replace in-memory store with the new PostgreSQL DAL.
- [ ] Add an idempotency key constraint to the `tasks` table.
- [ ] Implement E2E tests for crash/resume scenarios.

### Acceptance Criteria
- Given a task is submitted, when the orchestrator crashes and restarts, then the task is not lost and resumes from its last known state.
- Metrics/SLO: p99 for task state updates < 200ms; resume-from-crash success rate ≥ 99.9%.
- Tests: Unit, integration (with a real Postgres instance), and E2E crash/resume tests must pass.
- Observability: OTEL spans for all DB queries; logs include `run_id` and `task_id`.

### Safety & Policy
- Action class: WRITE
- OPA rule(s) evaluated: N/A for core storage, but downstream actions will be gated.

### Dependencies
- Depends on: None
- Blocks: All other features that require state persistence.

### DOR / DOD
- DOR: Schema design reviewed and approved.
- DOD: Merged, docs updated for new DB dependency, runbook includes backup/restore procedures.

### Links
- Code: `<path/to/orchestrator/core/store>`
- Docs: `<link/to/architecture/diagram>`
