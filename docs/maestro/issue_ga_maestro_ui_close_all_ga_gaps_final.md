# 🔔 Execution Prompt — Close All Maestro UI GA Gaps (Final)

**Context**  
Maestro is the **conductor** orchestrating IntelGraph builds. This epic hardens the **Maestro UI** to GA by closing security, reliability, governance, and ops gaps. **No data residency constraints** today; on‑call is **you & me**.  
**IdPs (target order):** **Auth0**, **Azure AD**, **Google** (OIDC first, SAML optional).  
**Browser matrix:** **Chrome**, **Comet (Perplexity agentic browser)**, **Safari**, **Firefox**, **Tor**.  
**Evidence immutability:** **S3 Object Lock (Compliance mode)** + **Versioning** + **SSE‑KMS (CMK)**.  
**GA Cutover window:** **Wed Sep 3, 2025 09:00 America/Denver**.

**Outcome**  
All **P0/P1** gaps closed with verifiable evidence, passing CI gates that **block merges** without artifacts/links.

**Program Guardrails**

- **Non‑negotiables (P0):** SSO/RBAC/SCIM, CSRF/CSP, WORM evidence, budgets/quotas enforcement, canary+rollback, RBAC/OPA, supply‑chain verification, SOC2/ISO evidence pack, SLOs, secrets/config, backups/DR, GA PR gate checks.
- **Proof:** Each PR must attach artifacts under **Evidence** and pass **`enforce-ga-gates`** workflow.
- **Owners:** Assign as listed; co‑review by counterpart discipline.

---

## Gaps → Work Orders (build, meet acceptance criteria, attach evidence)

### 1) Identity & Access (SSO) — **P0 / High / Effort: L** — **Owner:** Platform + Security

**Do**

- Implement **OIDC code flow (PKCE)** for **Auth0, Azure AD, Google**; optional SAML where trivial via provider.
- Map **IdP groups/claims → RBAC roles** (viewer/operator/admin); **JIT provisioning** on first login.
- **SCIM** lifecycle (provision/deprovision/attr sync).
- **MFA** via IdP; UI respects step‑up.
- Tenant‑boundary checks in UI/gateway for **every** action.
  **Accept** Login works per IdP; role mapping effective; SCIM sync passes; unit/integration tests; rollback plan.  
  **Evidence** Redacted IdP configs, OIDC logs, Playwright videos, SCIM output.

### 2) Browser Support Matrix — **P1 / Medium / Effort: M** — **Owner:** Frontend QA

**Do** Publish matrix; treat **Comet = Perplexity agentic browser** (Chromium‑based) unless proven otherwise; cross‑browser Playwright grid; a11y baseline; **Tor** constraints (no 3P iframes, stricter CSP).  
**Accept** Matrix doc; grid CI green across Chrome/Comet/Safari/Firefox/Tor; Tor known‑issues list.  
**Evidence** CI runs, screenshots, doc link.

### 3) Evidence Immutability (WORM) — **P0 / High / Effort: M** — **Owner:** Platform

**Recommendation** AWS **us‑west‑2** (mature S3/KMS, good latency to Denver). KMS CMK alias: `alias/maestro-evidence-kms`.  
**Do** Provision S3 with **Object Lock (Compliance)** + **Versioning** + **SSE‑KMS (CMK)**; default retention **90d**; lifecycle + deny overwrite/delete during lock; uploads from **CI only**.  
**Accept** Delete/overwrite blocked during retention; runbooks updated.  
**Evidence** Bucket policy JSON, CLI AccessDenied transcript, KMS key policy.

### 4) Data Residency / Route Pins — **P2 / Low / Effort: M** — **Owner:** Platform + Data

**Do** Region tags on tenants/artifacts; OPA policies; optional regional targets; user toggle (off by default).  
**Accept** Region tag flows through storage/compute/evidence; e2e policy test passes.  
**Evidence** Schema diff, rego/tests, artifact path examples.

### 5) On‑call & Escalation — **P0 / High / Effort: S** — **Owner:** Ops

