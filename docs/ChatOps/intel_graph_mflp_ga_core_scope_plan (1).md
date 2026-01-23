# IntelGraph — MFLP (Minimum **F**eature Lovable Product) GA Core

_Author: Elara Voss, Sorceress of Synergy_

---

## 1) Vision & Outcome

Deliver a trustworthy investigation graph that goes from **raw data → canonical entities/relationships → analyst insight** in minutes, with guardrails and provenance that leadership can defend in court, operations, or boardroom.

**Golden Path (must be frictionless @ GA):**

1. Connect a data source → 2. Ingest & classify → 3. Resolve into entities/relationships → 4. Explore on timeline/map/graph → 5. Ask Copilot (NLQ) → 6. Save case/report with citations.

**Definition of MFLP:** the smallest coherent slice that users will _love_ using daily (not tolerate), while being safe, auditable, and cost-aware.

---

## 2) In‑Scope for GA Core (what ships)

1. **Ingest & Enrichment**
   - Two seed connectors (e.g., JSON/CSV drop + REST API fetcher).
   - Streaming ETL with schema inference, PII detection, OCR/EXIF strip, language/geo tagging.
   - License/TOS enforcement and per-dataset data handling policy.
2. **Graph Core**
   - Bitemporal node/edge model (valid time + system time).
   - Canonical entity resolution (deterministic + scorecard), human review queue for merges/splits.
   - End-to-end provenance (source, transform lineage, policy annotations) on every node/edge.
3. **Analytics & Tradecraft**
   - Link analysis canvas; shortest/weighted paths; k-hop exploration.
   - Community detection & centrality (degree/betweenness) with simple parameter panel.
   - First-pass risk score (transparent feature list + thresholds).
4. **AI Copilot (Auditable)**
   - Natural language → generated Cypher/SQL with _preview & explain_ before run.
   - RAG over saved cases/entities with **inline citations**; redaction-aware answers.
   - Guardrails that explain denials (policy reasons surfaced to user).
5. **Governance, Identity, Policy**
   - SSO (OIDC), RBAC/ABAC via policy engine (OPA style), step-up auth for sensitive ops.
   - Full audit log (who/what/when/why) exportable.
6. **UX Essentials**
   - Synchronized **tri‑pane**: timeline ↔ map ↔ graph with time-brushing.
   - Command palette (⌘K/CTRL+K); accessible navigation (WCAG AA+ aim).
   - Reporting: snapshot to PDF/HTML with citation bundle.
7. **Operations & SLOs**
   - Metrics endpoint, request tracing, latency heatmap; basic **cost guard**.
   - Backups, PITR, and DR runbook; blue/green deploy script.

---

## 3) Out‑of‑Scope for GA (post‑GA)

- Adversarial simulations/deception lab.
- Auto‑tiering storage optimizer.
- Real‑time collaborative canvases.
- Exotic connectors (dark web, HUMINT, etc.).
- Advanced ML heuristics beyond transparent baseline.

---

## 4) Non‑Functional Requirements (GA Gates)

- **Security:** SSO, MFA, hardware key support; encrypted at rest/in transit; least-privilege defaults.
- **Privacy:** PII classification on ingest; redaction surfaces; dataset-level data handling tags.
- **Reliability:** 99.5% service availability; RTO ≤ 4h, RPO ≤ 15m; PITR tested.
- **Performance:** P50 query ≤ 1s, P95 ≤ 3s for 100k node subgraph; ingest 1M records/hour on reference infra.
- **Cost:** Cost guard alerts when monthly burn > budget × 1.2.
- **Accessibility:** Keyboard-first flows; color-contrast checks; export alt text in reports.

---

## 5) Architecture Baseline & ADRs

- **ADR‑01 Graph Store & Model:** property graph, bitemporal strategy, indexing plan.
- **ADR‑02 Entity Resolution:** scoring features, thresholds, review queue, auditability.
- **ADR‑03 Policy Engine:** OIDC + OPA-style ABAC/RBAC, decision logging, step‑up auth.
- **ADR‑04 Provenance:** lineage schema, transform signatures, immutability policy.
- **ADR‑05 Copilot Safety:** NLQ generation constraints, sandbox execution, prompt/response logging with PII scrubbing.
- **ADR‑06 Observability:** metrics, tracing, log retention, error budget policy.

---

## 6) UX Reference Flows (GA‑critical)

- **Investigate:** Search → open entity → expand neighbors → time-brush → pathfind → save view → export report.
- **Ingest Wizard:** Select source → sample & map schema → choose enrichers → policy tags → dry run → go live.
- **Copilot:** Ask question → see generated query + cost estimate → run in sandbox → accept results → add to case.

---

## 7) GA Acceptance Criteria (high level)

- **Golden Path success ≥ 95%** on clean checkout → ingest → ER → explore → copilot → export.
- **ER quality:** precision ≥ X, recall ≥ Y on labeled eval set; 100% of merges have provenance & reversible.
- **Audit completeness:** 100% access events logged with machine-parsable reason; denials show human-readable rationale.
- **Provenance:** every node/edge includes source(s), transform, and policy tags; report export bundles citations.
- **Perf/SLOs:** meet NFR thresholds under reference load.
- **Security:** no critical findings in penetration test; secrets management verified.

---

## 8) OKRs for GA

