# GA Game-Day Remediation Plan

## Phase 1 & 2: Game-Day Findings Ledger (Normalized & Scored)

| ID | Scenario/Category | Gap Class | Status | Severity | Priority | Description | Owner |
|---|---|---|---|---|---|---|---|
| GD-01 | Identity & Access (SSO) | OWNERSHIP | Not started | S0 | P0 | Implement OIDC flow end-to-end, optional SAML; SCIM support; RBAC/group mapping; tenant-boundary checks. | Platform + Security |
| GD-02 | Browser Support Matrix | PROCESS | Partial | S2 | P1 | Clarify 'Comet' (likely Edge). Stand up matrix doc + E2E grid; Tor mode constraints documented. | Frontend QA |
| GD-03 | Evidence Immutability (WORM) | PROCESS | Not started | S0 | P0 | Provision bucket(s) with Object Lock + KMS; enforce upload from CI only; retention table by artifact type. | Platform |
| GD-04 | Data Residency / Route Pins | PROCESS | Planned | S3 | P2 | Define region tags in data model; OPA policies; optional regional storage targets; customer-facing controls. | Platform + Data |
| GD-05 | On-call & Escalation | OWNERSHIP | Not started | S0 | P0 | Create rotation & schedules; alert routes; runbooks per alert; severity matrix; SEV drills. | Ops |
| GD-06 | Router Decision Transparency | SIGNAL | Delivered | S2 | P1 | Add export-to-audit, override + rollback, fairness flags, drift/change detection. | Frontend + Policy |
| GD-07 | Serving Lane Metrics (vLLM/Ray) | SIGNAL | Partial | S2 | P1 | Add GPU/CPU metrics, saturation & tail-latency charts; autoscale policy hooks; SLO-based alerts. | Platform + Observability |
| GD-08 | Evidence Panel (Supply Chain) | SIGNAL | Partial | S0 | P0 | Wire PR gates to attestations; DSSE bundle validation; immutability storage; diff viewer for SBOM changes. | Security + Platform |
| GD-09 | Prometheus Alerts & Runbooks | SIGNAL | Delivered | S2 | P1 | Tune thresholds; add blackbox/synthetic probes; tenant-aware cost guard thresholds; paging policy review. | Observability |
| GD-10 | NL→Cypher Sandbox & Cost Preview | PROCESS | Delivered | S0 | P0 | Threat-model & red-team coverage; rate-limit tokens per tenant; OPA policy for disallowed patterns. | Security + Data |
| GD-11 | Canary & Rollback Automation | PROCESS | Partial | S0 | P0 | Define numeric SLO gates; wire to Argo analysis templates; rollback runbook & smoke tests. | Platform |
| GD-12 | Multi-tenant RBAC & OPA | OWNERSHIP | Partial | S0 | P0 | Define roles, permissions matrix; author Rego policies; policy-as-code tests in CI. | Security + Backend |
| GD-13 | API & Docs (OpenAPI) | DOC | Partial | S2 | P1 | Publish docs site; SDK generation; deprecation/versioning; request/response examples. | DX/Docs |
| GD-14 | SDKs (TS/Python) | DOC | Partial | S2 | P1 | Fix engines, workspace names; add Python client; publish to npm/PyPI with CI. | SDK Team |
| GD-15 | Trace Correlation (OTel) | SIGNAL | Not started | S2 | P1 | Instrument with OTel; propagate trace IDs; add UI deep links to Grafana/Tempo/Loki. | Observability + Frontend |
| GD-16 | Billing, Budgets & Quotas | PROCESS | Partial | S0 | P0 | Budget enforcement, per-tenant quotas; usage export; anomaly detection. | Platform + Finance |
| GD-17 | SOC2/ISO Evidence Pack | PROCESS | Not started | S0 | P0 | Author PR templates; GitHub Action verifies attachments/links; store in WORM. | Compliance |
| GD-18 | Data Lifecycle & Retention | PROCESS | Not started | S2 | P1 | Define retention matrix; implement TTL; backup encryption & immutability; restore drills. | Data + Security |
| GD-19 | Disaster Recovery (DR/BCP) | PROCESS | Not started | S0 | P0 | Define DR plan; warm/cold standby; replication; quarterly failover test. | Ops |
| GD-20 | Model Gateways Coverage | PROCESS | Partial | S2 | P1 | Catalog providers; add health checks & fallback rules; provider outage drills. | Platform |
| GD-21 | Eval/Benchmark Harness | PROCESS | Not started | S2 | P1 | Stand up eval suite; curate datasets; tie to routing policy updates w/ approvals. | ML Ops |
| GD-22 | Audit Logging | SIGNAL | Not started | S0 | P0 | Central audit bus; signed logs; export to SIEM; retention. | Security |
| GD-23 | Privacy & Legal Readiness | PROCESS | Not started | S2 | P1 | Draft DPA/ToS; DSAR runbook; PII tagging; provider agreements stored. | Legal + Security |
| GD-24 | Offline/Edge Kits | PROCESS | Planned | S3 | P2 | Define kit profiles; packaging; sync & provenance merge; offline licensing. | Platform |
| GD-25 | Accessibility (WCAG 2.1 AA) | PROCESS | Partial | S2 | P1 | Fix Node/pnpm engine issues; add a11y CI; remediate violations. | Frontend |
| GD-26 | Service Level Objectives (SLOs) | SIGNAL | Not started | S0 | P0 | Adopt SLOs for latency, reliability, cost; burn-rate alerts; weekly review. | Ops |
| GD-27 | Secrets & Config Management | PROCESS | Not started | S0 | P0 | Select tool; migrate secrets; CI policy to prevent plaintext; drift alerts. | Security + Platform |
| GD-28 | Backups & Encryption | PROCESS | Not started | S0 | P0 | KMS keys; snapshot cadence; quarterly restore drill; key rotation policy. | Ops + Security |
| GD-29 | Feature Flags & Safe Launch | PROCESS | Not started | S2 | P1 | Wire flag service; rollout controls; telemetry for adoption. | Platform + Frontend |
| GD-30 | GA Gates PR Template & Checks | PROCESS | Not started | S0 | P0 | Create issue with subtasks, owners, acceptance criteria; add PR checklist & CI validator. | Release Mgmt |

