# IntelGraph Dev Prompt — MVP‑0 ➜ GA Core (Highest Quality, Greatest Efficiency)

**Audience:** Core Devs, SRE, SecEng, FE/BE leads.  
**Objective:** Ship a _buildable, dependable_ MVP‑0 that cleanly scales to GA Core. Do the smallest thing that is lovable, observable, secure, and fast.

---

## 0) Prime Orders (read once, follow always)

- **Golden Path must never break:** _ingest → ER → analyze (graph/timeline/map) → copilot preview → export_.
- **Provenance Before Prediction:** every edge/node has `{source, transform, hash, confidence}`.
- **Policy by default:** OPA gates _read/write/execute_. All privileged queries and mutations audit.
- **Preview before power:** Copilot is **preview‑only** behind a feature flag; user must confirm before execute.
- **p95 speed:** 2‑hop neighborhood @ 50k nodes ≤ **1.5s** on reference stack.
- **Reproducible dev:** `make up` yields a working stack from clean clone.

---

## 1) Repo & Stack Baseline (do this first)

- Keep **monorepo** layout and dev **Docker Compose** as specified (Neo4j 5.x + GDS, Postgres 16, Redis, Kafka KRaft, MinIO, Keycloak, OPA, server, web, ingest‑processor, taxii‑puller).
- **Makefile** targets: `up`, `down`, `seed`, `perf` must work from zero.
- **Secrets:** remove any real `.env` from VCS; provide `.env.example`; Compose takes overrides via env.
- **CI:** single consolidated GitHub Actions workflow with jobs: _lint_, _unit_, _e2e_smoke_ (optional toggle), _CodeQL_. Pin actions to SHAs. (Use provided pinning script.)

---

## 2) Branch & PR Plan (merge in this order)

1. `feature/infra-dev-compose` — Compose, Makefile, CI. **PR#1: bootable dev stack**
2. `feature/graph-core-schema` — SDL, resolvers, indexes, seed, projections. **PR#2: graph core + provenance**
3. `feature/ingest-csv-stix` — Kafka consumer, CSV mapper, TAXII puller → Neo4j/MinIO. **PR#3: ingest**
4. `feature/er-v1` — deterministic rules + PG queue + adjudication API. **PR#4: ER v1**
5. `feature/analytics-gds` — shortest path + louvain via GDS. **PR#5: analytics**
6. `feature/abac-opa-audit` — OPA policy, middleware, audit. **PR#6: governance**
7. `feature/ui-tripane` — graph/map/timeline + command bar. **PR#7: tri‑pane UI**
8. `feature/copilot-preview` — rules‑only NL→Cypher translator, feature flag. **PR#8: Copilot**

> **Rule:** Each PR ships with fixtures, docs snippets, and at least one happy‑path test.

---

## 3) High‑Value Fixes (catch now, save weeks later)

- **AuthZ directive enforcement:** Implement a GraphQL plugin that inspects `@authz(resource, action)` on fields/types and calls `ctx.authorize({ type: resource, tenant: ctx.tenant, labels: [], sensitivity: 'internal' }, action)`. Deny → 403 with reason from OPA.
- **`decideER` contract bug:** Cypher merge uses `input.leftId/rightId` but `ERDecisionInput` only has `{id, decision, merge}`. **Fix:** extend input to `{id, leftId, rightId, decision, merge}` or fetch pair from `er_candidates` before merge. Add test.
- **Apollo app export for tests:** Export `app`/`server` from server module so Jest/Supertest can import it. Align test import path.
- **GDS projection:** Seed must run `CALL gds.graph.project('g','*','*',{ relationshipProperties:['weight'] })`. Add idempotent check.
- **Neo4j full‑text index:** Create `entity_fulltext` during seed. Verify `search` resolver executes against it.
- **MinIO bucket bootstrap:** Ensure `intelgraph` bucket exists at start (ingest writes STIX bundles). Add healthcheck.
- **Keycloak dev realm:** Include dev realm export; README: how to login; stub user mapping.
- **OPA input contract parity:** Match Rego policy expectations (tenant + labels + sensitivity); log deny reasons.
- **Cost budget guard:** Enforce `ctx.costBudget` in resolvers (depth/rows caps). Log trims.

---

## 4) Contracts & Schemas (don’t drift)

- **GraphQL SDL** (keep as provided) with `Node`, `Policy`, `Person/Org/Document`, `REL`, analytics queries, ingest/audit/ER/copilot mutations.
- **OPA Policy** (ABAC): tenant match, role gate, label blocklist. Keep policy and middleware input in lockstep.
- **Postgres**: `audit_log`, `er_candidates` tables + indexes exactly as in migration.
- **Kafka topics:** `intelgraph.raw` at minimum. Consumer group `ingest-processor`.

---

## 5) Service Tasks (definition per component)

### apps/server

- Express + Apollo v4. Context contains `{ user, tenant, authorize, driver, pool, costBudget, copilotPreviewEnabled }`.
- Implement **authz plugin** for `@authz` (see §3). Add request‑scoped `purpose` and `legal_basis` from headers.
- **Audit** helper `recordAudit` is used on every mutation + privileged queries.
- **Analytics** resolvers call GDS; ensure parameter caps (hop≤3, limit≤1000). Handle empty results gracefully.
- **Copilot Preview** uses rules‑only translator; never auto‑exec. Return `{enabled, cypher, note}`.