**Contacts** Primary: **Brian Long** (brianclong@gmail.com, +1‑202‑285‑7822). Secondary: **@guy‑ig**.  
**Do** PagerDuty rotation; severity matrix; comms templates; quarterly drills; link AlertCenter routes.  
**Accept** Live schedule; mock SEV drill pass; runbooks wired to alerts.  
**Evidence** PD schedule screenshot, drill doc, runbook links.

### 6) Router Decision Transparency — **P1 / Medium / Effort: M** — **Owner:** Frontend + Policy

**Do** Export‑to‑audit (decision + candidates + policy hash); override requires reason; rollback snapshot; drift alerts.  
**Accept** Audit artifact generated; override logged w/ reason; drift alert visible in AlertCenter.  
**Evidence** Audit file, events, alert screenshot.

### 7) Serving Lane Metrics (vLLM/Ray) — **P1 / Medium / Effort: M** — **Owner:** Platform + Observability

**Do** Add GPU/CPU util, throughput, tail latency; autoscale hooks; SLO alerts for saturation.  
**Accept** Panels show metrics; SLO breach alert fires; autoscale validated in staging.  
**Evidence** Grafana screenshots, alert event, staging runbook.

### 8) Evidence Panel (Supply Chain) — **P0 / High / Effort: M** — **Owner:** Security + Platform

**Do** Gate PRs on Cosign/SLSA attestations; DSSE bundle validation; SBOM diff viewer; quarantine unverified artifacts.  
**Accept** Missing/invalid attestation **blocks**; SBOM diff visible; WORM enforced.  
**Evidence** Failing CI logs, diff screenshots.

### 9) Prometheus Alerts & Runbooks — **P1 / Medium / Effort: S** — **Owner:** Observability

**Do** Tune thresholds; blackbox probes; tenant‑aware cost guards; paging review.  
**Accept** 7d review shows <2% false positives; probe dashboard present.  
**Evidence** Rule diffs, dashboards, review note.

### 10) NL→Cypher Sandbox & Cost Preview — **P0 / High / Effort: M** — **Owner:** Security + Data

**Do** Threat model + red‑team suite; OPA disallowed patterns; rate‑limit tokens/tenant; query killer.  
**Accept** Red‑team green; blocked patterns alerted; SLO intact.  
**Evidence** Red‑team report, logs, alert links.

### 11) Canary & Rollback Automation — **P0 / High / Effort: S** — **Owner:** Platform

**Do** Numeric SLO gates in **Argo analysis templates**; one‑click rollback runbook.  
**Accept** Auto‑promote/abort; rollback tested game day.  
**Evidence** Template, game‑day video.

### 12) Multi‑tenant RBAC & OPA — **P0 / High / Effort: M** — **Owner:** Security + Backend

**Do** Role matrix; Rego policies; policy‑as‑code tests; least‑privilege checks.  
**Accept** Bundles versioned; tests green; staging verifies least‑privilege.  
**Evidence** Rego repo, CI run, access tests.

### 13) API & Docs (OpenAPI) — **P1 / Medium / Effort: M** — **Owner:** DX/Docs

**Do** Complete OpenAPI; publish docs; deprecation/versioning; examples/quickstarts.  
**Accept** Docs site live; SDKs gen; policy documented.  
**Evidence** Docs URL, generation logs.

### 14) SDKs (TS/Python) — **P1 / Medium / Effort: M** — **Owner:** SDK Team

**Do** Fix engines/workspaces; publish TS + Python SDKs; CI publish; semver.  
**Accept** `npm install` / `pip install` clean; examples compile; semver enforced.  
**Evidence** Releases, CI publish, examples.

### 15) Trace Correlation (OTel) — **P1 / Medium / Effort: M** — **Owner:** Observability + Frontend

**Do** OTel spans from UI→gateway; trace IDs in logs; deep links to Tempo/Grafana.  
**Accept** Click‑through run→trace; correlated logs visible.  
**Evidence** Video, screenshots.

### 16) Billing, Budgets & Quotas — **P0 / High / Effort: L** — **Owner:** Platform + Finance

