# Sprint Issue Pack — Maestro Conductor Multi-Tenant Hardening + Costed Runs + Partner Ops

**Dates (America/Denver):** Mon Jan 19, 2026 → Fri Jan 30, 2026  
**Theme:** Ship Maestro as a multi-tenant product: isolated, metered, ramp-controlled, and operable as white-label/hosted.  
**Milestone:** `sprint-2026-01-19-maestro-conductor`  
**Prompt (Agent-Native Loop):** `agent-native-loop-n4` — SHA-256 `2fcf3ef5535a5dd116439d1fc8a665e03945e1c6981373895fd9344bd486b658`

## Labels (standardized)

- `area:maestro`
- `area:multitenancy`
- `area:policy`
- `area:finops`
- `area:switchboard`
- `area:security`
- `area:reliability`
- `area:compliance`
- `type:feature`
- `type:test`
- `type:ops`
- `priority:P0` / `priority:P1` / `priority:P2`
- `risk:high` / `risk:med` / `risk:low`
- `ci:pr-quality-gate`

## Owners (default)

- **Jules**: server, policy, provenance, infra, ops
- **Amp**: Switchboard UI (apps/web), connectors (if applicable)

## CI Gates (apply to all issues)

- `pr-quality-gate.yml` (required)
- `scripts/check-boundaries.cjs`
- `scripts/ci/verify-prompt-integrity.ts`
- `scripts/ci/validate-pr-metadata.ts`

---

# Epic 1 — Multi‑Tenant Hard Isolation v1

## Issue 1.1 — Tenant-scoped graph query enforcement

- **Owner:** Jules
- **Estimate:** 6 SP
- **Zone:** `server/`
- **Labels:** `area:multitenancy`, `area:policy`, `type:feature`, `priority:P0`, `risk:high`, `ci:pr-quality-gate`
- **Scope:** Enforce tenant filters for all graph queries; deny + receipt on missing/invalid tenant scope.
- **Acceptance Tests:**
  - Isolation regression suite shows 0 cross-tenant reads/writes.
  - Any missing `tenant_id` returns denial and emits a receipt with policy reason.
- **CI Gates:** unit + integration test suites for server; policy tests.

## Issue 1.2 — Evidence + receipt storage partitioning

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/`
- **Labels:** `area:multitenancy`, `area:compliance`, `type:feature`, `priority:P0`, `risk:high`, `ci:pr-quality-gate`
- **Scope:** Store evidence bundles under tenant partitions; exports must be tenant-scoped only.
- **Acceptance Tests:**
  - Export tests confirm no cross-tenant artifacts.
  - Storage path tests validate tenant prefixing.
- **CI Gates:** server tests; export contract tests.

## Issue 1.3 — Tenant resource guards (quotas/limits)

- **Owner:** Jules
- **Estimate:** 8 SP
- **Zone:** `server/`
- **Labels:** `area:multitenancy`, `area:policy`, `type:feature`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Enforce per-tenant limits (concurrent runs, step throughput, receipt backlog).
- **Acceptance Tests:**
  - Quota breach triggers policy-reasoned denial + receipt.
  - Limits applied per tenant, not global.
- **CI Gates:** server tests; policy tests.

---

# Epic 2 — Metering + FinOps Attribution v1

## Issue 2.1 — Metered events emission

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/`
- **Labels:** `area:finops`, `type:feature`, `priority:P0`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Emit metered events for run/step/approval/receipt/export/storage units.
- **Acceptance Tests:**
  - 100% of metered events include `{tenant_id, env, actor_type, workflow_type}`.
  - Event types match spec: `run_started`, `step_executed`, `approval_decision`, `receipt_emitted`, `evidence_exported`, `storage_bytes_written`.
- **CI Gates:** server tests; contract tests for event schemas.

## Issue 2.2 — Usage aggregation service + API

- **Owner:** Jules
- **Estimate:** 8 SP
- **Zone:** `server/`
- **Labels:** `area:finops`, `type:feature`, `priority:P0`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Implement `GET /tenants/{id}/usage?range=` totals and breakdown by workflow + env.
- **Acceptance Tests:**
  - p95 < 1.5s for last-30-days summary in staging.
  - Response includes totals and breakdown by workflow + environment.
