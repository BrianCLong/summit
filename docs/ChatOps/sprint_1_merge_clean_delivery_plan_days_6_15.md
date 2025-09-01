# Sprint 1 — Merge‑Clean Delivery Plan (Days 6–15)

**Objective:** Ship the first functional slice of all eight tracks with deterministic behavior, contract‑driven interfaces, production‑grade CI gates, and demoable UX. Every PR must be merge‑clean: zero contract drift, deterministic outputs, and identical CI matrix across services.

---

## Global Readiness (All Teams)
- **Branch Protection:** `main` requires: status checks (lint, unit, contracts, security, sbom), 2 reviews, signed commits, linear history.
- **Versioning:** Tag each service `v0.1.0` on Sprint 1 completion.
- **Feature Flags:** One flag per PR, default OFF.
- **Logging:** Structured JSON, correlation IDs; never log PII.
- **Docs:** Update `README.md` and add one ADR per significant decision.
- **Security:** Trivy high severity fail gate; license allowlist enforced.

**CI augmentations (add now):**
- `graphql-inspector` diff check on gateway.
- `spectral` OpenAPI lint in prov‑ledger.
- OPA unit tests in policy.
- Reproducibility test job (prov, ER, NL→Cypher) — rerun with two seeds and assert byte‑for‑byte equality of artifacts.

**Release Artifacts:** Docker images, Helm charts, SBOM (`syft`), Provenance attestation (in‑toto layout stub acceptable).

---

## 1) Provenance & Claim Ledger — **Functional v1**
**Goal:** Deterministic manifests (Merkle + JWS), claim graph CRUD, outbox events.

### Deliverables
- **Endpoints**
  - `POST /v0/evidence` — validate against `/contracts/prov/evidence.schema.json`; persist; return `{evidenceId}`.
  - `POST /v0/claims` — validate, link evidence, store; return `{claimId}`.
  - `GET /v0/claims/{id}/manifest` — build canonical manifest:
    - Canonical JSON (UTF‑8, sorted keys).
    - Merkle root over ordered artifact hashes.
    - JWS (ES256) with detached payload; include `issuedAt`, `issuer`, `chainOfCustody`.
- **Outbox**: append `claim.created`/`evidence.registered` JSON files with SHA256 chain (tamper‑evident).
- **OpenAPI 3.1**: Generated from code; spectral lint must pass.
- **Migrations**: Versioned; repeatable.

### Tests (Acceptance)
- Golden vectors: same input → identical manifest bytes.
- Negative: invalid schema → 422; missing evidence → 404.
- Outbox integrity: verify SHA chain over 50 appended events.

### Example (fixture)
```http
POST /v0/evidence
{"uri":"https://ex.com/a","sha256":"<64hex>","source":"unit","license":"CC-BY-4.0"}
→ 201 {"evidenceId":"ev_123"}
```

---

## 2) Entity Resolution (Deterministic) — **Functional v1**
**Goal:** Deterministic candidate gen, merge/split with reversible audit, `explain` endpoint.

### Deliverables
- Blocking keys: `email.normalized`, `phone.e164`, `name.soundex+dob` (per `/contracts/er/ruleset.yaml`).
- `POST /v0/er/candidates` → `{candidates:[{id,score,features:{ruleHits[]}}]}`.
- `POST /v0/er/merge` → returns `{mergedId,rationale}` and writes audit log (append‑only, reversible map stored).
- `GET /v0/er/explain/{id}` → human‑readable rule matches + feature deltas.

### Tests (Acceptance)
- Fixture pack drives expected merges; reproducibility suite asserts identical output across reruns.
- Split/merge round‑trip: split→merge restores original shape.
- PII redaction in logs asserted.

---

## 3) GraphQL Gateway & Cost Guard — **Functional v1**
**Goal:** Persisted queries, cost limiter, OPA field‑level hook; resolvers wired to prov‑ledger + ER.

### Deliverables
- SDL locked in `/contracts/graphql/schema.graphql`.
- Persisted query store (`/gateway/pq/`) + CLI `pq add <name> <query.graphql>` writes checksum file.
- Cost estimator: depth * (fields+lists); header `X-Budget` enforced.
- OIDC mock authN; OPA boolean `allow` for field‑level authZ; deny‑by‑default.

### Tests (Acceptance)
- Snapshot queries must pass; over‑budget requests 429; unknown persisted query 404.
- AuthZ: deny without purpose context; allow with `{purpose:"investigation"}`.

---

## 4) Streaming Ingest + ETL DSL — **Functional v1**
**Goal:** CSV/JSONL → canonical entities with mapping DSL, PII redaction, idempotent replays.

### Deliverables
- DSL engine supporting `trim|lower|hash|redact`, `drop_if_null`, and license propagation to record metadata.
- PII detectors (email, phone, national ID) emitting redaction tokens; redaction map persisted (DuckDB).
- Idempotency keys: `{source}:{recordId}`; replays do not duplicate outputs.
- Outputs JSONL to stdout and topic `ingest.entities.v0` (Kafka stub acceptable).

### Tests (Acceptance)
- Golden IO suites for CSV & JSONL; replay the same batch and assert identical outputs with no dupes.
- DPIA checklist generator produces markdown including data categories and retention notes.

---

## 5) Policy Reasoner & Audit SDK — **Functional v1**
**Goal:** ABAC evaluation with purpose binding; append‑only audit log with SHA chaining.

### Deliverables
- Node library `@intelgraph/policy-audit` with helpers: `reasonForAccess(purpose)`, `eval()`, `audit()`.
- Sidecar `/v0/eval` + `/v0/audit` endpoints; policies under `/contracts/policy/*.rego`.
- Audit file rotation (daily), SHA256 chain verifier script (`verify-audit.js`).