**Do** Enforce per‑tenant budgets/quotas; usage export; anomaly detection.  
**Accept** Breach halts per policy; monthly export delivered.  
**Evidence** Budget logs, export artifact.

### 17) SOC2/ISO Evidence Pack — **P0 / High / Effort: S** — **Owner:** Compliance

**Do** Control mapping; PR template requiring evidence; CI checks to **block** if missing; store in WORM.  
**Accept** PRs blocked without evidence; auditor trail available.  
**Evidence** Workflow runs, object‑lock path, sample pack.

### 18) Data Lifecycle & Retention — **P1 / Medium / Effort: M** — **Owner:** Data + Security

**Do** Retention matrix; TTL; backup/restore; DSAR deletions.  
**Accept** Backups verified; restore meets RTO/RPO; DSAR succeeds.  
**Evidence** Policies, restore logs, DSAR run.

### 19) Disaster Recovery (DR/BCP) — **P0 / High / Effort: L** — **Owner:** Ops

**Do** RTO/RPO; secondary region; replication; quarterly failover.  
**Accept** Failover meets targets; runbook published.  
**Evidence** Drill report, dashboards.

### 20) Model Gateways Coverage — **P1 / Medium / Effort: M** — **Owner:** Platform

**Do** Catalog providers (OpenAI/Anthropic/Google/vLLM/etc), health checks, fallbacks, outage drills.  
**Accept** Outage routes per policy; no SLO breach.  
**Evidence** Drill logs, routing policy.

### 21) Eval/Benchmark Harness — **P1 / Medium / Effort: M** — **Owner:** ML Ops

**Do** Offline evals + golden sets; regression dashboards; PR‑approved policy weight updates.  
**Accept** Weekly eval run; diff report; approvals required.  
**Evidence** Eval artifacts, dashboard, PRs.

### 22) Audit Logging — **P0 / High / Effort: M** — **Owner:** Security

**Do** Central audit bus; signed, append‑only logs; SIEM export; retention.  
**Accept** All privileged ops present; tamper‑evident; queries prebuilt.  
**Evidence** Log samples, signature proof.

### 23) Privacy & Legal Readiness — **P1 / Medium / Effort: M** — **Owner:** Legal + Security

**Do** Draft **DPA/ToS**; DSAR runbook; PII tagging/masking; provider DPAs stored.  
**Accept** Signed DPAs; DSAR pass; PII masked in UI/logs.  
**Evidence** Docs, DSAR trace, screenshots.

### 24) Offline/Edge Kits — **P2 / Low / Effort: L** — **Owner:** Platform

**Do** Kit profiles (policy, provenance, local inference); sync/merge rules; offline licensing.  
**Accept** Edge kit built/tested; provenance round‑trip.  
**Evidence** Build logs, lab notes.

### 25) Accessibility (WCAG 2.1 AA) — **P1 / Medium / Effort: S** — **Owner:** Frontend

**Do** Fix Node/pnpm engines; add axe CI; remediate; keyboard paths; contrast.  
**Accept** axe < **5 minor**; no critical; docs updated.  
**Evidence** axe CI, remediation PRs.

### 26) Service Level Objectives (SLOs) — **P0 / High / Effort: S** — **Owner:** Ops

**Do** Define SLOs & error budgets (latency, reliability, cost); burn‑rate alerts; weekly review.  
**Accept** SLO doc; burn alerts active; weekly report.  
**Evidence** Docs, rules, report link.

### 27) Secrets & Config Management — **P0 / High / Effort: M** — **Owner:** Security + Platform

**Recommendation** **Vault** for dynamic/runtime secrets (AWS auth), **SOPS + AWS KMS** for Git‑stored static config.  
**Do** Migrate secrets; CI policy to block plaintext; drift detection; IAM‑scoped access.  
**Accept** No plaintext in repos; access via IAM/Vault; audit trail complete.  
**Evidence** CI policy, secret paths, audit logs.

### 28) Backups & Encryption — **P0 / High / Effort: M** — **Owner:** Ops + Security

