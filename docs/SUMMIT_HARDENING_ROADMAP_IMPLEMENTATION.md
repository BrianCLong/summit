# Summit Roadmap – 90-Day Hardening Plan Execution Guide

This guide operationalizes the 90-day hardening roadmap into an execution-ready plan with epics, issues, acceptance criteria, and ownership patterns. It is structured as a GitHub Projects blueprint and can be imported directly as issue templates for execution.

## 0. Validation / Calibration

1. **Repo Alignment**
   - Confirm API stack (GraphQL/REST) matches `server/` conventions and drivers (`Neo4j`, `Postgres` ORM). Capture deviations in `docs/ARCHITECTURE_REPORT.md` before coding.
   - Verify schema/migration tooling (Knex/Prisma/TypeORM). Add missing migration baselines if drift is detected.
   - Ensure naming/layering adhere to `server/src` service boundaries and `packages/` strangler pattern.
2. **Baseline Checks**
   - Run `npm test`, `npm run lint`, and `npm run format` before and after changes.
   - Validate Docker compose overlays match target env (dev/stage/prod) and no secrets are committed.

## 1. Epic – Security & LBAC Bunker (Weeks 1–4)

### SEC-1: Implement LBAC Security Proxy

- **Goals:** All graph IO mediated by clearance/compartment-aware layer.
- **Tasks:**
  1. Extend node/edge schemas with `clearance: int` and `compartments: string[]`; add migrations.
  2. Create `SecurityContext` (userId, roles, clearance, compartments) derived per request.
  3. Build `SecureGraph` wrapper enforcing `node.clearance <= userClearance` and compartment intersections.
  4. Refactor GraphQL resolvers/REST handlers to depend on `SecureGraph` (no direct driver access).
  5. Add test matrix: low-clearance visibility denial, bypass attempts via complex queries, and audit hooks.
- **Acceptance Criteria:** Deny-by-default posture; 100% graph queries pass through `SecureGraph`; coverage ≥80% for new code.

### SEC-2: Docker & Secrets Hardening

- **Tasks:**
  1. Update service Dockerfiles to run as non-root, drop capabilities, and enable read-only rootfs where possible.
  2. Remove secrets from Compose; source from Vault/SM or encrypted env files mounted at runtime.
  3. Add SBOM generation (`syft`) and CVE scanning (`grype`) to CI with fail-on-high/critical policy.
- **Acceptance Criteria:** CI fails on critical CVEs; containers start without root; zero plaintext secrets in git.

### SEC-3: Audit Logging & Export Controls

- **Tasks:**
  1. Add Postgres `audit_log` table (`id`, `user_id`, `action`, `entity_id`, `entity_type`, `graph_context`, `timestamp`).
  2. Instrument API reads/writes to append audit entries; include export attempts.
  3. Add privileged-only export endpoints; implement panic button to cut ingress and flush sessions.
- **Acceptance Criteria:** Every graph mutation/read writes audit events; panic endpoint documented and tested.

## 2. Epic – Ingest Stability & Staging (Weeks 5–8)

### ING-1: Kafka/Redpanda Ingest Buffer

- **Tasks:**
  1. Deploy Kafka/Redpanda topics for ingest feeds; update producers to publish instead of direct DB writes.
  2. Implement consumers with batching (≈5k) and safe offset commit after DB persistence.
  3. Add load tests sustaining 10k events/min for ≥30 minutes and monitor DB/CPU.
- **Acceptance Criteria:** Zero data loss under load; dashboards show stable throughput and latency.

### ING-2: Air-Gap Ingestion Gateway

- **Tasks:**
  1. Define Dirty/Clean buckets (S3/MinIO) with lifecycle policies; block internet egress for loaders.
  2. Build sanitizer service (MIME via magic bytes, HTML stripping, JSON schema validation via Zod/Pydantic).
  3. Document ingest flow with diagrams in `docs/INGESTION.md` and runbook for quarantine handling.
- **Acceptance Criteria:** Dirty payloads never touch DB; all loaders consume only from Clean bucket; runbook exercised.

### ING-3: Entity Resolution v1

- **Tasks:**
  1. Implement blocking keys for people (`soundex(last)` + first initial + YOB) and store alongside entities.
  2. Retrieve candidates by block key; compute similarity across name/address/DOB; define auto-merge and review thresholds.
  3. Provide CLI tooling to recompute blocks and finalize possible matches.
- **Acceptance Criteria:** ER pipeline measured for precision/recall; ops can rerun/review via CLI; ingest respects thresholds.

## 3. Epic – Simulation Overlay & Fact-Check (Weeks 9–12)

### SIM-1: Hypothesis / Simulation Overlay Graph