- **O1 Golden Path Delight:** 95% task completion; SUS ≥ 75; NPS ≥ 30 with pilot analysts.
- **O2 Graph Quality:** ER precision/recall ≥ targets; <2% human-flagged bad merges per 10k entities.
- **O3 Guardrails:** 100% policy denials surfaced with explanation within 200 ms; zero P0 data policy escapes.
- **O4 Operability:** On-call toil < 2h/week; error budget ≥ 90% preserved.

---

## 9) Release Plan & Milestones

- **T0 — Decisions & Scaffolding (Week 0‑1)**: finalize ADRs, repo bootstrap, CI/CD, dev env, sample datasets.
- **T1 — E2E Walking Skeleton (Week 2‑4)**: ingest → ER → graph → tri‑pane → export (happy path); NLQ preview only.
- **T2 — Hardening & Guardrails (Week 5‑7)**: policy engine, audit, provenance, RAG with citations; ER review queue.
- **T3 — Pilot/Beta (Week 8‑10)**: performance, SLOs, cost guard, DR drill; user studies; fixlist burn‑down.
- **T4 — GA (Week 11‑12)**: docs, runbooks, security sign‑off, pricing guardrails, support handoff.

---

## 10) RACI (Core Owners)

- **Platform/Graph:** Owner A (R), Architect B (A), Analyst Team (C), SRE (I)
- **Ingest/ETL:** Owner C (R), Data Lead (A), Legal/Privacy (C), SRE (I)
- **Copilot:** Owner D (R), Safety Lead (A), Sec/Privacy (C), Frontend (I)
- **Governance/Sec:** Owner E (R/A), Legal (C), All Teams (I)
- **Frontend/UX:** Owner F (R), Design Lead (A), Analysts (C), PM (I)
- **SRE/Infra:** Owner G (R/A), All Teams (C/I)

---

## 11) Prioritized Backlog (Epics → Stories → AC)

### Epic A — Ingest & Enrich

1. **A‑1 Ingest Wizard (MVP)**
   - _Story:_ As a data steward, I can onboard a CSV/JSON dataset with schema mapping and preview.
   - _AC:_ Upload ≤ 1GB; infer types; flag PII; dry run produces lineage diff; go-live writes to Kafka topic.
2. **A‑2 REST Connector**
   - _AC:_ OAuth2, pagination, rate-limit awareness; retries; contract tests.
3. **A‑3 Enrichers** (PII, OCR/EXIF, lang/geo)
   - _AC:_ Toggle per dataset; results attached to lineage; cost recorded.

### Epic B — Graph Core

1. **B‑1 Bitemporal Schema**
   - _AC:_ Valid/System time present; time-travel queries supported.
2. **B‑2 Entity Resolution + Queue**
   - _AC:_ Scorecard with top features; merge/split reversible; review queue with SLAs.
3. **B‑3 Provenance Model**
   - _AC:_ Node/edge provenance mandatory; export includes chain of custody.

### Epic C — Analytics

1. **C‑1 Link Canvas + Pathfinding**
   - _AC:_ k-hop expand; shortest/weighted path; pin/annotate; export snapshot.
2. **C‑2 Community/Centrality**
   - _AC:_ Runs under 30s on 10M edge graph subset; result objects are versioned.
3. **C‑3 Risk Score v1**
   - _AC:_ Transparent features; threshold edit with audit.

### Epic D — Copilot

1. **D‑1 NL → Cypher/SQL Preview**
   - _AC:_ Show query + cost est.; sandbox run; user must accept before execution.
2. **D‑2 RAG with Citations**
   - _AC:_ Each answer includes source links & redaction state.
3. **D‑3 Guardrails**
   - _AC:_ Denials include human-readable reason; logged.

### Epic F — Governance/Sec/Ops

1. **F‑1 Identity & Policy**
   - _AC:_ OIDC SSO; ABAC/RBAC; step-up for sensitive ops.
2. **F‑2 Audit & Observability**
   - _AC:_ /metrics, tracing; audit export; SLO dashboard.
3. **F‑3 Backups & DR**
   - _AC:_ PITR validated; DR drill report.

---

## 12) Testing Strategy

- **Data:** synthetic & de‑identified sample corpora with labels for ER.
- **Unit/Contract:** connectors, enrichers, policy decisions.
- **Scenario:** golden path; failure injection for policy/denials and ER conflicts.
- **Perf:** load tests on reference infra; query heatmaps.
- **Security:** static/dynamic scans; red team exercise; secrets rotation test.

---

## 13) Risks & Mitigations

- **ER accuracy misses →** add human review queue, widen feature set; fall back to conservative merge.
- **Copilot hallucination →** preview-only exec, strict guardrails, citation requirement.
- **Policy complexity →** opinionated defaults, templates; policy linter in CI.
- **Cost creep →** cost guard with budgets and alerts; usage caps in sandbox.

---

## 14) Rollout & Support

- **Environments:** Dev → Staging → Pilot → GA; promotion via release train.
- **Docs:** runbooks, playbooks, “how-to investigate” guide, data handling playbook.
- **Feedback loop:** in-product NPS, rage-click telemetry, sprintly user council.

---

## 15) What to do this week (NOW)

- Finalize ADR‑01..06; create repo scaffolds and CI/CD.
- Pick the 2 seed connectors and secure sample datasets + legal signoff.
- Implement walking skeleton E2E (no polish): ingest → ER → graph → tri‑pane → export.
- NLQ preview stub + command palette hook.
- Stand up OIDC SSO and policy engine skeleton; wire audit events.
- Define ER eval set and target thresholds; set dashboards for SLOs/cost.
