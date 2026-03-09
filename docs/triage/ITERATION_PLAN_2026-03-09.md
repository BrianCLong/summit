# Summit Next-Iteration Execution Plan — 2026-03-09

**Plan Date:** 2026-03-09
**Scope:** Cycle immediately following triage pass
**Inputs:** `FEEDBACK_TRIAGE_2026-03-09.md`, `PRIORITIZED_BACKLOG_2026-03-09.md`
**Organization:** Workstreams ordered by dependency + time-to-value. Hotfixes first.

---

## Execution Phases

### Phase A — Hotfixes (Ops + Zero-Code) · Day 1–2

These require no code review cycle. Execute immediately.

---

#### A-1: Execute n8n Credential Rotation

| Field | Value |
|-------|-------|
| **ID** | SG-01 |
| **Priority** | P0 |
| **Owner** | DevOps / Security |
| **Problem** | CVE-2026-21858 in self-hosted n8n. Version gate is in CI but credentials (GitHub PATs, AI API keys, DB credentials) in n8n workflows have not been rotated. |
| **Evidence** | `backlog/threat-intel-backlog-2026-01-22.md` item SEC-OPS-001; `backlog/DEFERRED_SUMMARY.md` P0 item dated 2026-02-06 |
| **Affected subsystem** | n8n automation, all connected integrations |
| **Fix direction** | Follow `runbooks/n8n-credential-rotation.md`. No code change required. |
| **Acceptance criteria** | All GitHub PATs, AI API keys, and DB credentials in n8n are rotated. Rotation evidence logged in `AGENT_ACTIVITY.md` or ops ticket. |
| **Validation** | Post-rotation: confirm n8n workflows execute successfully against new credentials. |

---

#### A-2: Remove DEBUG Statements from App Bootstrap

| Field | Value |
|-------|-------|
| **ID** | SG-05 |
| **Priority** | P2 → quick win, fold into A-phase |
| **Owner** | Backend |
| **Problem** | `server/src/app.ts` contains multiple `process.stdout.write('[DEBUG] ...')` calls in the initialization path. These fire on every server start, polluting production logs and potentially disclosing initialization sequence to log aggregators. |
| **Evidence** | Live grep of `server/src/app.ts` |
| **Files to touch** | `server/src/app.ts` (6 lines) |
| **Fix direction** | Replace `process.stdout.write('[DEBUG]...')` with `logger.debug()` calls (or remove if already covered by startup logs). |
| **Acceptance criteria** | No raw `process.stdout.write('[DEBUG]')` in app.ts; server start still logs expected messages via logger. |
| **Validation** | `grep -n "process.stdout.write.*\[DEBUG\]" server/src/app.ts` returns 0 matches. |

---

#### A-3: Add CI Guard — ENABLE_INSECURE_DEV_AUTH Must Not Reach Non-Dev

| Field | Value |
|-------|-------|
| **ID** | SG-06 |
| **Priority** | P2 → quick win |
| **Owner** | Backend / CI |
| **Problem** | `server/src/lib/auth.ts:71` allows unauthenticated requests if `ENABLE_INSECURE_DEV_AUTH=true` AND `NODE_ENV=development`. Risk: if NODE_ENV is misconfigured in staging/prod, all auth is bypassed. |
| **Evidence** | `server/src/lib/auth.ts:71`, `server/src/app.ts:337` |
| **Files to touch** | CI env config or startup assertion |
| **Fix direction** | Add a startup assertion: if `ENABLE_INSECURE_DEV_AUTH=true` and `NODE_ENV !== 'development'`, throw and refuse to start. Alternatively, add a CI lint rule checking env var combinations. |
| **Acceptance criteria** | Server refuses to start with `ENABLE_INSECURE_DEV_AUTH=true` outside development. Documented in `.env.example`. |
| **Validation** | Manual: set `ENABLE_INSECURE_DEV_AUTH=true NODE_ENV=production node server/src/app.ts` — expect crash with clear error. |

---

### Phase B — Stabilization · Days 2–7