## Phase 3: Remediation Cards

---
### [GA Game-Day][GD-01] Identity & Access (SSO)
**Problem:** Current state: Target IdPs identified: Auth0/Azure/Google. No certified integration yet. Requirement: OIDC/SAML SSO with Okta/Auth0/Azure AD + Google; group→RBAC mapping; MFA; SCIM user lifecycle; JIT provisioning.

**Trigger:** Q&A: 'Auth0/azure/google' selected.
**Expected Behavior:** Login via each IdP works; roles mapped; SCIM sync passes; unit/integration tests; rollback path documented.
**Proposed Remediation:** Implement OIDC flow end-to-end, optional SAML; SCIM support; RBAC/group mapping; tenant-boundary checks.
**Closure Criteria:** Login via each IdP works; roles mapped; SCIM sync passes; unit/integration tests; rollback path documented.
**Owner:** Platform + Security

---
### [GA Game-Day][GD-02] Browser Support Matrix
**Problem:** Current state: Target list provided: Chrome, Comet(?), Safari, Firefox, Tor. Requirement: Publish and certify support matrix; automated cross-browser E2E; a11y baseline; graceful degradation.

**Trigger:** Q&A: 'chrome, comet, safari, firefox, tor'
**Expected Behavior:** Matrix published in docs; playwright grid CI green; known-issues list for Tor.
**Proposed Remediation:** Clarify 'Comet' (likely Edge). Stand up matrix doc + E2E grid; Tor mode constraints documented.
**Closure Criteria:** Matrix published in docs; playwright grid CI green; known-issues list for Tor.
**Owner:** Frontend QA

---
### [GA Game-Day][GD-03] Evidence Immutability (WORM)
**Problem:** Current state: Recommendation requested; not configured. Requirement: S3 Object Lock (compliance mode), KMS encryption, retention policy, lifecycle & access policy for evidence artifacts.

