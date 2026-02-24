# Sprint 07 Plan - Switchboard Approvals + Provenance GA (Internal Edition)

## Sprint Frame
- Cadence: 2 weeks
- Theme: Approvals + Provenance GA for Internal Edition
- North Star: Every high-risk action routes through policy simulation -> human rationale -> signed receipt -> ledger -> dashboard visibility
- Primary zone: `docs/` (planning and execution definition)

## Sprint Objective
Ship a production-grade Approvals and Rationale Center with fail-closed governance for privileged actions:
- Mandatory OPA preflight simulation before execution
- Dual-control for critical risk actions
- Signed receipt emission for every privileged action
- Ledger persistence with selective disclosure
- Dashboard visibility for approval SLOs and latency
- Helm and Terraform packaging
- Policy coverage >= 90% of privileged flows

## Capacity and Commit Line
- Assumption: 4 cross-functional squads (UI, policy, ledger, platform)
- Story points planned: 51
- Commit line: 46 points
- Stretch line: 5 points (packaging hardening and evidence automation improvements)

## Epic Breakdown (Jira-Ready)

### Epic SWB-07A - Approvals and Rationale Center (10 pts)
1. SWB-07A-1 (3 pts): Approvals queue and detail pane with sortable risk/tenant/SLA.
2. SWB-07A-2 (2 pts): Structured rationale schema (required) and override rationale capture.
3. SWB-07A-3 (3 pts): Dual-control enforcement for critical risk tier (second approver required).
4. SWB-07A-4 (2 pts): Simulate Again action and execution guard to block stale simulations.

Acceptance criteria:
- No privileged action executes without valid simulation + rationale + signed receipt.
- Critical actions require second approver with independent identity check.
- Timeline reflects new privileged actions immediately after approval.

### Epic SWB-07B - OPA and ABAC Coverage Push (8 pts)
1. SWB-07B-1 (3 pts): Expand role catalog (Admin, Security, Finance, Operator).
2. SWB-07B-2 (3 pts): Add ABAC attributes (tenant risk, environment, data classification, action cost threshold).
3. SWB-07B-3 (2 pts): Simulation CLI and CI gate with policy coverage report.

Acceptance criteria:
- Policy coverage report in CI with >= 90% privileged-flow coverage.
- Pre-merge simulation required on policy-affecting changes.
- Golden regression harness for policy diff behavior.

### Epic SWB-07C - Provenance Ledger v1 (10 pts)
1. SWB-07C-1 (2 pts): Receipt schema v1 frozen + validator.
2. SWB-07C-2 (3 pts): Cosign signer service integration with KID and key resolution.
3. SWB-07C-3 (3 pts): Ledger write path + background flush worker (fail-closed on signer/ledger failures).
4. SWB-07C-4 (2 pts): Selective disclosure API + evidence export (`.tar.gz`).

Acceptance criteria:
- Ledger write latency < 200ms (p95 target path).
- Unsigned privileged actions = 0.
- Receipt verification success = 100% in integration tests.

### Epic SWB-07D - Timeline Integration (3 pts)
1. SWB-07D-1 (2 pts): Emit graph node update + timeline event + receipt reference per approval.
2. SWB-07D-2 (1 pt): Timeline filter (`privileged only`) + receipt drill-down link.

Acceptance criteria:
- Every privileged approval creates timeline event with receipt reference.
- Receipt lookup opens from timeline without manual correlation.

### Epic SWB-07E - Observability and SLO Pack (4 pts)
1. SWB-07E-1 (2 pts): Metrics for simulation time, approval latency, signing latency, dual-control violations, tenant error rate.
2. SWB-07E-2 (2 pts): Grafana dashboard JSON and alert rules.

Acceptance criteria:
- Alerts configured:
  - p95 approval latency > 1.5s (5m window)
  - receipt signing failures
  - unsigned action detection (critical)
  - policy coverage drop < 85%

### Epic SWB-07F - FinOps Attribution for Privileged Flows (3 pts)
1. SWB-07F-1 (1 pt): Cost impact preview before approval.
2. SWB-07F-2 (2 pts): Per-tenant and per-role privileged action cost attribution + dashboard panel.

Acceptance criteria:
- Tenant cost attribution accuracy >= 95%.
- Cost estimate snapshot is embedded in each receipt.

### Epic SWB-07G - Packaging and Deploy (6 pts)
1. SWB-07G-1 (2 pts): Helm updates for OPA bundle mount, signer service, ledger worker, dashboards.
2. SWB-07G-2 (3 pts): Terraform modules for env-scoped KMS, signing roles (least privilege), evidence bucket, alarms.
3. SWB-07G-3 (1 pt): Policy bundle version pinned and shipped with chart.

Acceptance criteria:
- Helm chart versioned and deployable in staging.
- Terraform validates cleanly and provisions principle-of-least-privilege signing path.