Restore CI integrity and fix build-breaking issues. All other work is blocked on RC-01.

---

#### B-1: Restore CI Green (ESM/CJS + Python Deps)

| Field | Value |
|-------|-------|
| **ID** | RC-01 |
| **Priority** | P0 |
| **Owner** | Platform / Backend |
| **Problem** | 178 test suites failing post-GA merge. Primary causes: (1) ESM/CJS interop (`ReferenceError: module is not defined` in `src/middleware/authorization.ts` et al.), (2) missing Python dep `rapidfuzz` for ML ER tests, (3) semantic type errors in jsonwebtoken and multer. |
| **Evidence** | `RELEASE_SUMMARY.md`: "PROCEED WITH CAUTION. Test suite severely degraded." `GA_RELEASE_PACKET.md`: 31 remaining failing suites. |
| **Files to touch** | `server/src/middleware/authorization.ts`, CI Dockerfile or setup scripts (`scripts/setup.sh`), potentially package.json module type |
| **Fix direction** | (1) ESM/CJS: audit `authorization.ts` for `module` usage; add `"type": "module"` if needed or convert to ESM-compatible imports. (2) Python: add `rapidfuzz` to `requirements.txt` or CI environment Dockerfile. (3) Type errors: add overrides or type augmentations for jsonwebtoken/multer where signatures diverge. |
| **Acceptance criteria** | `pnpm test:unit` passes with ≥90% of suites green. Zero `ReferenceError: module is not defined` in CI logs. |
| **Validation** | CI pipeline shows green test gate. Record suite count before/after. |

---

#### B-2: Fix TypeScript Build Errors

| Field | Value |
|-------|-------|
| **ID** | RC-02 |
| **Priority** | P1 |
| **Owner** | Frontend / Platform |
| **Problem** | `pnpm typecheck` fails on: (1) `ui/generated/tokens.d.ts:106+` — syntax errors in generated file (hyphenated key names like `ease-in` are invalid TypeScript identifiers); (2) `v4/archive/frontend-migration/web/src/components/panels/TimelineRail.tsx` — file is truncated mid-JSX. |
| **Evidence** | `pnpm typecheck` output 2026-03-09 |
| **Files to touch** | `ui/generated/tokens.d.ts`, `v4/archive/frontend-migration/web/src/components/panels/TimelineRail.tsx` |
| **Fix direction** | (1) `tokens.d.ts`: fix codegen to quote hyphenated keys (`"ease-in": string`) or regenerate. (2) `TimelineRail.tsx`: either complete the truncated file or add the `v4/archive` path to `tsconfig.json` exclude list (it is archive code and should not be type-checked). |
| **Acceptance criteria** | `pnpm typecheck` exits 0 (after node_modules installed) with no errors in these two files. |
| **Validation** | Run `pnpm install && pnpm typecheck` in CI. |

---

#### B-3: Make Smoke Test Timeout Configurable

| Field | Value |
|-------|-------|
| **ID** | RC-04 |
| **Priority** | P2 → XS effort |
| **Owner** | Platform / DevX |
| **Problem** | `scripts/smoke-test.js` has hardcoded 30s timeout causing false negatives on cold CI starts. |
| **Evidence** | `backlog/golden-path-hardening.md` BB-004 |
| **Files to touch** | `scripts/smoke-test.js` (1 line) |
| **Fix direction** | `const timeout = parseInt(process.env.SMOKE_TIMEOUT ?? '60000', 10)` — default 60s, CI can override. |
| **Acceptance criteria** | `SMOKE_TIMEOUT=90000 make smoke` uses 90s timeout. Default is 60s. |
| **Validation** | Manual: set `SMOKE_TIMEOUT=1 make smoke` — confirms env var is read. |

---

### Phase C — Core Product Fixes · Days 3–12

Address the highest-impact user-facing defects.

---

#### C-1: Wire Real LLM to AI Summary Route