**Trigger:** Q&A: 'Your recommendation'
**Expected Behavior:** Bucket policy & Object Lock verified; test write/delete blocked under compliance mode; runbooks updated.
**Proposed Remediation:** Provision bucket(s) with Object Lock + KMS; enforce upload from CI only; retention table by artifact type.
**Closure Criteria:** Bucket policy & Object Lock verified; test write/delete blocked under compliance mode; runbooks updated.
**Owner:** Platform

---
### [GA Game-Day][GD-04] Data Residency / Route Pins
**Problem:** Current state: No constraints at this time. Requirement: Per-tenant data region pinning optional; policies and artifact storage localization; future-ready design.

**Trigger:** Q&A: 'not at this time'
**Expected Behavior:** Region tag propagates through storage, compute, evidence; e2e policy test passes.
**Proposed Remediation:** Define region tags in data model; OPA policies; optional regional storage targets; customer-facing controls.
**Closure Criteria:** Region tag propagates through storage, compute, evidence; e2e policy test passes.
**Owner:** Platform + Data

---
### [GA Game-Day][GD-05] On-call & Escalation
**Problem:** Current state: Owners: 'You and me'. Details not formalized. Requirement: PagerDuty rotation, RACI, GA on-call runbook, incident comms templates, postmortem process.

**Trigger:** Q&A: 'Who owns on-call... You and me.'
**Expected Behavior:** PagerDuty live; mock SEV drill successful; runbooks linked in alerts; comms templates in repo.
**Proposed Remediation:** Create rotation & schedules; alert routes; runbooks per alert; severity matrix; SEV drills.
**Closure Criteria:** PagerDuty live; mock SEV drill successful; runbooks linked in alerts; comms templates in repo.
**Owner:** Ops

---
### [GA Game-Day][GD-07] Serving Lane Metrics (vLLM/Ray)
**Problem:** Current state: qDepth/batch/kvHit implemented; panel live. Requirement: Operational KPIs incl. qDepth, batch size, KV hit, throughput, GPU/CPU util, autoscale signals, SLA alerts.

**Trigger:** API: GET /serving/metrics; UI panel 'Serving Lane'
**Expected Behavior:** GPU/CPU metrics visible; alert fires on SLO breach; autoscale policy exercised in staging.
**Proposed Remediation:** Add GPU/CPU metrics, saturation & tail-latency charts; autoscale policy hooks; SLO-based alerts.
**Closure Criteria:** GPU/CPU metrics visible; alert fires on SLO breach; autoscale policy exercised in staging.
**Owner:** Platform + Observability

---
### [GA Game-Day][GD-08] Evidence Panel (Supply Chain)
**Problem:** Current state: Evidence endpoint returns sbom/cosign/slsa; UI polished. Requirement: Display SBOM, cosign/SLSA attestations; enforce signature verification; quarantine unverified artifacts.

**Trigger:** API: GET /runs/:id/evidence
**Expected Behavior:** PR blocked on missing/invalid attestation; SBOM diff rendered; artifacts archived WORM.
**Proposed Remediation:** Wire PR gates to attestations; DSSE bundle validation; immutability storage; diff viewer for SBOM changes.
**Closure Criteria:** PR blocked on missing/invalid attestation; SBOM diff rendered; artifacts archived WORM.
**Owner:** Security + Platform

---
### [GA Game-Day][GD-11] Canary & Rollback Automation
**Problem:** Current state: Canary strategy in prod values; criteria not finalized. Requirement: Argo Rollouts with automated victory/abort criteria tied to SLOs; one-click rollback.

**Trigger:** deploy/prod/values.yaml
**Expected Behavior:** Canary auto-promotes/aborts based on metrics; rollback tested during game day.
**Proposed Remediation:** Define numeric SLO gates; wire to Argo analysis templates; rollback runbook & smoke tests.
**Closure Criteria:** Canary auto-promotes/aborts based on metrics; rollback tested during game day.
**Owner:** Platform