### Epic SWB-07H - Validation, Chaos, Runbooks, and Evidence (7 pts)
1. SWB-07H-1 (2 pts): Integration tests for approval -> ledger -> dashboard and selective disclosure retrieval.
2. SWB-07H-2 (2 pts): Chaos tests (signer down, ledger delay) with fail-closed execution block.
3. SWB-07H-3 (2 pts): Evidence automation (schema, bundle version, dashboards, SBOM, SLSA, DR log, perf report).
4. SWB-07H-4 (1 pt): Runbook updates for stuck approvals, signing failure, policy rollback, dual-control override audit.

Acceptance criteria:
- Stage gates all pass with attached evidence artifacts.
- Failure drills produce deterministic remediation evidence.

## Stage Gates and Exit Criteria

### Gate 1 - Spec Ready
- OAS endpoints updated in `docs/contracts/switchboard/openapi-switchboard-approvals-v1.yaml`.
- Receipt schema v1 frozen in `docs/contracts/switchboard/receipt-schema-v1.json`.
- Policy diff reviewed with regression cases linked.
- Acceptance tests written for dual-control and unsigned-action denial.

### Gate 2 - Build Complete
- Unit + integration tests green.
- SBOM generated and attached.
- SLSA attestation attached to build artifacts.

### Gate 3 - Provenance Complete
- Cosign verification passes on emitted receipts.
- Evidence bundle export verifies locally and in CI.
- Selective disclosure redaction/field-release tests pass.

### Gate 4 - Operate Ready
- Dashboards deployed in staging.
- Alerts tested with synthetic triggers.
- Runbook updated at `RUNBOOKS/switchboard-approvals-provenance-ga.md` and reviewed by on-call owner.

### Gate 5 - Package Ready
- Helm chart version bumped and release-noted.
- Terraform plan/apply validated in staging workspace.
- Seed data updated and white-label compatibility checked.

## Test Plan (Execution Contract)

### Unit
- Policy simulation edge cases across risk tiers and role catalog.
- Receipt schema validation including required fields and hash consistency.
- Signature verification and KID resolution tests.

### Integration
- End-to-end approval path: simulate -> rationale -> dual-approval (if critical) -> sign -> ledger -> timeline -> dashboard.
- Selective disclosure retrieval with allowed and denied fields.
- Cost attribution persistence and query path checks.

### Chaos
- Stop signer service and validate privileged action denial.
- Inject ledger write delay and validate timeout/fail-closed behavior.

## MAESTRO Security Alignment
- MAESTRO layers: Foundation, Data, Agents, Tools, Infra, Observability, Security
- Threats considered: prompt injection into rationale text, policy bypass attempts, signer service abuse, receipt tampering, replay of approval artifacts, cross-tenant leakage in selective disclosure
- Mitigations:
  - policy-as-code enforced preflight for all privileged actions
  - dual-control for critical tier
  - signed receipts with KID and immutable ledger reference
  - fail-closed behavior on signer/ledger degradation
  - per-tenant authorization checks for disclosure exports
  - explicit SLO/alerting for unsigned-action detection

## Dependencies and Critical Path
1. Freeze receipt schema + OAS contract first (unblocks signer, API, dashboard contracts).
2. Deliver simulation + coverage CLI and CI gate (unblocks safe execution flow).
3. Land signer + ledger path before UI rollout (prevents unsafe toggle-only launch).
4. Ship dashboards/alerts before staging sign-off (gate for Operate Ready).
5. Complete Helm/Terraform packaging and runbook updates before Package Ready.
6. Dependency matrix source of truth: `docs/sprints/sprint_07_dependency_matrix.md`.

## Demo Narrative (Sprint Review)
1. Create privileged action (delete production dataset).
2. Show policy simulation returns `Critical`.
3. Enter structured rationale and request dual approval.
4. Complete second approval.
5. Emit and verify signed receipt.
6. Show timeline event with receipt link and privileged filter.
7. Show dashboard latency and cost attribution update.
8. Export evidence bundle and verify receipt signature.

## Required Sprint Artifacts
- `docs/contracts/switchboard/receipt-schema-v1.json`
- `policy-bundle-version.txt`
- `dashboards/switchboard-approvals.json`
- `sbom.json`
- `slsa-attestation.intoto.jsonl`
- `dr-test-log.md`
- `benchmarks/approval-flow.md`
- Bundle manifest index: `docs/evidence/sprint-07/README.md`

## Verification Commands (for the sprint close checklist)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `make smoke`
- `node scripts/check-boundaries.cjs`

Targeted new/owned checks introduced in this sprint:
- `pnpm policy:simulate --all-privileged`
- `pnpm policy:coverage:report`
- `node scripts/ci/switchboard-policy-coverage-gate.mjs --input docs/contracts/switchboard/examples/policy-coverage-sample.json --threshold 90`
- `pnpm provenance:verify-receipts`
- `pnpm switchboard:perf:approval-flow`

## Out of Scope
- External customer GA release (this sprint is Internal Edition GA only).
- New billing monetization workflows beyond attribution and preview.
- Non-privileged action UI redesign.

## Changelog Stub (End of Sprint)
- Approvals and Rationale Center GA (Internal)
- Receipt schema v1 with cosign signing
- OPA privileged flow coverage >= 90%
- Privileged action cost attribution in dashboard
- Dashboard and alerts pack shipped
- Helm and Terraform packaging completed