### apps/ingest-processor

- Kafka consumer routes `csv` and `stix`. Persist STIX bundle to MinIO, map selected objects into Neo4j.
- CSV handler: apply mapping; tag PII; upsert `Person` with base `policy` fields.
- **ER v1** utility (`er.ts`): generate candidates at score ≥ 0.92; insert queue rows with explanation payload.

### apps/taxii-puller

- Python TAXII 2.1 client. Config via env. Emits to `intelgraph.raw`. Sleep loop is fine for MVP.

### apps/web

- React 18 tri‑pane (Cytoscape, Mapbox, simple timeline). Command bar posts to Copilot Preview and shows generated Cypher.
- Provenance tooltips on edges (source, transform, hash, confidence). Time‑brushing sync is out of scope for MVP, keep minimal.

### packages/\*

- `schema/` with SDL + TS types generation.
- `shared/` utils/logging.
- `policy/` OPA client + policy test fixtures.

---

## 6) Observability, Perf, Security (non‑negotiables)

- **Metrics & tracing:** Add `/metrics` and OTEL traces for GraphQL resolvers; log p95 by field.
- **k6 perf script:** Provide script for 2‑hop neighborhood @ 50k nodes; gate p95 ≤ 1.5s.
- **Structured logs:** Pino JSON; include `tenant`, `sub`, `purpose`, `decisionId` for audit joins.
- **Supply‑chain hygiene:** Actions pinned to SHAs; CodeQL on PR; no secrets in repo; `.env.example` only.
- **ABAC verifiability:** Denials return human‑readable reasons; audit includes `purpose` and `legal_basis`.

---

## 7) Dev UX & Docs

- **README.md** top‑level: one‑pager _How to boot_, _How to seed_, _How to run tests_, _How to perf‑check_.
- **/docs** snippets: curl examples for GraphQL queries/mutations; OPA decision example; MinIO bucket bootstrap.
- **Seed script** populates a tiny but meaningful graph with provenance on edges.

---

## 8) Definition of Done (MVP‑0)

- ✅ `make up` from clean clone yields **green** stack; UI loads; GraphQL healthcheck green.
- ✅ p95 ≤ **1.5s** for 2‑hop neighborhood @ 50k nodes (k6 script green).
- ✅ Every edge carries `{source, transform, hash, confidence}`; tooltips visible in UI.
- ✅ OPA gates read/write; audit log populated for all mutations + privileged queries.
- ✅ Copilot returns Cypher **without auto‑execute**; user must confirm.
- ✅ Tri‑pane UI functional; simple sync between graph selections and timeline list.

---

## 9) Quality Gates (CI)

- **Lint:** ESLint/Prettier (JS/TS), Ruff (Py) — zero warnings.
- **Tests:** Jest unit + Supertest for GraphQL; PyTest for TAXII; one smoke Playwright path (optional).
- **Security:** CodeQL (JS/TS, Python) — no criticals.
- **Workflow hygiene:** All actions pinned to SHAs; pinning script in `scripts/` and documented policy.

---

## 10) GA Core Trajectory (lock the runway now)

- Keep interfaces that enable GA add‑ons:
  - **Provenance & Claim Ledger** service boundary for verifiable exports.
  - **Graph‑XAI** hooks (store parameters, rationales) for analytics/ER explainers.
  - **Cost guard** in context; make it observable.
  - **Case/tenant policy labels** on nodes/edges for future compartmentation.
- Defer advanced features (simulations, deception lab, federated search) — but don’t block their API paths.

---

## 11) Acceptance Fixtures (ship with PRs)

- Seed dataset with 10–20 `Person` nodes, a few `Org/Document`, and edges containing full provenance.
- Golden queries (persisted): `neighbors`, `analyticsShortestPath`, `analyticsCommunities` with expected shapes.
- OPA decision fixtures: allow + deny cases with label blocklist.
- ER queue sample: one true‑positive candidate ≥ 0.92 and one borderline.

---

## 12) Risk Checks & Mitigations

- **Copilot misuse:** stays preview‑only; logs prompts; cap cost; no external LLM in MVP.
- **Policy drift:** version OPA policies; add unit tests; simulate changes against audit log (future).
- **Data poisoning:** tag sources; basic sanity checks in ingest; quarantine noisy feeds.
- **Cost creep:** expose per‑query cost estimate in logs; add budget warnings.

---

## 13) Done‑Done Checklist (pre‑merge to `main`)

- [ ] All PRs green on CI; actions pinned.
- [ ] README updated; getting‑started verified by a fresh clone.
- [ ] k6 perf report attached to PR#5.
- [ ] Security review notes for OPA policy and audit coverage attached to PR#6.
- [ ] Short demo script (commands + clicks) checked into `/docs/demo.md`.

---

### Appendix — Quick Commands

```bash
# Boot dev
make up

# Seed graph (indexes, FT index, GDS projection, sample data)
make seed

# Run perf
make perf

# Run tests (monorepo)
pnpm -r test -- --ci
```

**Execute. Keep it small, safe, and fast.**