---
### [GA Game-Day][GD-12] Multi-tenant RBAC & OPA
**Problem:** Current state: UI supports RBAC; backend policy details unclear. Requirement: Role model with tenant & environment scoping; OPA bundles; policy tests.

**Trigger:** UI delivery notes
**Expected Behavior:** OPA bundles versioned; policy test suite green; least-privilege verified in staging.
**Proposed Remediation:** Define roles, permissions matrix; author Rego policies; policy-as-code tests in CI.
**Closure Criteria:** OPA bundles versioned; policy test suite green; least-privilege verified in staging.
**Owner:** Security + Backend

---
### [GA Game-Day][GD-13] API & Docs (OpenAPI)
**Problem:** Current state: Core & orchestration OpenAPI present. Requirement: Complete OpenAPI; published docs; deprecation policy; examples & quickstarts.

**Trigger:** intelgraph-core-api.yaml; maestro-orchestration-api.yaml
**Expected Behavior:** Docs site published; SDKs generated; versioning policy documented.
**Proposed Remediation:** Publish docs site; SDK generation; deprecation/versioning; request/response examples.
**Closure Criteria:** Docs site published; SDKs generated; versioning policy documented.
**Owner:** DX/Docs

---
### [GA Game-Day][GD-14] SDKs (TS/Python)
**Problem:** Current state: TS SDK present; pnpm engine and workspace issues observed. Requirement: Typed SDKs for TS & Python; semantic versioning; CI publish; engine compatibility.

**Trigger:** pnpm logs showing Node engine mismatch & package name issues
**Expected Behavior:** npm & PyPI packages install cleanly; examples compile; semver policy enforced.
**Proposed Remediation:** Fix engines, workspace names; add Python client; publish to npm/PyPI with CI.
**Closure Criteria:** npm & PyPI packages install cleanly; examples compile; semver policy enforced.
**Owner:** SDK Team

---
### [GA Game-Day][GD-15] Trace Correlation (OTel)
**Problem:** Current state: Not described. Requirement: Correlate runs/nodes with logs/traces/metrics; deep links in UI.

**Trigger:** —
**Expected Behavior:** From a run, open trace; logs show correlated trace/span IDs.
**Proposed Remediation:** Instrument with OTel; propagate trace IDs; add UI deep links to Grafana/Tempo/Loki.
**Closure Criteria:** From a run, open trace; logs show correlated trace/span IDs.
**Owner:** Observability + Frontend

---
### [GA Game-Day][GD-16] Billing, Budgets & Quotas
**Problem:** Current state: Cost guard alerts exist; preview in NL→Cypher. Requirement: Per-tenant budgets; hard/soft limits; cost preview & kill; invoice/export.

**Trigger:** Prometheus rules; NL→Cypher preview
**Expected Behavior:** Budget breach halts workloads per policy; monthly usage export delivered.
**Proposed Remediation:** Budget enforcement, per-tenant quotas; usage export; anomaly detection.
**Closure Criteria:** Budget breach halts workloads per policy; monthly usage export delivered.
**Owner:** Platform + Finance

---
### [GA Game-Day][GD-17] SOC2/ISO Evidence Pack
**Problem:** Current state: Requested: GA Gates PR template with evidence requirement. Requirement: Control mapping; PR template requiring evidence attachments; CI checks.

**Trigger:** Ask to create GA Gates issue & PR templates
**Expected Behavior:** PRs blocked without evidence; auditor trail available in S3 Object Lock.
**Proposed Remediation:** Author PR templates; GitHub Action verifies attachments/links; store in WORM.
**Closure Criteria:** PRs blocked without evidence; auditor trail available in S3 Object Lock.
**Owner:** Compliance

---
### [GA Game-Day][GD-18] Data Lifecycle & Retention
**Problem:** Current state: Not described. Requirement: Retention schedules; PII minimization; backup/restore; deletion workflows.

