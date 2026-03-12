# Summit Prioritized Backlog — 2026-03-09

**Generated:** 2026-03-09
**Based on:** `FEEDBACK_TRIAGE_2026-03-09.md`
**Priority taxonomy:** P0 = immediate / hotfix candidate · P1 = next iteration must-do · P2 = next iteration should-do · P3 = deferred

---

## Priority Stack

### P0 — Immediate / Hotfix Candidates

| ID | Title | Evidence | Subsystem | Effort |
|----|-------|----------|-----------|--------|
| **SG-01** | Execute n8n credential rotation (SEC-OPS-001) | CVE-2026-21858; runbook exists at `runbooks/n8n-credential-rotation.md` | DevOps ops | Hours (runbook execution) |
| **SG-02** | Replace scaffold LLM in AI summary route | `server/src/routes/ai.ts:465` TODO; every AI summary returns placeholder output | `server/src/routes/ai.ts`, `server/src/ai/` | S–M |
| **RC-01** | Restore CI green — fix ESM/CJS + Python dep gaps | `RELEASE_SUMMARY.md`: 178 failing suites; ESM/CJS in `src/middleware/authorization.ts`, `rapidfuzz` missing | `server/`, CI env | M |

**Rationale for P0 escalation:**
- SG-01: Active credential-compromise risk from unpatched CVE. Zero code change required — ops execution only.
- SG-02: The core differentiating feature (AI-assisted analysis) is returning placeholder text. Users receive garbage output.
- RC-01: All other testing-based acceptance criteria are meaningless until CI is green. This is a force multiplier on everything else.

---

### P1 — Next Iteration Must-Do

| ID | Title | Evidence | Subsystem | Effort |
|----|-------|----------|-----------|--------|
| **PF-01** | Fix GraphQL multi-hop query perf regression (200ms→800ms) | Issue #4; ~5k node graphs now 4× slower | `server/src/graphql/resolvers/`, Neo4j layer | M |
| **PF-02** | Fix graph rendering lag on large datasets | Issue #1; >10k nodes blocks main thread | `client/src/components/GraphCanvas.tsx`, Cytoscape.js | M |
| **RC-02** | Fix TS build errors in generated + archive files | `pnpm typecheck` confirms errors in `ui/generated/tokens.d.ts`, `v4/archive/.../TimelineRail.tsx` | `ui/generated/`, `v4/archive/` | XS |
| **SG-04** | Audit + close OPA gaps — GraphQL resolvers + webhook handlers | `SECURITY/opa-policy-coverage.md`: GraphQL partial, webhooks unknown | `server/src/graphql/resolvers/`, webhook handlers | M |
| **CA-01** | Wire audit logging for tag deletion events | Issue #5; compliance gap confirmed | Audit log service, tag handlers | S |
| **FP-02** | Fix real-time collaboration delta sync latency (>500ms) | Issue #2; race conditions in annotation sync | WebSocket layer, collab sync | M |
| **FP-03** | Improve entity resolution accuracy on noisy input | Issue #3; ~15% misclassification rate | `server/ml/er/`, ER pipeline | M–L |
| **FP-04** | Wire NL-to-Cypher to production Neo4j (or mark experimental) | `TECHNICAL_DEBT.md` P1; feature non-functional in prod | `server/src/ai/nl-to-cypher/` | S–M |
| **FP-05** | Complete Switchboard HITL Console — task feed + approval API | `TECHNICAL_AUDIT_REPORT_2026-01-20.md`: Epic 2 blocker | `apps/switchboard-web/`, `server/src/maestro/` | L |
| **FP-07** | Audit + resolve priority GraphQL resolver TODOs (17 open) | `TECHNICAL_DEBT.md`: incomplete API responses | `server/src/graphql/resolvers/` | M |
| **CA-02** | Implement branch protection as code | `COMET_TRIAGE_REPORT.md` Cluster A; governance drift | `.github/` branch config | S (blocked on admin token) |
| **SG-03** | Implement real semantic validator or document removal | `TECHNICAL_DEBT.md` P0→mitigated; feature-flagged, stub still present | `server/src/conductor/validation/semantic-validator.ts` | M–L |

---

### P2 — Next Iteration Should-Do

