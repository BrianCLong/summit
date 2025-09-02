# Engineering Execution Prompt — Close All Maestro Gaps (Dev Team Actionable)

**Context:** Maestro is the *standalone conductor* that builds Intelgraph (Maestro ≠ Intelgraph). The UI and core platform are near‑GA. This prompt instructs the dev team to **close every gap** listed below to hit GA with audit‑ready evidence.

---

## 0) Prime Directive
Deliver all **P0** items first, then **P1**, then **P2**. For each gap:
- Open a **Jira Epic** with the category name and link the stories below.
- Create a **feature branch** `feat/<short-category>/*` and PRs with the checklist in §1.
- Produce **evidence artifacts** and attach to the Epic (screenshots/logs/policies/links) as specified in **Acceptance**.
- Update **docs** and **runbooks** as part of DoD.

> **Definition of Done (DoD):** Code merged, tests green in CI, docs/runbooks published, dashboards/alerts live (if relevant), evidence attached, and owner sign‑off recorded.

---

## 1) Required PR Template (paste into each PR description)
- [ ] Scope matches the gap; links: Epic + issue list
- [ ] Tests added (unit/integration/e2e/a11y as applicable)
- [ ] Docs updated (README, ops runbooks, user guides)
- [ ] Security reviewed (secrets, CSP/XSS, RBAC/OPA)
- [ ] Observability added (OTEL spans, metrics, logs)
- [ ] Rollback plan and config toggles
- [ ] Evidence attached (screenshots/CLI outputs/config snippets)

---

## 2) Gap‑by‑Gap Work Orders (Owner → Tasks → Acceptance)

### 2.1 Identity & Access (SSO)
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** L  
**Owner:** Platform + Security  
**Requirement:** OIDC/SAML SSO (Okta/Auth0/Azure AD + Google), group→RBAC mapping, MFA support, SCIM user lifecycle, JIT provisioning.  
**Tasks:**
1) Implement OIDC with Auth0, Azure AD, Google; optional SAML for Okta.  
2) Map IdP groups→RBAC roles; enforce tenant boundary checks.  
3) SCIM 2.0: user create/update/deactivate; JIT on first login.  
4) MFA policy pass‑through + device challenge support.  
5) E2E login/logout flows; session & refresh token hygiene.
**Acceptance:** Login via each IdP; roles mapped; SCIM sync green; JIT works; unit/integration tests; rollback path documented.

### 2.2 Browser Support Matrix
**Status:** Partial • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Frontend QA  
**Requirement:** Publish/certify support matrix; cross‑browser E2E; a11y baseline; graceful degradation.  
**Tasks:** Clarify “Comet”→**Edge**; publish matrix (Chrome, Edge, Safari, Firefox). Document Tor constraints. Add Playwright grid in CI.  
**Acceptance:** Matrix in docs; CI shows green grid; Tor known‑issues list published.

### 2.3 Evidence Immutability (WORM)
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Platform  
**Requirement:** S3 Object Lock (compliance), KMS encryption, retention/lifecycle & access policy for evidence.  
**Tasks:** Create bucket(s) with **Object Lock compliance mode**; enable KMS; IAM policy to allow **CI‑only** writes; retention by artifact type; lifecycle to glacier.  
**Acceptance:** Object Lock verified; delete/overwrite blocked; evidence in runbooks; policy JSON attached.

### 2.4 Data Residency / Route Pins
**Status:** Planned • **Priority:** P2 • **Severity:** Low • **Effort:** M  
**Owner:** Platform + Data  
**Requirement:** Optional per‑tenant region pinning; storage localization; OPA policies.  
**Tasks:** Add `region` tag to tenants/runs/artifacts; OPA rules; regional buckets/registries optional; UI control per tenant.  
**Acceptance:** Region tag flows end‑to‑end; e2e policy test passes.

### 2.5 On‑call & Escalation
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** S  
**Owner:** Ops  
**Requirement:** PagerDuty rotation, RACI, GA on‑call runbook, comms templates, postmortems.  
**Tasks:** Create schedules; map alerts→services; write runbooks; comms templates; run a mock SEV drill.  
**Acceptance:** PagerDuty live; drill successful; runbooks linked in alerts; templates in repo.

### 2.6 Router Decision Transparency
**Status:** Delivered (extend) • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Frontend + Policy  
**Requirement:** UI shows chosen model, candidates, policy; exportable audit; override w/ guardrails.  
**Tasks:** Add **export‑to‑audit**, override requiring reason; rollback path; fairness flags; drift detection.  
**Acceptance:** Audit export present; override logged; drift alert triggers on change.

