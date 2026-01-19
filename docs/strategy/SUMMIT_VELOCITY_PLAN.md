# Summit Autonomous Velocity Plan

**Goal:** Independent Summit pods ship weekly, evidence-backed increments that meet platform SLOs/cost guardrails without central hand-holding.
**Non-goals:** Heroics, skipping compliance, bespoke tooling, or one-off infra.
**Constraints:** Org defaults (GraphQL/ingest/graph SLOs; monthly error budgets; cost caps), regulated topologies, provenance on by default.
**Risks:** Dependency knots, flaky tests, policy drift, test-data scarcity, hidden coupling.
**Definition of Done:** Pods meet DORA targets, pass CI policy gates, attach evidence bundles, and hit SLOs/cost budgets in staging → prod.

---

## The 12-Point Unblock Plan

### 1. Team Topology & Autonomy Contract
*   **Structure:** Form 3–5 value-stream pods (≤8 ppl): PM, TL, BE, FE, Data/Graph, QA, SRE.
*   **Roles:** Single DRI per pod; on-call rota; CODEOWNERS + service SLAs.
*   **Contract:** Autonomy contract: pod can design/ship within paved-road boundaries; deviations need ADR + cost/SLO justification.

### 2. Paved-Road Service Templates (Day-0 usable)
*   **Generators:** Node/TS + Express + Apollo GraphQL, Neo4j, PostgreSQL, Redis, Kafka, OpenTelemetry.
*   **Baked-in:** Lint/type, jest + k6 harness, k8s manifests, Helm chart, SBOM, OPA policy hooks, data retention labels, provenance emitters.
*   **CLI:** `create-intelgraph-service` CLI → scaffolds repo with trunk-based defaults.

### 3. Definition of Ready / Done (enforced in CI)
*   **DoR (Ready):** User story has acceptance criteria, data model deltas, privacy tier, SLO budget deltas, rollout plan.
*   **DoD (Done):** Tests (unit/contract/e2e), perf smoke, policy simulation pass, dashboards updated, evidence bundle attached.

### 4. Quality Gates (CI as the referee)
*   **Pipeline:** Lint+types → unit → contract (GraphQL SDL + persisted queries) → security (SAST/dep scan/SBOM) → OPA policy sim → k6 perf smoke (p95 budgets) → image signing → canary.
*   **Enforcement:** Fail closed. Auto-open issues if SLO/cost burn >80% of budget.

### 5. Release Train & Branching
*   **Strategy:** Trunk-based; feature flags; small PRs (<400 LOC).
*   **Cadence:** Weekly cut → staging; biweekly → prod unless error-budget <50%.
*   **Artifacts:** Tags vX.Y.Z with auto release notes + evidence.

### 6. Observability by Default
*   **Stack:** OpenTelemetry traces + logs + metrics prewired; GraphQL resolver spans; ingest pipeline timings.
*   **Dashboards:** Per pod: p95/99 latencies vs SLOs, error budgets, cost/unit, DORA.
*   **Alerting:** SLO burn alerts to pod Slack + PagerDuty.

### 7. Data & Policy Backbone
*   **Schema:** Canonical entities/edges + labels; retention tiers (defaults: standard-365d, PII short-30d); purpose tags.
*   **Migration:** Versioned SQL/Cypher; backout scripts included.

### 8. Test Strategy that Prevents Regressions
*   **Data:** Golden datasets (non-PII) for e2e; synthetic PII for privacy tests.
*   **Scope:** Consumer-driven contracts between services; GraphQL persisted query tests; chaos light (pod-level fault injection weekly).

### 9. Environments that Don’t Fight You
*   **Ephemeral:** Namespace-per-PR with seeded DBs and fixture Neo4j snapshots.
*   **Local:** Docker Compose for local parity; make e2e green required before merge.

### 10. Ingest & Graph Performance Guardrails
*   **Ingest:** Workers sized to ≥1k ev/s p95 ≤100 ms pre-storage; S3/CSV ≥50 MB/s per worker.
*   **Query:** Graph queries tagged: 1-hop p95 ≤300 ms; 2–3 hop filtered p95 ≤1,200 ms; cost hints in Cypher.

### 11. Compliance & Provenance “by Construction”
*   **Lineage:** Immutable provenance ledger on each transform/export; export manifests (hashes, lineage).
*   **Legal:** License/TOS classifier (MIT-OK, Restricted-TOS, etc.) enforced in CI.

### 12. Cost Controls Visible to Engineers
*   **Budgets:** ≤ $0.10 / 1k ingested events, ≤ $2 / 1M GraphQL calls; 80% warnings.
*   **Culture:** Perf/cost experiments gated behind flags and time-boxed.

---

## 30 / 60 / 90 (with exit criteria)

### Day-0–30 (Enablement)
*   Stand up paved-road templates + CLI; create dashboards; seed golden datasets; enable ephemeral envs.
*   Migrate 1 pilot service per pod onto the template; wire CODEOWNERS, on-call.
*   **Exit:** First weekly train shipped to staging with evidence bundles and green gates.

### Day-31–60 (Scale)
*   Move remaining Summit services to paved road; enforce DoR/DoD; add contract tests between neighbors.
*   **Exit:** 2 consecutive prod trains biweekly; DORA: daily deploys to staging, weekly to prod; change-failure <15%; MTTR <1h.

### Day-61–90 (Optimize)
*   Tighten SLOs, remove bespoke infra, add chaos drills; per-pod cost/perf budgets tracked.
*   **Exit:** Error budgets ≥70% remaining; p95s within defaults; no manual prod steps.

---

## Immediate “Start Today” Checklist (1 sprint)
1.  Create `summit-paved-road` org template repos (+ generator CLI).
2.  Turn on required status checks: tests, OPA policy sim, k6 smoke, SBOM, image signing.
3.  Stand up Grafana/ELK/Tempo dashboards pre-wired to new services.
4.  Enable ephemeral PR envs and golden dataset seeding.
5.  Adopt trunk-based + release train; feature flag framework live.
6.  Publish DoR/DoD and Autonomy Contract; add to PR template.

---

## Acceptance Criteria & Evidence
*   **Measurables:**
    *   DORA: deploy freq ≥ daily (staging), ≥ weekly (prod); lead time ≤ 24h; change failure ≤ 15%; MTTR ≤ 60m.
    *   SLOs (defaults): GraphQL reads p95 ≤ 350 ms; writes p95 ≤ 700 ms; graph 1-hop p95 ≤ 300 ms; ingest p95 ≤ 100 ms.
    *   Cost within guardrails with 20% headroom.
*   **Evidence Bundle (attached to each release):** SLO burn report, k6/perf output, SBOM + license diff, policy-sim results, provenance manifest, rollback plan.

---

## Minimal Architecture Runway

```mermaid
flowchart LR
  Client-->Gateway[GraphQL Gateway]
  Gateway-->Services[Summit Services (Node/TS, Apollo)]
  Services-->Neo4j[(Neo4j)]
  Services-->PG[(PostgreSQL)]
  Services-->Redis[(Redis)]
  Ingest[Connectors: S3/CSV, HTTP]-->Services
  Services--OTel Traces-->OTel[OpenTelemetry]
  OTel-->Observability[Prometheus/Grafana/ELK]
  CI[CI/CD]--Gates-->Images[(Signed Images)]
  CI--Release Train-->K8s[Kubernetes/Helm]
  Services--Provenance-->Ledger[(Provenance Ledger)]
```
