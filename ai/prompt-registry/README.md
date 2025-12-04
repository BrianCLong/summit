# Prompt Registry

## Mission
Centralize governed prompts, safety rails, and evaluation packs for AI-facing services.

## Deliverables
- Typed prompt manifests with metadata (owner, version, guardrails, evaluators).
- Deterministic evaluation harness with auto-generated coverage for prompt changes.
- Contract-first APIs/events for prompt fetch, diff, and rollout notifications.
- Preview environment smoke scripts with rollback-on-regression automation.

## Operating Constraints
- Feature flag: `feature:PROMPT_REGISTRY_ENABLED`; branch: `feat/prompt-registry`.
- No shared databases with application workloads; registry uses isolated storage and signed artifacts.
- Deterministic seeds for prompt evals; store run manifests alongside artifacts.

## CI Gates
- Lint + typecheck for registry schemas and clients.
- Unit + contract tests for prompt APIs and events.
- Playwright coverage for UI flows where applicable.
- Feature-flag assertion via `scripts/ci/feature-flag-gate.js PROMPT_REGISTRY_ENABLED`.

## Preview + Rollback Expectations
- Preview env publishes signed prompt bundles; consumers read from preview endpoints only.
- Rollback hook disables the feature flag and reverts to prior bundle on regression signals.

## Acceptance Readiness
- ≥90% coverage for prompt compilers/evaluators; deterministic snapshots recorded.
- PII/secret scrubbing validated on prompt payloads and logs.
- Typed API/event boundaries documented with no shared database coupling.