### 2.7 Serving Lane Metrics (vLLM/Ray)
**Status:** Partial • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Platform + Observability  
**Requirement:** KPIs: qDepth, batch, KV hit, throughput, GPU/CPU util, autoscale signals, SLA alerts.  
**Tasks:** Add GPU/CPU util + tail latency; autoscale hooks; alerts; Grafana panels.  
**Acceptance:** Metrics visible; alert on SLO breach; autoscale exercised in staging.

### 2.8 Evidence Panel (Supply Chain)
**Status:** Partial • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Security + Platform  
**Requirement:** Show SBOM/Cosign/SLSA; enforce verification; quarantine unverified.  
**Tasks:** Wire PR gates to attestations; **DSSE** validation; WORM storage; SBOM diff viewer.  
**Acceptance:** PR blocked if missing/invalid; SBOM diff renders; artifacts archived WORM.

### 2.9 Prometheus Alerts & Runbooks (Tuning)
**Status:** Delivered (tune) • **Priority:** P1 • **Severity:** Medium • **Effort:** S  
**Owner:** Observability  
**Tasks:** Tune thresholds; add blackbox probes; tenant‑aware cost guard; paging policy review.  
**Acceptance:** 7‑day alert review <2% false positives; synthetic probe dashboard present.

### 2.10 NL→Cypher Sandbox & Cost Preview (Hardening)
**Status:** Delivered (harden) • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Security + Data  
**Tasks:** Threat model + red‑team; OPA for disallowed patterns; tenant rate‑limits; perf guard.  
**Acceptance:** Red‑team suite green; blocked patterns logged/alerted; SLOs met.

### 2.11 Canary & Rollback Automation
**Status:** Partial • **Priority:** P0 • **Severity:** High • **Effort:** S  
**Owner:** Platform  
**Requirement:** Argo Rollouts victory/abort criteria by SLO; one‑click rollback.  
**Tasks:** Define numeric SLO gates; Argo analysis templates; rollback runbook; smoke tests.  
**Acceptance:** Auto‑promote/abort works; rollback game day passes.

### 2.12 Multi‑tenant RBAC & OPA
**Status:** Partial • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Security + Backend  
**Tasks:** Roles/permissions matrix; author Rego; policy‑as‑code tests; bundle versioning.  
**Acceptance:** OPA bundles versioned; policy tests green; least‑privilege verified in staging.

### 2.13 API & Docs (OpenAPI)
**Status:** Partial • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** DX/Docs  
**Tasks:** Complete OpenAPI; publish docs site; request/response examples; deprecation/versioning policy; SDK generation hooks.  
**Acceptance:** Docs site live; examples compile; versioning policy documented.

### 2.14 SDKs (TS/Python)
**Status:** Partial • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** SDK Team  
**Tasks:** Fix engines/workspace names; publish TS SDK to npm; add Python client to PyPI; semantic versioning; CI publish.  
**Acceptance:** Packages install clean; sample apps compile; semver policy enforced.

### 2.15 Trace Correlation (OTel)
**Status:** Not started • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Observability + Frontend  
**Tasks:** Inject/propagate `traceparent`; instrument runs/nodes; deep links to Grafana/Tempo/Loki from UI.  
**Acceptance:** From a run, open trace; logs show correlated trace/span IDs.

### 2.16 Billing, Budgets & Quotas
**Status:** Partial • **Priority:** P0 • **Severity:** High • **Effort:** L  
**Owner:** Platform + Finance  
**Tasks:** Enforce budget/quotas per tenant; usage export; anomaly detection rules refined.  
**Acceptance:** Breach halts workloads per policy; monthly export delivered.

### 2.17 SOC2/ISO Evidence Pack
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** S  
**Owner:** Compliance  
**Tasks:** Control mapping; PR template requiring evidence; CI check; store evidence in WORM.  
**Acceptance:** PRs blocked without evidence links; auditor trail in Object Lock bucket.

### 2.18 Data Lifecycle & Retention
**Status:** Not started • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Data + Security  
**Tasks:** Retention matrix; TTL policies; backup/restore encryption; deletion workflows.  
**Acceptance:** Backups verified; restore RTO/RPO met; deletion request succeeds.

### 2.19 Disaster Recovery (DR/BCP)
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** L  
**Owner:** Ops  
**Tasks:** RTO/RPO targets; secondary region; warm/cold standby; quarterly failover test; procedures published.  
**Acceptance:** Failover test meets targets; runbook published.

