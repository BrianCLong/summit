# Summit IntelGraph vs Summit Maestro — Product Boundary Charter (v1)

**Status:** Draft • **Owner:** Platform PM • **Last Updated:** 2025‑08‑31 • **Intended Audience:** Product, Eng, SRE, Sec, Ops

---

## 1) Purpose

Clarify the **product boundary** and **relationship** between **Summit IntelGraph** (the intelligence platform we ship) and **Summit Maestro** (the orchestration conductor we are building to _build and operate_ IntelGraph). Ensure Maestro is **independently reusable** across projects while embedding cleanly within our engineering/PMI fabric to accelerate IntelGraph development.

---

## 2) One‑sentence definitions

- **Summit IntelGraph (SIG):** A **secure, multi‑tenant intelligence graph platform** delivering ingestion → resolve → analyze → hypothesize → simulate → report, with provenance and governance built‑in.
- **Summit Maestro (SM):** A **workflow & orchestration runtime** (runbooks, pipelines, agents, schedulers) that **assembles, builds, tests, deploys, and operates** SIG (and other products) via reusable, policy‑aware automation.

---

## 3) “What it is / isn’t”

### Summit IntelGraph (the Product)

**Is:**

- End‑user product: APIs + UI for data intake, graph analytics, AI copilot, collaboration, audit.
- System of **record** for entities/relations, provenance, cases, policies, and audit.
- Governed surface: ABAC/RBAC, warrant/authority binding, redaction/minimization.
- Opinionated UX: tri‑pane (graph/timeline/map), report studio, case/tasking.

**Isn’t:**

- A general‑purpose workflow engine or CI/CD system.
- A build system for itself (it _uses_ Maestro’s pipelines but does not implement them).

### Summit Maestro (the Conductor)

**Is:**

- Orchestration layer: DAG/workflow engine, agent runtime, scheduled jobs, backfills.
- "Build & Operate" fabric: CI/CD flows, environment promotion, seeded demo data, golden paths.
- Data/ML/ETL runner: connectors, transforms, validation, tests, replay + provenance hand‑off.
- Reusable toolkit: adapters, SDKs, and runbooks usable **outside** IntelGraph.

**Isn’t:**

- The user‑facing intelligence platform.
- The system of record for graph data (it writes _to_ SIG or other targets).

---

## 4) Side‑by‑side product boundary matrix

| Dimension       | **IntelGraph (Product)**                                  | **Maestro (Conductor)**                                                                  |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Primary purpose | Intelligence graph platform for analysts & operators      | Orchestrate builds, data flows, runbooks, and ops for SIG and other projects             |
| Users           | Analysts, investigators, ops, ombuds, admins              | Engineers, data/platform teams, SREs; can be exposed to power users via curated runbooks |
| System role     | **System of Record** (graph, provenance, cases, policies) | **System of Action** (workflows, pipelines, agents, CI/CD)                               |
| Persistence     | Graph DB, document store, provenance ledger               | Ephemeral/state‑light; stores workflow metadata & logs                                   |
| APIs            | GraphQL/HTTP for query & case ops; export/import          | Orchestration API (workflows/runbooks), Jobs API, Connectors SDK                         |
| Policy          | Enforced at query & export time; OPA/ABAC                 | Enforced at **execution** time; policy hooks per task + secrets handling                 |
| UI              | Analyst & admin apps                                      | Operator console; runbook catalog; pipeline dashboards                                   |
| Extensibility   | Plugins: detectors, resolvers, COA sims, UI panels        | Plugins: connectors, tasks, agents, notifiers, resource providers                        |
| Deployable unit | App/services bundle with SLOs & governance                | Runtime service + libraries/SDK; ships with reference tasks and runners                  |
| Reuse scope     | Product features & data model                             | Cross‑product automation; can target SIG **or** external systems                         |

---

## 5) System context (text diagram)

```
[Developers/Platform] → (Maestro Runtime + Console)
   ├─ CI/CD Pipelines → build/test/deploy IntelGraph services
   ├─ Data/ETL Workflows → ingest → validate → enrich → hand‑off
   │      └→ Write to [IntelGraph APIs] with provenance contracts
   ├─ Runbooks/Agents → operational jobs, backfills, demos
   └─ Observability/FinOps hooks → metrics, budgets, alerts

[Analysts/Operators] → (IntelGraph UI & APIs)
   ├─ Ingest/Resolve/Analyze/Hypothesize/Report
   ├─ Governance & Audit
   └─ Optional: trigger **approved** Maestro runbooks (guard‑railed)
```

---

## 6) Embedding Maestro within our PMI & codebase

**PMI (Product/Project Management Infrastructure)** = our delivery fabric (repos/monorepo, issues, CI, IaC, observability, release mgmt, change control).

**Embedding rules:**