- **CI Gates:** server tests; performance smoke for usage endpoint.

## Issue 2.3 — Cost attribution model

- **Owner:** Jules
- **Estimate:** 8 SP
- **Zone:** `server/`
- **Labels:** `area:finops`, `type:feature`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Map usage to cost buckets (compute proxy, storage GB‑mo, receipt signing ops).
- **Acceptance Tests:**
  - Cost attribution ≥95% accuracy vs staging ground truth.
- **CI Gates:** server tests; staging validation job with evidence artifact.

---

# Epic 3 — Ramps, Kill‑Switches, Freeze Windows

## Issue 3.1 — Ramp controller (tenant/action/workflow)

- **Owner:** Jules
- **Estimate:** 8 SP
- **Zone:** `server/`
- **Labels:** `area:policy`, `type:feature`, `priority:P0`, `risk:high`, `ci:pr-quality-gate`
- **Scope:** Ramp by tenant, action, and workflow type with audited changes.
- **Acceptance Tests:**
  - Ramp allows/denies based on configured percentages.
  - Ramp changes produce receipts with audit trail.
- **CI Gates:** server tests; policy tests.

## Issue 3.2 — Auto-rollback on SLO breach

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/`
- **Labels:** `area:reliability`, `type:feature`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Rollback ramp if p99 error rate >0.5% or receipt backlog > threshold; emit incident.
- **Acceptance Tests:**
  - Triggered rollback reduces ramp and logs incident into Switchboard timeline.
- **CI Gates:** server tests; synthetic SLO breach test.

## Issue 3.3 — Freeze windows + break-glass

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/`
- **Labels:** `area:policy`, `type:feature`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Policy profile freeze windows block privileged ops unless break-glass with receipts.
- **Acceptance Tests:**
  - Freeze blocks privileged ops; break-glass overrides with required receipts.
- **CI Gates:** server tests; policy tests.

---

# Epic 4 — Switchboard Partner/Admin Console v1

## Issue 4.1 — Tenant management (create/assign/quotas)

- **Owner:** Amp
- **Estimate:** 8 SP
- **Zone:** `apps/web/`
- **Labels:** `area:switchboard`, `type:feature`, `priority:P0`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** UI for tenant creation, role catalog assignment, policy profile assignment, quota setting.
- **Acceptance Tests:**
  - Every change emits a config receipt.
  - “Rollback config” action reverts changes and logs receipt.
- **CI Gates:** web tests; API integration tests.

## Issue 4.2 — Usage + cost dashboards + export

- **Owner:** Amp
- **Estimate:** 8 SP
- **Zone:** `apps/web/`
- **Labels:** `area:switchboard`, `area:finops`, `type:feature`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Dashboard for per-tenant usage/cost + CSV/JSON export.
- **Acceptance Tests:**
  - Charts render per-tenant usage/cost from API.
  - Exports limited to tenant scope only.
- **CI Gates:** web tests; export API contract tests.

## Issue 4.3 — Compliance exports (selective disclosure)

- **Owner:** Amp
- **Estimate:** 5 SP
- **Zone:** `apps/web/`
- **Labels:** `area:switchboard`, `area:compliance`, `type:feature`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Admin export workflow honoring selective disclosure + retention policy.
- **Acceptance Tests:**
  - Export respects retention rules and disclosure filters.
- **CI Gates:** web tests; export policy tests.

---

# Epic 5 — Retention, Purge, Dual‑Control Deletes, DR Drill

