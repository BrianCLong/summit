# Summit Feedback Triage — 2026-03-09

**Triage Date:** 2026-03-09
**Triage Agent:** Claude (feedback-ingestion-prioritization pass)
**Branch:** claude/feedback-ingestion-prioritization-kaSa2
**Purpose:** Consolidate all available post-release signals into a grounded issue picture to drive the next iteration.

---

## 1. Signal Sources Inspected

| Source | Type | Date | Quality |
|--------|------|------|---------|
| `.github/ISSUE_TEMPLATE/issue_01–05_*.md` | Structured issue reports | Filed pre-GA | Confirmed — 5 open issues |
| `COMET_TRIAGE_REPORT.md` | Automated triage (5 clusters) | 2026-01-31 | Confirmed |
| `RELEASE_SUMMARY.md` (GA Merge Window) | Ops/CI status | 2026-01-24 | Confirmed — 178 failing test suites |
| `GA_RELEASE_PACKET.md` (v4.2.4) | Release packet | Feb 2026 | Confirmed — "PARTIAL PASS" |
| `GA_RELEASE_SUMMARY.md` (P1 backlog completion) | Completion evidence | Feb 2026 | Confirmed — P1 items merged |
| `TECHNICAL_DEBT.md` | Debt register | 2026-01-20 | Confirmed — 2,004 TODOs, 3,375 stubs |
| `TECHNICAL_AUDIT_REPORT_2026-01-20.md` | Engineering audit | 2026-01-20 | Confirmed |
| `analysis/todo_harvest.csv` | Static analysis harvest | Recent | 50+ pending TODOs mapped |
| `backlog/DEFERRED_SUMMARY.md` | Deferred items | 2026-02-06 | Confirmed |
| `backlog/threat-intel-backlog-2026-01-22.md` | Security CVE/ops | 2026-01-22 | SEC-OPS-001 open |
| `SECURITY/opa-policy-coverage.md` | Auth coverage | 2026-02-06 | Gaps partially resolved |
| `INCIDENT_SIGNAL_MAP.md` | Ops signal → action map | Recent | Defined but no live data |
| `observability/slo/companyos-api.slo.yaml` | SLO definitions | Recent | Defined — no live readings |
| `observability/alert-rules-intelgraph.yml` | Prometheus alert rules | Recent | Defined — no live readings |
| `analytics/SIGNALS.md` | Signal catalog | Recent | Usage signals: "mocked or real later" |
| `backlog/golden-path-hardening.md` | Bug bash 2025-09-22 | 2025-09-22 | 5 items, partially addressed |
| `GA_GATE_ISSUE.md` | Release gate | Pre-GA | All items still marked Pending |
| `SPRINT_INDEX.md` | Sprint history | Current: N+55 | 101+ sprints, all "sealed" |
| `90_DAY_WAR_ROOM_BACKLOG.md` | 90-day ops plan | 2025/2026 | 36 items, weeks 1–16 |
| TypeScript build output (`pnpm typecheck`) | Live check | 2026-03-09 | Errors in generated + archive files |
| Source grep (TODO/FIXME in server/src, client/src) | Live check | 2026-03-09 | 123 pending markers in server/src |

### Missing / Absent Signals (Explicitly Noted)

- **No live production telemetry**: Error rates, latency percentiles, and SLO burn are defined but no dashboards or live readings exist in the repo.
- **No real user session data**: Analytics signals catalog acknowledges usage is "mocked or real later."
- **No support ticket export**: No Zendesk/Linear/GitHub Issues export present.
- **No real first-week monitoring logs**: `RELEASE_SUMMARY.md` describes CI state; no application runtime logs from production.
- **Bug bash artifacts incomplete**: `backlog/golden-path-hardening.md` notes that `BUG_BASH_REPORT_20250922.md` linked files (`P0-critical.md`, etc.) are empty templates.

---

## 2. De-Duplicated Issue List

Issues are de-duplicated across sources. Each entry includes: source, affected workflow, severity, confidence, subsystem ownership.

### SECURITY / GOVERNANCE