| ID | Title | Evidence | Subsystem | Effort |
|----|-------|----------|-----------|--------|
| **SG-05** | Remove DEBUG statements from production app bootstrap | `server/src/app.ts` grep; `process.stdout.write('[DEBUG]...')` in init path | `server/src/app.ts` | XS |
| **SG-06** | Add guard / test that ENABLE_INSECURE_DEV_AUTH never reaches staging/prod | `server/src/lib/auth.ts:71`; risk if NODE_ENV misconfigured | `server/src/lib/auth.ts`, CI env check | XS |
| **FP-06** | Implement attribution tagging (tokenization + provenance) | `TECHNICAL_DEBT.md` P1; legal/IP risk | `server/src/conductor/attribution/tag-builder.ts` | M |
| **OB-01** | Add real Prometheus metrics to streaming-ingest + tenant-api | `TECHNICAL_DEBT.md` P2; monitoring blind spot | `services/streaming-ingest/`, `companyos/services/tenant-api/src/middleware/metrics.ts` | S–M |
| **OB-02** | Wire real production telemetry to evidence sources | `companyos/src/evidence/sources.ts` TODO; analytics signals mocked | Analytics pipeline, `companyos/src/evidence/` | M |
| **OB-03** | Configure OpenTelemetry exporters in conductor UI | `analysis/todo_harvest.csv` P2; `conductor-ui/frontend/src/maestro/main-maestro.tsx:7` | `conductor-ui/frontend/` | S |
| **RC-03** | Add `--ci` / `--mock` flag to `./start.sh` for Docker-less environments | `backlog/golden-path-hardening.md` BB-002 | `./start.sh` | XS |
| **RC-04** | Make smoke test timeout configurable via env var | `backlog/golden-path-hardening.md` BB-004 | `scripts/smoke-test.js` | XS |
| **DF-01** | Implement WebAuthn step-up authentication | `TODO.md` item #54 | Auth layer | M |

---

### P3 — Deferred / Monitor

| ID | Title | Evidence | Notes |
|----|-------|----------|-------|
| **DF-02** | MCP Apps real adapter + signature key management | `backlog/DEFERRED_SUMMARY.md` | Blocked on security audit + infra |
| **DF-03** | Synthetic amplification detector (DET-SYN-001) | `backlog/threat-intel-backlog-2026-01-22.md` | Research phase, no labeled dataset |
| **DF-04** | Ingress-NGINX retirement / Gateway API migration | `backlog/DEFERRED_SUMMARY.md` | Requires cross-team coordination |
| — | Graph hybrid / Claim-level GraphRAG | `backlog/DEFERRED_SUMMARY.md` | Innovation lane — post-GA |
| — | BEND framing classifier training | `backlog/threat-intel-backlog-2026-01-22.md` | Research — needs labeled data |

---

## Observability Gaps Flagging Prioritization Uncertainty

The following items cannot be fully prioritized because real production signal is absent:

1. **OPA policy denial rate** — We know GraphQL resolvers have gaps, but cannot quantify how often denials are bypassed in production.
2. **AI summary usage frequency** — SG-02 is rated P0 based on feature criticality, but actual usage rate is unknown.
3. **Collaboration sync usage rate** — FP-02 severity depends on how many concurrent users are using collaborative annotation.
4. **Entity resolution throughput** — FP-03 impact depends on ingestion volume, which has no live signal.
5. **NL-to-Cypher adoption** — If the feature is rarely used, FP-04 may drop to P2.

**Recommendation:** Instrument the five points above before the next iteration retro. Do not deprioritize based on absence of data — treat unknowns as medium risk until measured.

---

## Quick Win vs. Complex Work Matrix

| Item | Quick Win? | Rationale |
|------|-----------|-----------|
| SG-01 (n8n creds) | ✅ Yes | Pure ops execution — zero code |
| SG-05 (remove DEBUG) | ✅ Yes | One-line deletions in app.ts |
| SG-06 (dev auth guard) | ✅ Yes | Add assertion/test, no logic change |
| RC-02 (TS build errors) | ✅ Yes | Exclude archive file or fix truncated TSX |
| RC-04 (smoke timeout) | ✅ Yes | One-line env var read |
| RC-03 (start.sh CI flag) | ✅ Yes | Short script addition |
| CA-01 (audit tag deletion) | ✅ Yes | Wire one event emitter |
| FP-04 (NL-to-Cypher label) | ✅ Yes | Mark experimental in docs/UI if not fixing |
| PF-01 (GraphQL perf) | ❌ No | Requires query analysis + index changes |
| PF-02 (graph rendering) | ❌ No | Web worker + Cytoscape config work |
| FP-05 (Switchboard HITL) | ❌ No | Full feature build |
| SG-03 (semantic validator) | ❌ No | Either real implementation or full removal |
| RC-01 (CI green) | ❌ No | Module system + environment fixes |

---

*Next document: [ITERATION_PLAN_2026-03-09.md](./ITERATION_PLAN_2026-03-09.md)*