| Field | Value |
|-------|-------|
| **ID** | SG-02 / FP-01 |
| **Priority** | P0 |
| **Owner** | AI / Backend |
| **Problem** | `server/src/routes/ai.ts:465` calls `generateScaffoldAISummary()` — a stub that returns canned template text. Every AI-assisted summary request returns placeholder content. This is the primary AI-differentiating feature. |
| **Evidence** | `analysis/todo_harvest.csv` (P0, `server/src/routes/ai.ts:428`); source confirms `TODO: Replace with actual LLM integration` |
| **Files to touch** | `server/src/routes/ai.ts`, `server/src/ai/` (LLM client) |
| **Fix direction** | Wire `generateScaffoldAISummary()` call to the existing LLM client abstraction in `server/src/ai/`. Confirm the LLM client is configured with a real provider (not demo mode). Fallback: if provider key is absent, return HTTP 503 with a clear message rather than scaffold output. |
| **Acceptance criteria** | POST `/api/ai/summary` with a real `entityId` returns a non-scaffold response. Scaffold output (`TODO:`) must never appear in the response body. Fallback returns 503 if LLM unconfigured. |
| **Validation** | Integration test: seed a test entity, call the endpoint, assert response does not contain "TODO" and has >50 chars. |

---

#### C-2: Fix GraphQL Multi-Hop Query Performance Regression

| Field | Value |
|-------|-------|
| **ID** | PF-01 |
| **Priority** | P1 |
| **Owner** | Backend / Data |
| **Problem** | Multi-hop neighbor retrieval latency increased from ~200ms to ~800ms for moderate graphs (~5k nodes) after a recent backend change. |
| **Evidence** | Issue #4 (`issue_04_graphql_query_perf_regression.md`) |
| **Files to touch** | `server/src/graphql/resolvers/` (query resolvers for graph traversal), Neo4j Cypher queries |
| **Fix direction** | (1) `git log --oneline --all` to identify the commit that changed graph resolvers. (2) Profile with `EXPLAIN` / `PROFILE` in Cypher to find full scans or missing index use. (3) Add indexes on traversal keys. (4) Check for N+1 in DataLoader batching. |
| **Acceptance criteria** | Multi-hop neighbor query (3-hop, ~5k node graph) completes in ≤250ms at p95 in integration test. |
| **Validation** | Add a benchmark test with a seeded graph fixture. Record before/after timings. |

---

#### C-3: Fix Graph Rendering Lag on Large Datasets

| Field | Value |
|-------|-------|
| **ID** | PF-02 |
| **Priority** | P1 |
| **Owner** | Frontend |
| **Problem** | Cytoscape.js-based graph canvas blocks the main thread when rendering >10k nodes / 20k edges. Layout calculations are synchronous, causing UI freeze. |
| **Evidence** | Issue #1 (`issue_01_graph_rendering_lag.md`) |
| **Files to touch** | `client/src/components/GraphCanvas.tsx`, new `layout-worker.ts` (web worker) |
| **Fix direction** | (1) Offload layout computation to a web worker (`layout-worker.ts`). (2) Enable Cytoscape.js performance options: `textureOnViewport: true`, `hideEdgesOnViewport: true`, `hideLabelsOnViewport: true`. (3) Add incremental rendering for initial load. (4) Enforce a soft cap (UI warning) at >10k nodes until full optimization is validated. |
| **Acceptance criteria** | Graph with 10k nodes/20k edges renders without main thread blocking (no jank on scroll/zoom). FPS ≥ 30 on reference hardware. Layout completes without freezing. |
| **Validation** | Lighthouse performance audit with large graph fixture. Manual test on mid-spec machine. |

---

#### C-4: Wire Audit Logging for Tag Deletion

