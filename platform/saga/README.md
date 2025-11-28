# Saga Orchestration Platform

## Mission
Deliver a platform-grade saga orchestrator for cross-service workflows with typed events, compensating actions, and bounded retries.

## Deliverables
- Typed workflow definitions with contract-first events and compensations.
- Idempotent command handlers with circuit breakers and backoff policies.
- Observability overlays (traces, metrics, structured logs) per saga step with correlation IDs.
- Preview environment promotion plan with automated rollback on invariant breaks.

## Operating Constraints
- Feature flag: `feature:SAGA_ENABLED`; branch: `feat/saga`.
- No shared databases across services; sagas coordinate through events and idempotent stores.
- Deterministic replay seeds for chaos drills and auditability.

## CI Gates
- Lint + typecheck for orchestrator packages.
- Unit + contract test matrix for sagas and compensations.
- Playwright/API end-to-end checks on the preview environment.
- Feature-flag guardrail: `scripts/ci/feature-flag-gate.js SAGA_ENABLED`.

## Preview + Rollback Expectations
- Preview namespaces per PR with seeded queues/topics.
- Rollback hook triggers compensations and tears down preview resources on failure signals.

## Acceptance Readiness
- Deterministic saga runs with sealed state transitions and explicit DLQ handling.
- ≥90% coverage for workflow libraries; contract diffs published per PR.
- PII redaction verified in saga payload logging.