### Tests (Acceptance)
- Property tests: deny by default; purposeless read denied; allowed use emits audit line matching schema.
- Tamper attempt flips a hash → verifier fails.

---

## 6) Web App Shell (Tri‑Pane) — **Functional v1**
**Goal:** Live data via gateway; AAA accessibility; command palette; loading/error states.

### Deliverables
- Graph panel: renders nodes for `Claim`, `Evidence` from demo query.
- Timeline: visualizes last 50 `claim.created` events.
- Map: mock geocoded points (config‑driven) with clusterer.
- Command palette: run saved persisted queries; keyboard shortcuts; undo/redo history.
- i18n scaffold with at least EN + ES translation files.

### Tests (Acceptance)
- Lighthouse ≥ 90 perf/a11y; axe‑core suite passes.
- Playwright E2E: load persisted query, see results, toggle theme, keyboard nav works.

---

## 7) Observability & SLO Pack — **Functional v1**
**Goal:** Uniform OTEL traces, metrics, logs; Grafana dashboards; SLO burn alerts.

### Deliverables
- Middleware in Node/Go/Python services: traceparent propagation; common attrs (service.name, version, user.id hashed).
- Prometheus counters/histograms for request count/latency/error; kafka lag gauge.
- Grafana dashboards JSON committed; alert rules for p95>1500ms (gateway), error rate >0.5%, ingest lag >2m.

### Tests (Acceptance)
- `docker compose up` shows a single trace spanning web→gateway→prov; metrics scraped; sample logs in Grafana explore.
- k6 baseline: 100 RPS for 60s with <0.5% errors.

---

## 8) Copilot: NL → Cypher — **Functional v1**
**Goal:** Rules‑based translator (nearley) with rationale and cost estimate; sandboxed, read‑only execution.

### Deliverables
- Grammar + intent templates; translator returns `{cypher, rationale[], estimatedCost}`.
- Sandbox `/v0/sandbox/execute` spins ephemeral Neo4j (Testcontainers in CI) and enforces read‑only.
- Corpus: ≥50 prompts in `/contracts/nl2cypher/prompts.tsv` with expected AST + Cypher.

### Tests (Acceptance)
- ≥95% syntactic validity on corpus; cost estimator units; mutation queries blocked with 403.

---

## Cross‑Cutting Quality Gates (Sprint 1)
- **Coverage:** ≥85% lines overall; critical paths ≥95% (gateway, prov, ER, NL→C).
- **Determinism:** Manifests & NL→C outputs identical across runs; CI job compares hashes.
- **Contracts:** Any change to `/contracts/**` requires ADR + semver bump and green contract diff job.
- **Security:** No secrets in repo; dependency audit high+ severity = fail.

---

## Runbook — Local Verification
```bash
# 1) Build & start
make up

# 2) Health checks
curl -fsS localhost:7101/healthz && curl -fsS localhost:7201/healthz && curl -fsS localhost:8080/healthz

# 3) Provenance flow
curl -sX POST localhost:7101/v0/evidence -d @fixtures/prov/evidence.sample.json -H 'Content-Type: application/json'
# -> capture evidenceId, then create a claim and fetch manifest

# 4) Gateway persisted query
gateway/pq add demo fixtures/graphql/query.claim.graphql
curl -s -H 'X-Persisted-Query: demo@<checksum>' -H 'X-Budget: 100' localhost:8080/graphql

# 5) ER candidates
curl -sX POST localhost:7201/v0/er/candidates -d @fixtures/er/entity_a.json -H 'Content-Type: application/json'

# 6) Ingest replay idempotency
cat fixtures/ingest/sample.csv | pipelines/ingest/bin/ingest --dsl contracts/mapping/sample.json
cat fixtures/ingest/sample.csv | pipelines/ingest/bin/ingest --dsl contracts/mapping/sample.json # same outputs, no dupes

# 7) Policy eval + audit
curl -sX POST localhost:7xxx/v0/eval -d '{"subject":{"role":"analyst"},"action":"read","resource":{"type":"claim"},"context":{"purpose":"investigation"}}'

# 8) NL→Cypher
curl -sX POST localhost:7yyy/v0/nl2cypher -d '{"prompt":"Find all claims about entity e123"}'
```

---

## Demo Script (End of Sprint 1)
1) **Ingest** a CSV → watch redaction tokens and JSONL output.
2) **Provenance** register evidence → create claim → fetch manifest → show JWS + Merkle root.
3) **Gateway** run a persisted query under budget; show denial over budget.
4) **ER** explain match rationale for a merged entity.
5) **Policy** deny without purpose, allow with purpose and show audit chain.
6) **Web App** load persisted query results; keyboard nav; dark/light.
7) **Observability** open Grafana dashboard; show end‑to‑end trace.
8) **Copilot** translate NL→Cypher; show rationale and block mutation.

---

## Risks & Mitigations
- **Contract drift** → Contract check job blocks PR; require ADR for any change.
- **Nondeterminism** → Freeze locales/timezones; canonical JSON serializer.
- **Perf regressions** → k6 baseline in CI with threshold gates.
- **Security regression** → Trivy + npm audit hard fail; license scan enforce allowlist.

---

## Definition of Done (Sprint 1)
- All eight services/components deliver Functional v1 per above.
- CI green across matrix; coverage meets targets.
- Helm charts deploy locally; `docker compose up` demonstrates cross‑service trace.
- Demo script executes end‑to‑end with no manual fixes.
- Tags `v0.1.0` cut; release notes published in `CHANGELOG.md`.