#### SG-01: n8n Credential Rotation Not Executed (SEC-OPS-001)
- **Source:** `backlog/threat-intel-backlog-2026-01-22.md`, `backlog/DEFERRED_SUMMARY.md`
- **Type:** Operational security — credentials potentially compromised
- **Workflow:** All workflows using n8n automation (CI, ingest pipelines)
- **Severity:** P0 — Runbook exists but execution blocked on DevOps team
- **Frequency:** One-time action required; CVE-2026-21858 is the trigger
- **Confidence:** HIGH — n8n version gate script created (`scripts/ci/verify_n8n_safe.sh`), runbook at `runbooks/n8n-credential-rotation.md`
- **Subsystem:** DevOps / Security ops

#### SG-02: AI Routes Using Scaffold/Mock LLM (Not Real Integration)
- **Source:** `analysis/todo_harvest.csv` (P0), `server/src/routes/ai.ts:465`
- **Type:** Confirmed defect — feature non-functional in production
- **Workflow:** Analyst workspace → Entity AI summary generation
- **Severity:** P0 — Users requesting AI summaries receive scaffold output, not real LLM responses
- **Frequency:** Every AI summary request
- **Confidence:** HIGH — `TODO: Replace with actual LLM integration` at line 465; `generateScaffoldAISummary()` is a placeholder
- **Subsystem:** `server/src/routes/ai.ts`, `server/src/ai/`

#### SG-03: Semantic Validator Returns 0.0 (Agent Safety Bypass)
- **Source:** `TECHNICAL_DEBT.md`, `TECHNICAL_AUDIT_REPORT_2026-01-20.md`
- **Type:** Security defect — prompt injection protection non-functional
- **Workflow:** Maestro agent task execution
- **Severity:** P0 (mitigated to P1 — feature-flagged and disabled)
- **Status:** Feature flag added, defaults disabled. Mitigation in place, but real validation unimplemented.
- **Confidence:** HIGH
- **Subsystem:** `server/src/conductor/validation/semantic-validator.ts:100–305`

#### SG-04: OPA Coverage Gaps — GraphQL Resolvers + Webhook Handlers
- **Source:** `SECURITY/opa-policy-coverage.md`, `analysis/todo_harvest.csv`
- **Type:** Authorization gap — some resolvers bypass policy checks
- **Workflow:** GraphQL API queries/mutations, webhook event handling
- **Severity:** P1 — infrastructure present, not enforced everywhere
- **Confidence:** HIGH (GraphQL partial confirmed; webhook status unknown = blind spot)
- **Subsystem:** `server/src/graphql/resolvers/`, webhook handlers (unaudited)

#### SG-05: DEBUG Statements in Production App Bootstrap
- **Source:** `server/src/app.ts` (live grep)
- **Type:** Operational defect — noise / potential info disclosure
- **Workflow:** App startup / every request cycle that hits initialization paths
- **Severity:** P2 — `process.stdout.write('[DEBUG] ...')` appears at startup
- **Confidence:** HIGH — confirmed in source
- **Subsystem:** `server/src/app.ts`

#### SG-06: ENABLE_INSECURE_DEV_AUTH Bypass in Auth Layer
- **Source:** `server/src/app.ts:337`, `server/src/lib/auth.ts:71`
- **Type:** Security configuration — bypass gated on NODE_ENV=development only
- **Workflow:** Auth on all requests
- **Severity:** P2 — gated to development env; risk if NODE_ENV misconfigured in staging/prod
- **Confidence:** HIGH — confirmed in source
- **Subsystem:** `server/src/lib/auth.ts`, `server/src/app.ts`

---

### RELIABILITY / CI

#### RC-01: 178 Failing Test Suites (ESM/CJS Interop + Python Deps)
- **Source:** `RELEASE_SUMMARY.md`, `GA_RELEASE_PACKET.md`
- **Type:** CI reliability — test suite severely degraded
- **Workflow:** CI pipeline / release verification
- **Severity:** P0 — Cannot validate correctness; releases are unverified
- **Root Causes:**
  1. ESM/CJS interop: `ReferenceError: module is not defined` in `src/middleware/authorization.ts` et al.
  2. Missing Python dep: `ModuleNotFoundError: No module named 'rapidfuzz'` for ML ER tests
  3. Semantic type errors: `jsonwebtoken` (ms export), `multer` (files property)
- **Confidence:** HIGH — documented in release summary
- **Subsystem:** `server/src/middleware/`, `server/ml/er/api.py`, CI environment config