1. **Repo topology:** Maestro is its **own repo** with versioned packages. IntelGraph consumes **released packages** and/or a service endpoint. In‑repo glue (adapters) live under `apps/summit-maestro-adapters/*` in the IntelGraph monorepo.
2. **Contracts, not reach‑ins:** Maestro interacts with SIG **only** via stable contracts:
   - `Graph Ingest API` (bulk & streaming), `Provenance/Claim API`, `Policy Decision Point`, `Export/Disclosure API`.
   - Event topics: `ingest.*`, `er.*`, `risk.*`, `ops.*` (idempotent, signed, schema‑versioned).
3. **Policy continuity:** Maestro tasks must call the **same policy engine** IntelGraph uses (OPA/ABAC) with reason‑for‑access and license checks.
4. **Secrets & identity:** Use workload identities + sealed secrets; no static tokens in workflows.
5. **Observability:** Maestro emits traces/logs/metrics with correlation IDs that IntelGraph surfaces in case/audit views.
6. **Golden paths:** Provide out‑of‑the‑box runbooks for local dev, seeded demos, test data resets, backfills, and chaos drills.

---

## 7) Independence & reuse guidelines (for other projects)

- **Packaging:** Runtime service + language SDKs (TS/Java/Python) + connector/task plugin ABI.
- **Neutral schemas:** Do **not** hard‑code IntelGraph’s ontology; use mapping layers.
- **Config‑first:** All pipelines are declarative (YAML/JSON) with policy hooks and signed manifests.
- **Pluggable runners:** K8s jobs, containers, serverless; local runner for dev.
- **Tenant isolation:** Namespaces per tenant/project; budget & quota guards per namespace.
- **Versioning:** SemVer; migration guides; deprecation policy (N‑2 supported).

---

## 8) Key interfaces (initial)

**Maestro → IntelGraph**

- `POST /ingest/batch` (async) — returns job ID + provenance receipts
- `POST /ingest/stream` (Kafka/NATS topic contracts)
- `POST /claims/register` — evidence/claim manifests
- `POST /exports/request` — disclosure bundles with hash manifests
- `POST /policy/evaluate` — PDP call with context (purpose, authority, license)

**IntelGraph → Maestro (optional)**

- `POST /runbooks/trigger` — allowlisted workflows with inputs; requires policy pass
- `GET /runs/{id}` — status + logs + artifacts

---

## 9) Security & governance split

- **IntelGraph** is the **authoritative policy/data plane**. All user‑visible results, storage, and exports are governed here.
- **Maestro** executes work **under policy**, proves provenance, and hands off artifacts; it never bypasses SIG governance.

---

## 10) Non‑goals (for clarity)

- Maestro will **not** become a full analyst UI.
- IntelGraph will **not** embed a general DAG engine; it delegates to Maestro.
- Neither product will include features that enable unlawful harm or mass surveillance; defensive/ethical guardrails are mandatory.

---

## 11) Risks & mitigations

- **Coupling creep:** Avoid insider APIs; enforce contract tests and ADRs for any new interface.
- **Schema drift:** Neutral mapping + contract tests; versioned schemas.
- **Policy bypass risk:** Central PDP; deny by default; signed requests with workload identities.
- **Ops sprawl:** One Console for pipelines/runbooks; budget & SLO guardrails; canned runbooks.

---

## 12) KPIs & success metrics

- **For IntelGraph:** p95 policy‑aware graph query < 1.5s; time‑to‑first‑insight ↓ 30%; 100% export bundles with verifiable manifests.
- **For Maestro:** 90% of common ops via cataloged runbooks; pipeline MTTR < 15m; <2% failed runs due to config drift; N‑2 compatibility.

---

## 13) Initial OKRs (Q3–Q4 2025)

- **O1:** Stand up Maestro runtime & console with plugin SDK; ship 10 reference tasks/runbooks. _KR:_ 80% adoption by SIG services.
- **O2:** Define & stabilize SIG↔SM interface contracts. _KR:_ Contract tests in CI; zero “reach‑in” calls by EoQ.
- **O3:** Reuse beyond SIG. _KR:_ 1 external project live on Maestro; <1 week onboarding using docs/templates.

---

## 14) Decision records (ADRs)

- **ADR‑001:** Two‑product strategy (SIG product, SM conductor) — **Accepted**.
- **ADR‑002:** Contract‑only integration using stable APIs/events — **Accepted**.
- **ADR‑003:** Separate repos with packaged adapters — **Accepted**.

---

## 15) Next steps

1. Publish API/event contracts & schemas.
2. Scaffold Maestro repo (runtime, console, SDKs, sample tasks).
3. Instrument contract tests in IntelGraph CI.
4. Seed runbook catalog (dev bootstrap, demo seed, ingest backfill, chaos drill, disclosure packager).

---

## 16) Glossary

- **PMI:** Internal product/project management & delivery fabric (repos, CI/CD, IaC, observability).
- **Runbook:** Declarative DAG + code tasks executed by Maestro under policy with replayable logs.
- **Provenance receipt:** Hash‑manifest linking source → transform → output; verified on export.
- **PDP:** Policy Decision Point (OPA/ABAC) invoked at execution and query time.
