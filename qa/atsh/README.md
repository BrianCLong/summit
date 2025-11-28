# ATSH Quality Harness

## Mission
Deliver an autonomous test safety harness (ATSH) that stress-tests resilience paths, red-team regressions, and enforces deterministic outcomes for QA-critical services.

## Deliverables
- Scenario packs for adversarial, chaos, and compliance runs with seeded fixtures.
- Typed contract probes for GraphQL/REST endpoints and event topics.
- Golden trace baselines with log/metric/trace scrubbing for PII and secrets.
- Preview-environment smoke flows with auto-rollback hooks triggered on regression signals.

## Operating Constraints
- Feature flag: `feature:ATSH_ENABLED` default **off** in shared environments; branch: `feat/atsh`.
- No shared databases across test actors; rely on ephemeral datasets per run.
- Deterministic seeds are mandatory for replay; capture in run metadata.

## CI Gates
- Lint + typecheck (`pnpm lint`, `pnpm typecheck`).
- Unit + contract tests (`pnpm test:unit`, `pnpm run test:policy` where applicable).
- Playwright e2e smoke on the preview environment with roll-forward/rollback decisioning.
- Feature-flag assertion via `scripts/ci/feature-flag-gate.js ATSH_ENABLED`.

## Preview + Rollback Expectations
- Preview namespaces created per PR with downstream data fixtures.
- Health and regression signals gate promotion; rollback hook wired to `scripts/preview-local.sh cleanup`.

## Acceptance Readiness
- ≥90% coverage for harness-generated modules with mutation or property tests.
- Logs and traces show no raw PII; redact-at-source enforced.
- Replay reports emitted to `artifacts/qa/atsh` with deterministic seeds and dependency manifest.
