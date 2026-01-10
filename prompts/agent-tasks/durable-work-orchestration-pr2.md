You are implementing PR2 for Durable Work Orchestration in Summit.

Mission

- Extend PR1 by delivering minimal, shippable server-side APIs and service logic for convoys, tasks, hooks, formulas, molecules, and dashboard views.
- Ensure feature-flag gating, tenant scoping, and policy audit events for all mutations.
- Provide deterministic IDs, dependency resolution logic, and formula compilation utilities with tests.

Deliverables

- API routes under `/api/work/*` with CRUD-lite endpoints for convoys, tasks, hooks, formulas, and molecules.
- Work orchestration service with Postgres persistence, policy gate checks, and durable event logging.
- Feature flag entry `durable-work-orchestration` with safe default `false`.
- Unit tests for dependency resolution and formula compilation.
- Update `docs/architecture/durable-work-orchestration.md` and `docs/roadmap/STATUS.json` with current evidence.

Constraints

- Policy-gated operations must record durable events.
- All operations scoped by `tenant_id`.
- Keep PR atomic; do not introduce patrol loops or UI changes.