**Trigger:** —
**Expected Behavior:** Backups verified; restore RTO/RPO met; data deletion request succeeds.
**Proposed Remediation:** Define retention matrix; implement TTL; backup encryption & immutability; restore drills.
**Closure Criteria:** Backups verified; restore RTO/RPO met; data deletion request succeeds.
**Owner:** Data + Security

---
### [GA Game-Day][GD-19] Disaster Recovery (DR/BCP)
**Problem:** Current state: Not described. Requirement: RTO/RPO targets; secondary region; game days; documented procedures.

**Trigger:** —
**Expected Behavior:** Failover test meets RTO/RPO; runbook published.
**Proposed Remediation:** Define DR plan; warm/cold standby; replication; quarterly failover test.
**Closure Criteria:** Failover test meets RTO/RPO; runbook published.
**Owner:** Ops

---
### [GA Game-Day][GD-20] Model Gateways Coverage
**Problem:** Current state: Router suggests multi-provider; full coverage unclear. Requirement: OpenAI, Anthropic, Google, local (vLLM), and vendor-specific agents; fallback policies.

**Trigger:** Routing panel & candidates
**Expected Behavior:** Outage drill routes traffic per policy; no SLO breach.
**Proposed Remediation:** Catalog providers; add health checks & fallback rules; provider outage drills.
**Closure Criteria:** Outage drill routes traffic per policy; no SLO breach.
**Owner:** Platform

---
### [GA Game-Day][GD-21] Eval/Benchmark Harness
**Problem:** Current state: Candidate scores exist; no full eval harness noted. Requirement: Offline evals, golden sets, regression dashboards; auto impact on router weights.

**Trigger:** Router candidates & scores
**Expected Behavior:** Weekly eval run; diff report; policy update PR with approvals.
**Proposed Remediation:** Stand up eval suite; curate datasets; tie to routing policy updates w/ approvals.
**Closure Criteria:** Weekly eval run; diff report; policy update PR with approvals.
**Owner:** ML Ops

---
### [GA Game-Day][GD-22] Audit Logging
**Problem:** Current state: Not described. Requirement: Immutable audit for authz changes, router overrides, dataset access, exports.

**Trigger:** —
**Expected Behavior:** All privileged ops appear in audit; tamper-evident; queries for investigations.
**Proposed Remediation:** Central audit bus; signed logs; export to SIEM; retention.
**Closure Criteria:** All privileged ops appear in audit; tamper-evident; queries for investigations.
**Owner:** Security

---
### [GA Game-Day][GD-23] Privacy & Legal Readiness
**Problem:** Current state: Not described. Requirement: DPA/ToS; DSAR process; PII handling & masking; model provider DPAs.

**Trigger:** —
**Expected Behavior:** Signed DPAs; DSAR test completed; PII masks in logs/UI.
**Proposed Remediation:** Draft DPA/ToS; DSAR runbook; PII tagging; provider agreements stored.
**Closure Criteria:** Signed DPAs; DSAR test completed; PII masks in logs/UI.
**Owner:** Legal + Security

---
### [GA Game-Day][GD-24] Offline/Edge Kits
**Problem:** Current state: Aspirational requirement. Requirement: Portable kits with provenance, policy bundles, and local inference (optional).

**Trigger:** Program background
**Expected Behavior:** Edge kit built & tested in lab; provenance sync round-trips.
**Proposed Remediation:** Define kit profiles; packaging; sync & provenance merge; offline licensing.
**Closure Criteria:** Edge kit built & tested in lab; provenance sync round-trips.
**Owner:** Platform

---
### [GA Game-Day][GD-25] Accessibility (WCAG 2.1 AA)
**Problem:** Current state: Focus traps done; axe-playwright add attempted, errors blocked install. Requirement: Axe/Playwright tests; keyboard nav; contrast; screen reader labels.

**Trigger:** pnpm logs; UI notes
**Expected Behavior:** Axe tests < 5 minor issues; no critical violations; docs updated.
**Proposed Remediation:** Fix Node/pnpm engine issues; add a11y CI; remediate violations.
**Closure Criteria:** Axe tests < 5 minor issues; no critical violations; docs updated.
**Owner:** Frontend