### 2.20 Model Gateways Coverage
**Status:** Partial • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Platform  
**Tasks:** Catalog OpenAI/Anthropic/Google/local; health checks; fallback; outage drills.  
**Acceptance:** Outage drill routes per policy; no SLO breach.

### 2.21 Eval/Benchmark Harness
**Status:** Not started • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** ML Ops  
**Tasks:** Datasets; offline evals; regression dashboards; auto PR to update routing weights with approvals.  
**Acceptance:** Weekly eval runs; diff report; policy update PR requires approvals.

### 2.22 Audit Logging
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Security  
**Tasks:** Central audit bus; sign logs; export to SIEM; retention; index for router overrides, authz changes, dataset access, exports.  
**Acceptance:** All privileged ops logged; tamper‑evident; queries for investigations demonstrated.

### 2.23 Privacy & Legal Readiness
**Status:** Not started • **Priority:** P1 • **Severity:** Medium • **Effort:** M  
**Owner:** Legal + Security  
**Tasks:** Draft DPA/ToS; DSAR process; PII tagging/masking; provider DPAs stored.  
**Acceptance:** Signed DPAs; DSAR dry‑run completed; PII masked in logs/UI.

### 2.24 Offline/Edge Kits
**Status:** Planned • **Priority:** P2 • **Severity:** Low • **Effort:** L  
**Owner:** Platform  
**Tasks:** Define profiles; package policy bundles, provenance; sync/merge; offline licensing.  
**Acceptance:** Edge kit built/tested; provenance sync round‑trip works.

### 2.25 Accessibility (WCAG 2.1 AA)
**Status:** Partial • **Priority:** P1 • **Severity:** Medium • **Effort:** S  
**Owner:** Frontend  
**Tasks:** Fix Node/pnpm engine to install **axe**; add a11y CI; remediate violations; keyboard/contrast/screen reader lab pass.  
**Acceptance:** < 5 minor issues; **0 critical**; docs updated.

### 2.26 Service Level Objectives (SLOs)
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** S  
**Owner:** Ops  
**Tasks:** Define SLOs (latency, reliability, cost); burn alerts; weekly report.  
**Acceptance:** SLO doc published; burn alerts active; weekly report generated.

### 2.27 Secrets & Config Management
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Security + Platform  
**Tasks:** Choose Vault/SOPS; migrate secrets; CI policy blocks plaintext; drift detection.  
**Acceptance:** No plaintext secrets in repos; IAM‑gated access; complete audit trail.

### 2.28 Backups & Encryption
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** M  
**Owner:** Ops + Security  
**Tasks:** Encrypt at rest/in transit; backup schedule; quarterly restore tests; key rotation policy.  
**Acceptance:** Restore passes; keys rotated; CIS benchmarks met.

### 2.29 Feature Flags & Safe Launch
**Status:** Not started • **Priority:** P1 • **Severity:** Medium • **Effort:** S  
**Owner:** Platform + Frontend  
**Tasks:** Wire flag service; dark launch; progressive exposure; telemetry.  
**Acceptance:** Flags in repo; dark launch executed; rollback by flag proven.

### 2.30 GA Gates PR Template & Checks
**Status:** Not started • **Priority:** P0 • **Severity:** High • **Effort:** S  
**Owner:** Release Mgmt  
**Tasks:** Create a single **GA Gates** issue with subtasks, owners, acceptance; add PR template checklist; CI validator to require links to evidence.  
**Acceptance:** Issue live; PRs blocked without checked gates; evidence verified in CI.

---

## 3) CI Required Checks (must pass before merge)
1) `tsc --noEmit` (typecheck)  
2) Unit tests + coverage ≥ 80% on changed files  
3) Playwright grid (Chrome/Edge/Safari/Firefox)  
4) a11y scans (axe) with 0 critical  
5) ESLint (no new warnings on changed files)  
6) Lighthouse CI on `/maestro/*` key routes  
7) Security: `trivy` or `grype` image scan = no Critical/High  
8) OPA policy tests green  
9) OTEL smoke: traces emitted for Run create → Step execute  
10) Evidence: WORM check (Object Lock) for uploaded artifacts

---

## 4) Rollout & Evidence Submission
- **Rollout:** Canary 10% → 50% → 100% (24h per step) for UI and API; flags enabled per tenant.  
- **Evidence:** Attach screenshots, policy JSON, CI logs, Grafana links, and CLI outputs to each Epic; add summary in the **GA Gates** issue.

**Go when:** All **P0** acceptances pass with attached evidence; **P1** scheduled with owners/dates; rollback tested.

