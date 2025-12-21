# Scrum Runebook: Codex Dev Team Prompts

This document captures seven isolated prompts for codex development teams. Each service runs in parallel with unique folders, packages, ports, schemas, and Kafka topics to avoid collisions.

---

## 1) Provenance & Claim Ledger (prov-ledger)

**Prompt to paste for the team:**

> Build a production-grade TypeScript/Node microservice `prov-ledger` that records evidence, claims, and transformation chains and emits verifiable export manifests.
>
> * **You may touch only:** `/services/prov-ledger/**`, `/contracts/proto/provledger/v1/**` (add new files only), `/ops/ci/prov-ledger.yml`.
> * **Public API (HTTP+gRPC):**
>   * `POST /v1/evidence` → `{id, source, hash, license}`
>   * `POST /v1/claims` → `{id, evidenceIds[], assertion, confidence}`
>   * `GET /v1/manifest/:claimId` → provenance tree + Merkle roots
>   * gRPC package: `ig.provledger.v1` (mirror endpoints).
> * **Storage:** Postgres schema `prov_ledger_v1` (migrations included).
> * **Events:** Publish to Kafka topic `prov.claim.registered.v1` (schema in `/contracts/avro/prov-ledger/ClaimRegistered.v1.avsc`).
> * **Non-functional:** idempotent writes (Idempotency-Key), OTEL `/metrics`, healthz/readyz.
> * **Deliverables:** code, tests (≥90% lines), Dockerfile, Helm chart, seed fixtures.
> * **Acceptance:** CLI `make verify-claim <id>` reconstructs hash tree identical to `GET /manifest`.

---

## 2) License/Authority Compiler (lac-compiler)

**Prompt to paste for the team:**

> Create `lac-compiler`, a policy engine that compiles licenses, warrants, and case policies into executable bytecode enforcing “deny by construction.”
>
> * **You may touch only:** `/services/lac-compiler/**`, `/contracts/proto/lac/v1/**`, `/ops/ci/lac-compiler.yml`.
> * **Inputs:** YAML policy bundle (licenses, authorities, retention clocks).
> * **Outputs:** WASM module + JSON “policy explainer.”
> * **API:**
>   * `POST /v1/compile` → `{wasm, modelCard, explainer}`
>   * `POST /v1/simulate` → diff report of access changes.
> * **gRPC:** `ig.lac.v1.Compiler/Compile, Simulate`.
> * **Edge contract:** produce `AccessDecision {allow:boolean, reason:string, policyId}`.
> * **Acceptance:** test corpus achieves 100% match on expected allow/deny; simulation shows row-level impact without touching data.

---

## 3) Natural-Language → Cypher/SQL (nlq-engine)

**Prompt to paste for the team:**

> Ship `nlq-engine`, a sandboxed translator from NL prompts to generated Cypher/SQL with cost/row estimates and diff-preview.
>
> * **You may touch only:** `/services/nlq-engine/**`, `/contracts/proto/nlq/v1/**`, `/ops/ci/nlq-engine.yml`.
> * **Mode:** library + service; **no direct DB writes**.
> * **API:**
>   * `POST /v1/plan` → `{generatedQuery, dialect, estimatedRows, warnings}`
>   * `POST /v1/execute-sandbox` → runs on ephemeral read-only DB seeded from `/fixtures/graph_small.parquet`.
> * **Safety:** block full scans > N rows unless `x-allow-heavy:true`.
> * **Acceptance:** ≥95% syntactic validity on provided prompt set; diff-view shows delta vs manual query; all runs logged with prompt+params (PII stripped).

---

## 4) GraphRAG & Evidence-First Retrieval (graphrag)

**Prompt to paste for the team:**

> Implement `graphrag`, a retrieval service that returns answers **only** with inline citations and redaction awareness.
>
> * **You may touch only:** `/services/graphrag/**`, `/contracts/proto/graphrag/v1/**`, `/ops/ci/graphrag.yml`.
> * **API:**
>   * `POST /v1/answer` → `{answer, citations:[{claimId, snippet, sourceUrl}]}`
>   * `POST /v1/index` → load case docs (stores embeddings locally; no external calls).
> * **Policies:** must call `lac-compiler` WASM before answering; refuse without authority and return `reason`.
> * **Acceptance:** any answer without ≥1 resolvable citation is rejected; redacted text never leaves redaction boxes in fixtures; replay logs deterministic.

---

## 5) Zero-Knowledge Deconfliction / Trust Exchange (zk-tx)

**Prompt to paste for the team:**

> Deliver `zk-tx`, a microservice that checks selector overlaps across compartments using salted hashes and ZK set proofs—no raw PII leaves the service.
>
> * **You may touch only:** `/services/zk-tx/**`, `/contracts/proto/zktx/v1/**`, `/ops/ci/zk-tx.yml`.
> * **API:**
>   * `POST /v1/commit` → returns commitment handle for a selector set.
>   * `POST /v1/prove-overlap` (two-party) → returns `{overlap:boolean, zkProof}`.
> * **Crypto:** pluggable proof backend (mock + real); store commitments in `zk_tx_v1`.
> * **Acceptance:** audits show only commitments/proofs persisted; reference attack test confirms zero leakage; latency p95 < 200ms on N=1k selectors.

---

## 6) Disclosure Packager & Provenance Wallets (disclosure-wallets)

**Prompt to paste for the team:**

> Build `disclosure-wallets`, producing portable, selective evidence bundles with revocation.
>
> * **You may touch only:** `/services/disclosure-wallets/**`, `/contracts/proto/wallets/v1/**`, `/ops/ci/disclosure-wallets.yml`.
> * **API:**
>   * `POST /v1/bundle` → zip with claim graph, signatures, audience scope.
>   * `POST /v1/verify` → offline validator result; supports revocation list fetch.
> * **Integration:** consumes `prov-ledger` manifests; optional redaction overlays.
> * **Acceptance:** tamper with any file → validator flags; revocation propagates on next open; sample bundles pass external verifier in `/tools/wallet-verify`.

---

## 7) Ops Guard: Metrics, SLOs, Cost Budgets (ops-guardian)

**Prompt to paste for the team:**

> Create `ops-guardian`, a control-plane service for `/metrics` ingestion (OTEL/Prom), SLO dashboards, and a query cost governor.
>
> * **You may touch only:** `/services/ops-guardian/**`, `/ops/ci/ops-guardian.yml`, `/contracts/proto/ops/v1/**`.
> * **Functions:**
>   * Scrape `/metrics` from all services; expose `/v1/slo` summaries.
>   * Budgeter API: `POST /v1/approve-query` → `{approved:boolean, cheaperPlan?}` (pure function; suggests alternates, never executes).
> * **Acceptance:** demo reduces benchmark workload cost ≥20% with equal results; chaos test shows alerts for latency spikes; Grafana dashboard JSON included.

---

### Merge-Clean Contract (applies to all seven)

* Each service has a unique folder, package, Docker image, DB schema, HTTP port, Kafka topic namespace, and proto package.
* Shared artifacts live only under `/contracts/**`; teams add new versioned files (e.g., `v1`) and never edit others’ contracts.
* CI per service; no monolithic CI edits.
* No one writes into another service’s folder; interop is via gRPC/HTTP defined in contracts.
* All PRs must pass `make repo-wide-lint` and `make contracts-compat` (backward-compatible proto check).

---

### Optional QA Note

A “hello-mesh” docker-compose can spin up all seven with stubbed dependencies so QA can run integration tests immediately if desired.