| Field | Value |
|-------|-------|
| **ID** | CA-01 |
| **Priority** | P1 |
| **Owner** | Backend / Compliance |
| **Problem** | Tag deletion by users is not recorded in the audit trail. This is a compliance gap — regulatory requirements mandate "who deleted what when." |
| **Evidence** | Issue #5 (`issue_05_incomplete_audit_trail.md`) |
| **Files to touch** | Tag deletion handler (likely `server/src/graphql/resolvers/` or `server/src/cases/`), audit log service wiring |
| **Fix direction** | Find the tag deletion mutation/endpoint. Add `auditLog.emit({ action: 'TAG_DELETED', userId, tagId, tagDetails, timestamp })` call. Verify the event reaches the audit persistence layer (PostgreSQL `provenance_ledger` or equivalent). |
| **Acceptance criteria** | Deleting a tag via the UI/API creates an audit log entry containing: userId, tagId, tag content, timestamp. Entry is queryable from the audit API. |
| **Validation** | Integration test: create tag, delete tag, query audit log — assert entry exists. |

---

#### C-5: Fix Real-Time Collaboration Delta Sync Latency

| Field | Value |
|-------|-------|
| **ID** | FP-02 |
| **Priority** | P1 |
| **Owner** | Backend / Frontend |
| **Problem** | Annotation delta sync can take up to 500ms, causing race conditions and inconsistent state between collaborators. |
| **Evidence** | Issue #2 (`issue_02_collab_delta_sync_latency.md`) |
| **Files to touch** | WebSocket server, collab sync service, client collab hook |
| **Fix direction** | (1) Profile current round-trip: client emit → server → broadcast → client. (2) Switch from polling/request-response to WebSocket push for delta propagation. (3) Implement last-write-wins (LWW) for simple annotation conflicts. (4) Add client-side optimistic update for own changes. |
| **Acceptance criteria** | Delta sync round-trip ≤100ms at p95 for a 5-user concurrent session. No state divergence after 100 rapid edits. |
| **Validation** | Load test with 5 simulated concurrent collaborators making edits. Measure broadcast latency. |

---

#### C-6: Close OPA Coverage Gaps — GraphQL + Webhooks

| Field | Value |
|-------|-------|
| **ID** | SG-04 |
| **Priority** | P1 |
| **Owner** | Security / Backend |
| **Problem** | GraphQL resolver-level authorization is partial (some resolvers bypass OPA). Webhook handler authorization status is unknown. |
| **Evidence** | `SECURITY/opa-policy-coverage.md`: GraphQL = "Partial", Webhooks = "Unknown" |
| **Files to touch** | `server/src/graphql/resolvers/` (audit each resolver), webhook handler files |
| **Fix direction** | (1) Enumerate all GraphQL resolvers. For each, confirm OPA middleware is applied or justify exemption. (2) Identify all webhook handler entry points. For each, confirm auth validation or add. (3) Update `SECURITY/opa-policy-coverage.md` coverage matrix. |
| **Acceptance criteria** | All GraphQL mutations and sensitive queries have OPA enforcement. All webhook handlers validate request signatures or bearer tokens. Coverage matrix updated to all-green or explicitly documented exempt. |
| **Validation** | Security test: call an OPA-protected mutation without credentials — expect 403. Call a webhook without valid signature — expect 401. |

---

#### C-7: Audit + Resolve Priority GraphQL Resolver TODOs

| Field | Value |
|-------|-------|
| **ID** | FP-07 |
| **Priority** | P1 |
| **Owner** | Backend |
| **Problem** | 17 TODOs in GraphQL resolvers. Key gaps: missing Neo4j entity fetch in `graphragResolvers.ts:175`, no shared schema package for watchlists. These result in incomplete API responses. |
| **Evidence** | `TECHNICAL_DEBT.md` Section 4; grep confirms markers |
| **Files to touch** | `server/src/graphql/resolvers/graphragResolvers.ts`, `server/src/graphql/watchlists.ts`, others |
| **Fix direction** | Triage the 17 TODOs. Fix the top 5 that affect live user queries (identify via usage analysis or by checking which resolvers are called in E2E test flows). Stub the rest with proper error responses instead of silently returning null/empty. |
| **Acceptance criteria** | Top 5 resolver TODOs resolved with real implementations. All remaining stubs return explicit errors (not silent nulls). |
| **Validation** | Run E2E smoke test; assert no "null" results appear in watchlist or graph queries. |

---

#### C-8: Wire NL-to-Cypher to Production or Mark Experimental