---
### [GA Game-Day][GD-26] Service Level Objectives (SLOs)
**Problem:** Current state: Alerts exist; formal SLOs not documented. Requirement: Define SLOs & error budgets; publish to Ops; dashboards & burn alerts.

**Trigger:** Prometheus rules delivery
**Expected Behavior:** SLO doc published; burn alerts active; weekly report generated.
**Proposed Remediation:** Adopt SLOs for latency, reliability, cost; burn-rate alerts; weekly review.
**Closure Criteria:** SLO doc published; burn alerts active; weekly report generated.
**Owner:** Ops

---
### [GA Game-Day][GD-27] Secrets & Config Management
**Problem:** Current state: Not described. Requirement: Centralized secrets (Vault/SOPS), KMS envelopes; config drift detection.

**Trigger:** —
**Expected Behavior:** No plaintext secrets in repos; access via IAM; audit trail complete.
**Proposed Remediation:** Select tool; migrate secrets; CI policy to prevent plaintext; drift alerts.
**Closure Criteria:** No plaintext secrets in repos; access via IAM; audit trail complete.
**Owner:** Security + Platform

---
### [GA Game-Day][GD-28] Backups & Encryption
**Problem:** Current state: Not described. Requirement: Encrypted-at-rest & in-transit; backup schedule; periodic restore tests.

**Trigger:** —
**Expected Behavior:** Restore test pass; keys rotated; CIS benchmarks met.
**Proposed Remediation:** KMS keys; snapshot cadence; quarterly restore drill; key rotation policy.
**Closure Criteria:** Restore test pass; keys rotated; CIS benchmarks met.
**Owner:** Ops + Security

---
### [GA Game-Day][GD-29] Feature Flags & Safe Launch
**Problem:** Current state: Not described. Requirement: Feature flags for risky features; dark launch; progressive exposure.

**Trigger:** —
**Expected Behavior:** Flags in repo; dark launch executed; rollback by flag works.
**Proposed Remediation:** Wire flag service; rollout controls; telemetry for adoption.
**Closure Criteria:** Flags in repo; dark launch executed; rollback by flag works.
**Owner:** Platform + Frontend

---
### [GA Game-Day][GD-30] GA Gates PR Template & Checks
**Problem:** Current state: Requested explicitly; not yet posted. Requirement: Single GA Gates issue; PR template requiring evidence links; CI check.

**Trigger:** Directive to create 'GA Gates' issue & PR templates
**Expected Behavior:** Issue live; PRs blocked without checked gates; evidence verified.
**Proposed Remediation:** Create issue with subtasks, owners, acceptance criteria; add PR checklist & CI validator.
**Closure Criteria:** Issue live; PRs blocked without checked gates; evidence verified.
**Owner:** Release Mgmt

## Phase 4: Remediation Execution Order (Top 5)

1. **[P0/S0]** SIGNAL - Evidence Panel (Supply Chain) (GD-08)
2. **[P0/S0]** SIGNAL - Audit Logging (GD-22)
3. **[P0/S0]** SIGNAL - Service Level Objectives (SLOs) (GD-26)
4. **[P0/S0]** OWNERSHIP - Identity & Access (SSO) (GD-01)
5. **[P0/S0]** OWNERSHIP - On-call & Escalation (GD-05)

## Phase 5: Handoff Prompts

### Claude Code UI Prompt (Script/CI)
```markdown
Refactor the CI pipeline to enforce GA gates.
1. Read `docs/maestro/issue_ga_maestro_ui_close_all_ga_gaps_final.md` for requirements.
2. Implement the `enforce-ga-gates` workflow.
3. Verify with a dry-run.
Stop when the workflow file is created and passes linting.
```

### Qwen Prompt (Docs)
```markdown
Consolidate governance documentation.
1. Read `docs/governance/` and `docs/gap-analysis-summit.md`.
2. Create a unified `docs/governance/GA_POLICY.md`.
3. Ensure it covers all P0 gaps from the Remediation Plan.
Stop when the policy file is created.
```