#### RC-02: TypeScript Build Errors in Generated + Archive Files
- **Source:** `pnpm typecheck` (run 2026-03-09)
- **Type:** Build defect
- **Workflow:** CI typecheck gate
- **Severity:** P1 — `ui/generated/tokens.d.ts` has syntax errors; `v4/archive/frontend-migration/web/src/components/panels/TimelineRail.tsx` is malformed (truncated JSX)
- **Confidence:** HIGH — confirmed by running typecheck
- **Subsystem:** `ui/generated/`, `v4/archive/frontend-migration/`

#### RC-03: Golden Path / Docker Check Fails Without Daemon (BB-002)
- **Source:** `backlog/golden-path-hardening.md`
- **Type:** Developer experience / CI reliability
- **Workflow:** Local dev and CI sandbox startup (`./start.sh`)
- **Severity:** P2 — blocks CI sandbox environments that don't run local Docker
- **Confidence:** MEDIUM — bug bash finding, no repro steps in current snapshot
- **Subsystem:** `./start.sh`, CI environment

#### RC-04: Smoke Test 30s Hardcoded Timeout (BB-004)
- **Source:** `backlog/golden-path-hardening.md`
- **Type:** Reliability — false negatives on slow CI/cold starts
- **Workflow:** Post-deploy smoke test
- **Severity:** P2
- **Confidence:** HIGH
- **Subsystem:** `scripts/smoke-test.js`

---

### PERFORMANCE

#### PF-01: GraphQL Query Performance Regression — 200ms → 800ms (Issue #4)
- **Source:** `.github/ISSUE_TEMPLATE/issue_04_graphql_query_perf_regression.md`
- **Type:** Confirmed performance regression (backend)
- **Workflow:** Analyst workspace — all multi-hop graph queries
- **Severity:** P1 — 4× latency increase on moderate graphs (~5k nodes)
- **Frequency:** Every graph traversal query
- **Confidence:** HIGH — structured issue filed
- **Subsystem:** `server/src/graphql/resolvers/`, Neo4j query layer

#### PF-02: Graph Rendering Lag on Large Datasets (Issue #1)
- **Source:** `.github/ISSUE_TEMPLATE/issue_01_graph_rendering_lag.md`
- **Type:** Frontend performance defect
- **Workflow:** Graph canvas / IntelGraph visualization
- **Severity:** P1 — >10k nodes blocks main thread, low-spec hardware unusable
- **Frequency:** Any large-scale investigation
- **Confidence:** HIGH — structured issue filed
- **Subsystem:** `client/src/components/GraphCanvas.tsx`, Cytoscape.js config

---

### FUNCTIONALITY / PRODUCT

#### FP-01: AI Summary Scaffold (same as SG-02 — counted once, P0)

#### FP-02: Real-Time Collaboration Delta Sync Latency (Issue #2)
- **Source:** `.github/ISSUE_TEMPLATE/issue_02_collab_delta_sync_latency.md`
- **Type:** Performance / UX defect
- **Workflow:** Collaborative annotation editing
- **Severity:** P1 — up to 500ms sync latency, race conditions, inconsistent state
- **Confidence:** HIGH — structured issue filed
- **Subsystem:** WebSocket layer, collab sync service

#### FP-03: Entity Resolution 15% Misclassification on Noisy Input (Issue #3)
- **Source:** `.github/ISSUE_TEMPLATE/issue_03_entity_resolution_accuracy.md`
- **Type:** AI/ML accuracy defect
- **Workflow:** Entity ingestion → graph nodes
- **Severity:** P1 — fragmented graph views, hinders analysis
- **Frequency:** ~15% of near-duplicate entities in noisy datasets
- **Confidence:** HIGH — structured issue filed
- **Subsystem:** `server/src/` ER pipeline, `server/ml/er/`

#### FP-04: NL-to-Cypher Has No Production Neo4j (Demo Mode Only)
- **Source:** `TECHNICAL_DEBT.md`, `analysis/todo_harvest.csv` (P1), `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts:176`
- **Type:** Feature non-functional in production
- **Workflow:** Analyst workspace — natural language graph queries
- **Severity:** P1 — feature is presented as available but hits sandbox stub
- **Confidence:** HIGH
- **Subsystem:** `server/src/ai/nl-to-cypher/`