| Field | Value |
|-------|-------|
| **ID** | FP-04 |
| **Priority** | P1 |
| **Owner** | AI / Backend |
| **Problem** | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts:176` has `TODO: Connect to Neo4j sandbox`. Natural language graph queries are presented as available but return demo output. |
| **Evidence** | `TECHNICAL_DEBT.md` P1; `analysis/todo_harvest.csv` P1 |
| **Files to touch** | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts` |
| **Fix direction** | Option A (preferred): Wire to production Neo4j using existing connection infrastructure. Option B (fast): Add `[EXPERIMENTAL]` label in UI, return 501 Not Implemented with message from the endpoint, update docs. |
| **Acceptance criteria** | Either: NL query produces a valid Cypher result from production graph. Or: endpoint returns 501 with documentation link and UI clearly marks the feature as experimental. |
| **Validation** | Smoke test with a simple NL query. |

---

### Phase D — Observability Foundation · Days 5–14 (parallel with C)

---

#### D-1: Add Real Prometheus Metrics to Key Services

| Field | Value |
|-------|-------|
| **ID** | OB-01 |
| **Priority** | P2 |
| **Owner** | Platform / SRE |
| **Problem** | `services/streaming-ingest`, `services/ingest-adapters`, and `companyos/services/tenant-api/src/middleware/metrics.ts` have stubbed or missing Prometheus metrics. SLOs cannot be measured against real data. |
| **Evidence** | `TECHNICAL_DEBT.md` P2; `analysis/todo_harvest.csv` |
| **Files to touch** | `companyos/services/tenant-api/src/middleware/metrics.ts`, `services/streaming-ingest/src/`, `services/ingest-adapters/src/` |
| **Fix direction** | For each service: add `prom-client` (or existing shared metrics package) export for request count, error count, and latency histogram. Wire to existing Prometheus scrape endpoint. |
| **Acceptance criteria** | All three services export `/metrics` with populated request and error rate counters. SLO dashboards can be populated from real data. |
| **Validation** | `curl http://localhost:{port}/metrics` returns populated `http_requests_total` and `http_request_duration_seconds` for each service. |

---

#### D-2: Wire Real Evidence Sources for Usage Telemetry

| Field | Value |
|-------|-------|
| **ID** | OB-02 |
| **Priority** | P2 |
| **Owner** | Platform / Analytics |
| **Problem** | `companyos/src/evidence/sources.ts` has `TODO: Replace stubbed metrics with actual scrape`. The evidence collection pipeline returns synthetic data, making dashboards and triage reports unreliable. |
| **Evidence** | `analytics/SIGNALS.md`: usage signals noted as "mocked or real later"; `analysis/todo_harvest.csv` P2 |
| **Files to touch** | `companyos/src/evidence/sources.ts` |
| **Fix direction** | Replace stub implementations with actual Prometheus API scrape calls (or internal metrics endpoint calls). Prioritize: feature usage counts and latency percentiles for the top-3 analyst workflows. |
| **Acceptance criteria** | `companyos/src/evidence/sources.ts` returns real metrics values (not hardcoded). Evidence bundle shows non-zero, varying values across runs. |
| **Validation** | Run evidence collection twice with different system load. Confirm output values differ. |

---

### Phase E — Deferred Until More Evidence

The following items are intentionally deferred pending better telemetry or unblocking conditions:

| ID | Item | Blocker |
|----|------|---------|
| FP-05 | Switchboard HITL Console full build | Needs Epic 1 governance middleware complete (SG-03/SG-04 first) |
| SG-03 | Real semantic validator | Requires HuggingFace API integration design decision |
| FP-03 | Entity resolution accuracy | Requires labeled dataset for fine-tuning |
| FP-06 | Attribution tagging full impl | Depends on LLM client maturity (SG-02 first) |
| CA-02 | Branch protection as code | Blocked on admin token + org policy alignment |
| DF-01 | WebAuthn step-up auth | P2, no immediate blockers but requires auth redesign |

---

## Sequencing and Dependencies

