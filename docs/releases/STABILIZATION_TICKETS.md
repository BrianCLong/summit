# Stabilization Tickets (Canonical)

This file serves as the canonical registry for MVP-4 Post-GA Stabilization tickets.
It maps deferred items and stabilization commitments to actionable units of work.

## [Stabilization][P0] CI Parity & Smoke Verification
**ID:** STAB-01
**Priority:** P0
**Owner:** UNASSIGNED
**Labels:** stabilization, p0, area/ci, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Achieve full CI parity by successfully running `make ci` and `make smoke` in the CI environment and capturing the logs. This ensures that the CI environment faithfully replicates the local dev environment and acts as a reliable gate.
**Acceptance Criteria:**
- `make ci` passes in CI environment.
- `make smoke` passes in CI environment.
- Logs attached to `docs/release/GA_EVIDENCE_INDEX.md`.

## [Stabilization][P0] Security Baselines & SBOM
**ID:** STAB-02
**Priority:** P0
**Owner:** UNASSIGNED
**Labels:** stabilization, p0, area/security, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Generate and verify all security artifacts to ensure supply chain security compliance.
**Acceptance Criteria:**
- `npm run security:check` passes.
- `npm run generate:sbom` produces valid `sbom.json`.
- `npm run generate:provenance` executes successfully.
- Evidence attached to `docs/release/GA_EVIDENCE_INDEX.md`.

## [Stabilization][P0] Enable pnpm audit in CI
**ID:** STAB-03
**Priority:** P0
**Owner:** UNASSIGNED
**Labels:** stabilization, p0, area/security, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Enable `pnpm audit` in the CI pipeline at critical level to prevent vulnerable dependencies from merging.
**Acceptance Criteria:**
- `pnpm audit --prod --audit-level critical` runs in CI.
- Evidence of run captured.

## [Stabilization][P0] Mitigate Policy Bypass Risk (R-02)
**ID:** STAB-04
**Priority:** P0
**Owner:** UNASSIGNED
**Labels:** stabilization, p0, area/security, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Ensure authz coverage per mutation and verify via governance checks to mitigate Policy Bypass Risk (R-02).
**Acceptance Criteria:**
- All mutations have `@auth` or equivalent checks.
- Governance check (`npm run verify:governance`) passes.

## [Stabilization][P0] Secrets Hygiene Verification (R-04)
**ID:** STAB-05
**Priority:** P0
**Owner:** UNASSIGNED
**Labels:** stabilization, p0, area/security, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Confirm scans and rotation readiness to close secrets hygiene gaps (R-04).
**Acceptance Criteria:**
- Secret scan reveals no active leaks.
- Rotation process is documented/verified.

## [Stabilization][P1] Operational Monitoring & Error Budgets
**ID:** STAB-06
**Priority:** P1
**Owner:** UNASSIGNED
**Labels:** stabilization, p1, area/ops, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Implement error budgets in Prometheus and enforce monitoring cadence.
**Acceptance Criteria:**
- Error budget queries defined in Prometheus/Grafana.
- Alert thresholds configured.
- Monitoring snapshot attached to evidence.

## [Stabilization][P1] Governance Verification & Signed Approvals
**ID:** STAB-07
**Priority:** P1
**Owner:** UNASSIGNED
**Labels:** stabilization, p1, area/governance, needs-owner
**Status:** Backlog
**Dependencies:** STAB-02
**Description:**
Run governance verification and obtain signed GA approvals.
**Acceptance Criteria:**
- `npm run verify:governance` passes.
- `npm run verify:living-documents` passes.
- Signed GA readiness report.

## [Stabilization][P1] Test Reliability & Quarantined Tests
**ID:** STAB-08
**Priority:** P1
**Owner:** UNASSIGNED
**Labels:** stabilization, p1, area/test, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Eradicate quarantined tests and produce 100% pass rate evidence.
**Acceptance Criteria:**
- No tests in quarantine list.
- 100% pass rate for unit and smoke tests.

## [Stabilization][P1] API Determinism Audit
**ID:** STAB-09
**Priority:** P1
**Owner:** UNASSIGNED
**Labels:** stabilization, p1, area/api, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Audit API for determinism failures (R-01) and enforce typed errors.
**Acceptance Criteria:**
- Unhandled 500s removed/handled.
- Typed errors used in core paths.

## [Stabilization][P1] Load Testing Evidence
**ID:** STAB-10
**Priority:** P1
**Owner:** UNASSIGNED
**Labels:** stabilization, p1, area/perf, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Generate load-testing evidence with `k6` in a provisioned environment.
**Acceptance Criteria:**
- `k6` script exists and runs.
- Baseline metrics captured.

## [Stabilization][P1] Integration Tests
**ID:** STAB-11
**Priority:** P1
**Owner:** UNASSIGNED
**Labels:** stabilization, p1, area/test, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Execute integration tests that were deferred.
**Acceptance Criteria:**
- `npm run test:integration` passes (or equivalent suite).
- Evidence captured.

## [Stabilization][P2] Type Safety Audit & Strict Linting
**ID:** STAB-12
**Priority:** P2
**Owner:** UNASSIGNED
**Labels:** stabilization, p2, area/code-quality, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Identify and remove `any` in core paths and run strict linting.
**Acceptance Criteria:**
- `npm run lint:strict` passes or waiver documented.
- `npm run typecheck` passes.

## [Stabilization][P2] Create ADR-009
**ID:** STAB-13
**Priority:** P2
**Owner:** UNASSIGNED
**Labels:** stabilization, p2, area/docs, needs-owner
**Status:** Backlog
**Dependencies:** None
**Description:**
Create ADR-009 for MVP-4 GA decisions.
**Acceptance Criteria:**
- ADR-009 file exists in `docs/adr/`.
- ADR status is accepted/proposed.