#### FP-05: Switchboard HITL Console — API Endpoints + Task Feed Not Built
- **Source:** `TECHNICAL_AUDIT_REPORT_2026-01-20.md`
- **Type:** Feature incomplete (Epic 2 blocker)
- **Workflow:** Human operator approval of high-risk agent tasks
- **Severity:** P1 — blocks governance Epic 2 delivery
- **Confidence:** HIGH
- **Subsystem:** `apps/switchboard-web/`, `server/src/maestro/`

#### FP-06: Attribution Tagging Stub (No Real Tokenization/Provenance)
- **Source:** `TECHNICAL_DEBT.md`, `server/src/conductor/attribution/tag-builder.ts:112–172`
- **Type:** Functional gap — legal/IP risk
- **Workflow:** Content provenance tracking
- **Severity:** P1
- **Confidence:** HIGH
- **Subsystem:** `server/src/conductor/attribution/`

#### FP-07: GraphQL Resolver Gaps (17 TODOs)
- **Source:** `TECHNICAL_DEBT.md`, `analysis/todo_harvest.csv`
- **Type:** Incomplete API — returns partial/empty responses
- **Workflow:** Multiple GraphQL queries across product surface
- **Severity:** P1 — affects core analyst workflows
- **Confidence:** HIGH
- **Subsystem:** `server/src/graphql/resolvers/`

---

### COMPLIANCE / AUDIT

#### CA-01: Tag Deletion Unlogged in Audit Trail (Issue #5)
- **Source:** `.github/ISSUE_TEMPLATE/issue_05_incomplete_audit_trail.md`
- **Type:** Compliance defect — audit trail gap
- **Workflow:** Tag management / investigative metadata changes
- **Severity:** P1 — compliance risk, regulatory exposure
- **Confidence:** HIGH — structured issue filed
- **Subsystem:** Audit log service, tag deletion handlers

#### CA-02: Branch Protection Not Enforced as Code
- **Source:** `backlog/DEFERRED_SUMMARY.md`, `COMET_TRIAGE_REPORT.md` (Cluster A)
- **Type:** Governance drift — CI policy vs. actual branch settings diverge
- **Workflow:** CI/CD pipeline integrity
- **Severity:** P1 — blocked on admin token + org policy alignment
- **Confidence:** HIGH
- **Subsystem:** `.github/` branch protection config

---

### OBSERVABILITY / INSTRUMENTATION

#### OB-01: Prometheus Metrics Stubbed / Missing in Multiple Services
- **Source:** `TECHNICAL_DEBT.md`, `analysis/todo_harvest.csv`
- **Type:** Observability blind spot
- **Workflow:** Monitoring/alerting for ingest, streaming, tenant API
- **Severity:** P2 — can't measure SLOs against real data
- **Confidence:** HIGH — confirmed in source
- **Subsystem:** `services/streaming-ingest/`, `services/ingest-adapters/`, `companyos/services/tenant-api/src/middleware/metrics.ts`

#### OB-02: No Live Production Signal in Repo
- **Source:** `analytics/SIGNALS.md` ("mocked or real later"), `companyos/src/evidence/sources.ts` (stubbed metrics)
- **Type:** Instrumentation gap — prevents data-driven prioritization
- **Severity:** P2 — affects the ability to detect issues before users report them
- **Confidence:** HIGH
- **Subsystem:** Analytics pipeline, evidence collection

#### OB-03: OpenTelemetry Exporters Not Configured in Conductor UI
- **Source:** `analysis/todo_harvest.csv` (P2), `conductor-ui/frontend/src/maestro/main-maestro.tsx:7`
- **Type:** Missing instrumentation
- **Severity:** P2
- **Confidence:** HIGH
- **Subsystem:** `conductor-ui/frontend/`

---

### DEFERRED / RESEARCH

#### DF-01: WebAuthn Step-Up Authentication (TODO #54)
- **Source:** `TODO.md`
- **Type:** Security feature — not implemented
- **Severity:** P2 (no current workaround documented)
- **Subsystem:** Auth layer

#### DF-02: MCP Apps — Real Adapter + Signature Key Management
- **Source:** `backlog/DEFERRED_SUMMARY.md`
- **Type:** Platform feature — blocked on security audit + infra
- **Severity:** P3
- **Subsystem:** `intelgraph-mcp/`

#### DF-03: Synthetic Amplification Detector (DET-SYN-001)
- **Source:** `backlog/threat-intel-backlog-2026-01-22.md`
- **Severity:** P3
- **Subsystem:** `policy/detection/rules/`