```
Day 1–2:  A-1 (n8n creds — ops)
          A-2 (remove DEBUG — trivial)
          A-3 (dev auth guard — trivial)

Day 2–5:  B-1 (CI green — foundation for everything)
          B-2 (TS build errors — enables typecheck gate)
          B-3 (smoke timeout — trivial)

Day 3–8:  C-1 (LLM wiring — P0, parallel with B-1)
          C-4 (audit tag deletion — small, parallel)
          C-8 (NL-to-Cypher label or wire — small, parallel)

Day 5–10: C-2 (GraphQL perf regression — requires CI green first)
          C-3 (graph rendering — requires CI green first)
          C-6 (OPA audit — parallel)
          C-7 (resolver TODOs — parallel)

Day 5–14: D-1 (Prometheus metrics — parallel, low risk)
          D-2 (evidence sources — parallel)

Day 8–14: C-5 (collab sync — after basic stability confirmed)

Post-iteration: F-phase items (Switchboard HITL, semantic validator, entity resolution)
```

---

## Acceptance Criteria Summary (Iteration Exit Gate)

The iteration is complete when:

- [ ] n8n credentials rotated and confirmed (SG-01)
- [ ] `pnpm test:unit` passes ≥90% of test suites (RC-01)
- [ ] `pnpm typecheck` exits 0 (RC-02)
- [ ] AI summary route returns non-scaffold LLM output or 503 (SG-02 / C-1)
- [ ] GraphQL multi-hop query p95 ≤ 250ms in benchmark (PF-01 / C-2)
- [ ] Tag deletion audit log entry verified in integration test (CA-01 / C-4)
- [ ] No `process.stdout.write('[DEBUG]')` in `server/src/app.ts` (SG-05 / A-2)
- [ ] OPA coverage matrix updated — no "Unknown" rows (SG-04 / C-6)
- [ ] At least 3 services export real Prometheus metrics (OB-01 / D-1)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| B-1 (CI restore) takes longer than 5 days | MEDIUM | HIGH — blocks all test-verified work | Timebox to 3 days; if not resolved, proceed with C items and create stub tests |
| C-1 (LLM wiring) blocked by missing API key | MEDIUM | HIGH | Confirm key provisioning in infra first; fallback to 503 route |
| C-2 (GraphQL perf) regression source unclear | MEDIUM | MEDIUM | Use git bisect + query profiler; timebox investigation to 2 days |
| C-3 (graph rendering) web worker introduces complexity | LOW | MEDIUM | Feature-flag behind `ENABLE_LAYOUT_WORKER`; ship incrementally |
| SG-04 (OPA audit) finds more gaps than expected | MEDIUM | HIGH | Scope to 1-week audit; document gaps and create follow-on tickets rather than blocking iteration |

---

## Files Changed by This Triage Pass

- `docs/triage/FEEDBACK_TRIAGE_2026-03-09.md` (new)
- `docs/triage/PRIORITIZED_BACKLOG_2026-03-09.md` (new)
- `docs/triage/ITERATION_PLAN_2026-03-09.md` (this file, new)

No source code was modified by this triage pass. All work items are tracked as discrete commits in the next iteration.

---

## Blind Spots and Missing Telemetry

1. **No live production error rates** — all severity ratings are based on code inspection and static analysis, not measured failure rates. Once OB-01/OB-02 are resolved, re-prioritize based on real data.
2. **Usage frequency unknown** — cannot confirm which features are heavily used vs. rarely touched. AI summary (SG-02) is rated P0 based on strategic importance, not measured call volume.
3. **Collaboration adoption** — FP-02 rated P1 based on issue filing; if collaborative annotation is rarely used in current deployments, this could drop to P2.
4. **ER accuracy measurement** — the 15% misclassification rate in FP-03 is from the issue report, not from a production evaluation run. A real evaluation harness would sharpen this.
5. **Bug bash artifacts incomplete** — `BUG_BASH_REPORT_20250922.md` P0-critical.md is an empty template. There may be additional issues from the bug bash that are untracked.