- **Tasks:**
  1. Define Neo4j schema for `Hypothesis`, `PredictedEvent`, `SIMULATES`, `LEADS_TO`, `INVOLVES`.
  2. Add API endpoints to create/list hypotheses and attach predicted events.
  3. Add API/UI toggle for `includeSimulations` overlay handling.
- **Acceptance Criteria:** Default queries exclude simulations; opt-in overlay merges ghost nodes/edges correctly.

### SIM-2: Hallucination Firewall & Physics Checks

- **Tasks:**
  1. Add schema validator for LLM proposals; reject invalid types or endpoints.
  2. Enforce trust-score filters and physics constraints (distance/time, role caps); tag `source='synthetic'`.
  3. Ensure ingest pipelines ignore synthetic artifacts unless explicitly enabled.
- **Acceptance Criteria:** Invalid proposals blocked; synthetic data segregated; tests cover physics violations.

### SIM-3: “Why?” Button & Evidence Paths

- **Tasks:**
  1. Extend simulation output to include evidence IDs and provenance summaries.
  2. Implement API to fetch supporting subgraph for prediction IDs.
  3. Update client graph UI to highlight evidence when selecting predictions.
- **Acceptance Criteria:** UI clearly shows provenance; evidence retrieval performant and access-controlled.

## 4. Epic – Observability & Failure Guardrails (Parallel)

### OBS-1: Graph APM & Canary Queries

- **Tasks:**
  1. Add canary query (`MATCH (n:Canary {id:'canary_node'}) RETURN n`) every 60s; emit Prometheus metrics.
  2. Build Grafana panels for p95 latency and error rates; define SLOs and alerts.
- **Acceptance Criteria:** Canary alerts when latency/error thresholds breached; dashboards published.

### OBS-2: Supernode & Query Guardrails

- **Tasks:**
  1. Compute node degrees periodically; store high-degree IDs in Redis and avoid traversal fan-out.
  2. Enforce max traversal depth, fan-out, and execution timeouts configurable by role.
  3. Add tests proving abusive queries return fast errors.
- **Acceptance Criteria:** Guardrails enabled by default; test suite ensures protection.

### OBS-3: Chaos & Load Tests

- **Tasks:**
  1. Generate 100k nodes/1M edges fixture; run ingest end-to-end under load.
  2. Measure ingest throughput, query latency, and simulation performance; set thresholds in tests.
  3. Add contradictory data tests with differing trust scores.
- **Acceptance Criteria:** Load suite stable in CI (nightly); metrics stored for regressions.

## 5. ADRs

- **ADR-001:** IntelGraph Ontology & Temporal/Source Model — reified events, bitemporal semantics, provenance-first observations.
- **ADR-002:** LBAC via Security Proxy — clearance + compartments enforced via API wrapper; deny by default; audited.
- **ADR-003:** Ingest Staging & Air-Gap Gateway — dirty/clean buckets, sanitizer, Kafka buffering.
- **ADR-004:** Simulation Overlay & Synthetic Data Policy — overlay graph, synthetic tagging, export safeguards.

## 6. Sprint Framing

- **Sprint 1 (Weeks 1–4):** SEC-1, SEC-2, SEC-3, OBS-1
- **Sprint 2 (Weeks 5–8):** ING-1, ING-2, ING-3, OBS-2
- **Sprint 3 (Weeks 9–12):** SIM-1, SIM-2, SIM-3, OBS-3

## 7. Operational Playbook

1. **Project Board Setup**
   - Create GitHub Project with columns per epic; seed issues using tasks above.
   - Add automation: move to In Progress on PR open; to Done on merged PR.
2. **Working Agreements**
   - Conventional commits, branch naming `type/epic-shortdesc`.
   - CI gates: lint, format, unit/integration, SBOM + CVE scan, e2e/nightly load.
3. **Risk & Rollback**
   - Maintain feature flags for LBAC, overlay graph, ER thresholds, and guardrails.
   - Keep rollback runbooks for Docker hardening and Kafka deploys; document in `ops/`.
4. **Evidence & Reporting**
   - Track “Reality vs Plan” in `docs/ARCHITECTURE_REPORT.md` with weekly status.
   - Export metrics snapshots (Grafana JSON, Prometheus scrape configs) into `observability/`.

## 8. Forward-Leaning Enhancements

- **Confidential Computing Edge:** Explore running security proxy inside enclave (e.g., Nitro/SGX) for high-sensitivity tenants.
- **Adaptive Guardrails:** Machine-learned dynamic fan-out limits based on historical query costs.
- **Probabilistic ER:** Add graph-based similarity with GNN embeddings as optional scoring alongside rule-based ER.