#### DF-04: Ingress-NGINX Retirement
- **Source:** `backlog/DEFERRED_SUMMARY.yaml`
- **Severity:** P3 — requires cross-team coordination
- **Subsystem:** Platform infra

---

## 3. Root-Cause Clusters by Subsystem

### Cluster 1: CI/Release Integrity
**Root cause:** Rapid feature expansion without maintaining test hygiene. ESM/CJS interop issues introduced during module modernization. Python ML deps not provisioned in CI.
**Issues:** RC-01, RC-02
**Risk:** Cannot verify correctness of any release. Prioritization confidence drops across the board.

### Cluster 2: Scaffold/Stub Implementations Shipped to Production
**Root cause:** Development velocity outpaced real implementation. Placeholder functions and TODO markers were merged without being caught by insufficient test coverage.
**Issues:** SG-02 (AI routes), SG-03 (semantic validator), FP-04 (NL-to-Cypher), FP-06 (attribution tagging), FP-07 (GraphQL resolver gaps)
**Risk:** Core product features appear to work but return meaningless output.

### Cluster 3: Authorization / Policy Coverage Gaps
**Root cause:** OPA infrastructure was wired incrementally; not all code paths were audited during rapid agent governance work. Most critical gaps were resolved in Feb 2026; residual gaps remain in GraphQL resolvers and webhook handlers.
**Issues:** SG-04, SG-06
**Risk:** Authorization bypass possible in specific code paths.

### Cluster 4: Performance Regressions (Backend + Frontend)
**Root cause:** Recent backend changes to graph query layer introduced N+1 or indexing regressions. Frontend Cytoscape.js not optimized for production dataset sizes.
**Issues:** PF-01 (GraphQL regression), PF-02 (graph rendering lag)
**Risk:** Analyst workspace is unusable for large-scale investigations.

### Cluster 5: Audit/Compliance Trail Gaps
**Root cause:** Audit logging was implemented for major events but tag deletion handlers were not wired.
**Issues:** CA-01, CA-02
**Risk:** Regulatory exposure; governance drift.

### Cluster 6: Observability Blind Spots
**Root cause:** Metrics were designed but not implemented in several services. No live production telemetry in repo.
**Issues:** OB-01, OB-02, OB-03
**Risk:** Cannot detect production issues proactively; all prioritization is reactive.

### Cluster 7: Operational Security (n8n / Credentials)
**Root cause:** CVE-2026-21858 found, version gate created, runbook written — but DevOps execution step never completed.
**Issues:** SG-01
**Risk:** Potential credential compromise across all n8n-connected automation.

---

## 4. Regressions vs. Pre-Existing Debt

### Regressions Introduced by Recent Release Work
- **RC-01** (178 failing tests) — GA merge window remediation introduced ESM/CJS breaks
- **RC-02** (TS build errors) — `ui/generated/tokens.d.ts` appears to be a malformed code-gen output; `TimelineRail.tsx` is truncated (archive file that was partially written)
- **PF-01** (GraphQL regression) — Explicitly described as "a recent backend change" in issue #4

### Pre-Existing Debt (Not Release-Induced)
- SG-02, SG-03, FP-04, FP-06, FP-07 — stub implementations present from initial development
- SG-04 (OPA gaps) — partially resolved pre-GA, residual gaps remain
- PF-02 (graph rendering) — present in issue tracker pre-GA
- FP-02, FP-03 — filed as open issues pre-GA

---

## 5. Operational Mitigation Notes

| Issue | Operational Mitigation Available? |
|-------|----------------------------------|
| SG-01 (n8n creds) | Execute runbook — no code change needed |
| SG-02 (AI routes mock) | Feature flag or route-level disable until real LLM wired |
| SG-03 (semantic validator) | Already feature-flagged off — maintain |
| RC-01 (test failures) | Block releases until resolved — no operational workaround |
| PF-01 (GraphQL perf) | Increase caching TTL as short-term bridge |
| PF-02 (graph rendering) | Document node/edge limits; add UI warning |
| CA-01 (audit trail gap) | Ops-side log scraping workaround (partial) |

---

*Next document: [PRIORITIZED_BACKLOG_2026-03-09.md](./PRIORITIZED_BACKLOG_2026-03-09.md)*