**Do** Encrypt at rest/in transit; snapshot schedule; **quarterly restore**; KMS key rotation; CIS benchmarks.  
**Accept** Restore pass; keys rotated; CIS check green.  
**Evidence** Restore logs, rotation proof.

### 29) Feature Flags & Safe Launch — **P1 / Medium / Effort: S** — **Owner:** Platform + Frontend

**Do** Flag service; dark launch; progressive exposure; telemetry.  
**Accept** Flags in repo; dark‑launch executed; rollback by flag works.  
**Evidence** Config, rollout chart, rollback demo.

### 30) GA Gates PR Template & Checks — **P0 / High / Effort: S** — **Owner:** Release Mgmt

**Do** Use the GA issue + PR template + evidence‑enforcing workflow; enable required status on default branch.  
**Accept** PRs blocked without evidence; gate notes posted as PR comments.  
**Evidence** Workflow runs, blocked PR example.

---

## Sprint Plan (default)

- **Sprint 1–2 (P0 focus):** 1,3,5,8,11,12,16,17,19,26,27,28,30
- **Sprint 3–4 (P1 focus):** 2,6,7,9,13,14,15,21,25,29
- **Sprint 5+ (P2/polish):** 4,24 + backlog polish

## Definition of Done (per PR)

- All listed **Acceptance Criteria** for the gap(s) met.
- **Evidence attached** (screens, logs, links, JSON artifacts).
- **Rollback** documented (flag or config).
- **Tests** added: unit/integration + E2E where applicable.
- **Security review** if gate affects auth/data/infra.

## Evidence Menu

- IdP screenshots / OIDC logs / SCIM run
- ZAP/Burp report / header dump
- K6 JSON / Playwright traces / axe report
- AWS policy & denied ops log (Object Lock)
- Grafana/Tempo/Loki links (SLO, traces, logs)
- Argo analysis artifacts / rollout logs
- Rego bundles + test outputs
- Audit logs + SIEM query examples

## CI/PR Enforcement

- Use the **PR template** and **`enforce-ga-gates`** workflow.
- Add **required** status check named **“Enforce GA Gates Evidence.”**
- Label PRs by gap (e.g., `security`, `supply-chain`, `observability`, `ga`).

## Owners & Escalation

- **On‑call:** you ↔ me (PagerDuty primary/secondary).
- **Escalation:** on‑call → platform lead → security/ops lead → exec sponsor.

## Deliverable

Close this epic when all **P0+P1** items are ✅ with evidence and the **blue/green GA cutover** executes without SLO regressions at **2025‑09‑03 09:00 America/Denver**.

---

### (Optional) Ready‑to‑run Kickoff Script

Comment on this issue with:

- `/assign @owner1 @owner2` per work order
- `/milestone Sprint-N`
- `/priority P0|P1|P2`
- `/create-task <gap-id>` (we’ll convert each work order into a child issue)

---

## Appendices

### A. IdP callback/concepts (to fill during implementation)

- **Auth0:** Domain, Client ID/secret, Callback URLs: `<UI_BASE>/auth/callback`, Post‑logout: `<UI_BASE>/auth/logout`.
- **Azure AD (Entra):** Tenant ID, App ID, Redirect URIs, Expose API (groups claim).
- **Google:** OAuth consent, Client ID/secret, Authorized redirect URIs.
- **RBAC mapping:** `groups → roles` table in config; document in README.

### B. S3 Object Lock (Compliance) policy (skeleton)

- Bucket policy denies `s3:DeleteObject*` and `s3:PutObject*` without valid Object‑Lock headers; allow write from CI role only.
- KMS CMK alias: `alias/maestro-evidence-kms`; key policy grants decrypt to read‑only evidence roles.

### C. Secrets System (recommendation)

- **Vault** (AWS auth) for dynamic runtime secrets; short TTL, audit enabled.
- **SOPS + AWS KMS** for static config in Git; CI decrypt via OIDC‑assumed role.
- CI check blocks plaintext secrets.