## Issue 5.1 — Retention policies per tenant

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/`
- **Labels:** `area:compliance`, `area:policy`, `type:feature`, `priority:P0`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Configurable retention rules per tenant with receipted actions.
- **Acceptance Tests:**
  - Retention actions log receipts with policy version.
- **CI Gates:** server tests; policy tests.

## Issue 5.2 — Dual-control delete + purge manifest

- **Owner:** Jules
- **Estimate:** 8 SP
- **Zone:** `server/`
- **Labels:** `area:compliance`, `area:security`, `type:feature`, `priority:P0`, `risk:high`, `ci:pr-quality-gate`
- **Scope:** Two-approver delete with time delay; emit signed purge manifest.
- **Acceptance Tests:**
  - Two distinct actors required; manifest is signed and stored in tenant partition.
- **CI Gates:** server tests; security tests.

## Issue 5.3 — Backup/restore drill validation

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `ops/` + `docs/`
- **Labels:** `area:reliability`, `type:ops`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Restore drill in staging with RTO ≤ 60 min, RPO ≤ 15 min, evidence artifact.
- **Acceptance Tests:**
  - Drill report shows RTO/RPO within targets.
- **CI Gates:** ops validation scripts; evidence artifact check.

## Issue 5.4 — Chaos test for signer + OPA outage

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/` + `tests/`
- **Labels:** `area:reliability`, `type:test`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Simulate signer outage and OPA outage; fail-closed privileged ops; runbook executed.
- **Acceptance Tests:**
  - Privileged ops fail closed; runbook checklist completed with evidence.
- **CI Gates:** chaos test harness; runbook evidence check.

---

# Cross-Cutting Deliverables

## Issue X1 — Policy bundle updates

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `server/`
- **Labels:** `area:policy`, `type:feature`, `priority:P0`, `risk:high`, `ci:pr-quality-gate`
- **Scope:** Tenant isolation, quotas, ramps, freeze, dual-control delete rules.
- **Acceptance Tests:** policy unit tests for allow/deny coverage.

## Issue X2 — Isolation + metering + ramp rollback + DR restore tests

- **Owner:** Jules
- **Estimate:** 8 SP
- **Zone:** `server/` + `tests/`
- **Labels:** `type:test`, `priority:P0`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Regression suite covering isolation, metering correctness, ramp rollback, DR restore validation.
- **Acceptance Tests:** coverage ≥80% on changed modules; tests pass without skips.

## Issue X3 — Dashboards + alerts

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `infra/` + `docs/`
- **Labels:** `area:reliability`, `type:ops`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Dashboards/alerts for per-tenant cost, quota breaches, ramp state, purge queue, restore freshness.
- **Acceptance Tests:** dashboards render with sample data; alert rules validated.

## Issue X4 — Runbooks

- **Owner:** Jules
- **Estimate:** 3 SP
- **Zone:** `docs/`
- **Labels:** `type:ops`, `priority:P1`, `risk:low`, `ci:pr-quality-gate`
- **Scope:** Runbooks for ramp rollback, quota tuning, purge workflow, restore drill, billing discrepancy.
- **Acceptance Tests:** runbooks reviewed for completeness; references to receipts/policy versions included.

## Issue X5 — Packaging (Helm/Terraform) for metering sinks + tenant partitions

- **Owner:** Jules
- **Estimate:** 5 SP
- **Zone:** `helm/` + `terraform/`
- **Labels:** `type:ops`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Values and config updates for metering sinks and per-tenant partitions.
- **Acceptance Tests:** config validation in CI; deploy dry-run passes.

## Issue X6 — Security artifacts (SBOM + attestations + signing gates)

- **Owner:** Jules
- **Estimate:** 3 SP
- **Zone:** `scripts/` + `docs/`
- **Labels:** `area:security`, `type:ops`, `priority:P1`, `risk:med`, `ci:pr-quality-gate`
- **Scope:** Ensure SBOM and signing gates remain enforced; update docs as needed.
- **Acceptance Tests:** SBOM generation and signing verification checks pass.

---

# Demo Checklist (10 minutes)

1. Create tenant in Switchboard → assign policy profile + quotas (receipt generated).
2. Ramp tenant to 10% for a workflow → start runs, observe allow/deny with reasons.
3. Usage dashboard shows runs/steps/receipts/storage + cost estimate.
4. Simulate SLO breach → ramp auto-reduces; incident appears in timeline.
5. Execute dual-control purge → signed purge manifest displayed; tenant-only deletion proven.
6. Restore drill summary confirms RPO/RTO targets.

# Tracking Notes

- **Change classification labels:** `patch`/`minor`/`major` required on PRs.
- **Evidence artifacts:** include test plan outputs and receipts for compliance-critical changes.
- **Owner approvals:** human CODEOWNERS approval required before merge.
