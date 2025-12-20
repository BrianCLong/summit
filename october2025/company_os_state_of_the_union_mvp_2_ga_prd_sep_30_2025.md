# CompanyOS – State of the Union, MVP‑2 & GA PRD

_Date:_ **September 30, 2025**
_Owner:_ **Architect‑General (Cump IG)**
_Stakeholders:_ Platform Eng, SRE, SecOps, Data, Product Ops, GTM, Compliance

> **North Star:** Deliver CompanyOS—a production‑grade, auditable, policy‑governed operating system for the company and white‑label customers. Operate with separation of concerns, deterministic supply chain, and idempotent, reversible deployments. Evidence or it didn’t happen.

---

## 0) Executive Summary

We’ve flipped the "summit" monorepo public and now need to harden, converge, and ship **MVP‑2** (90‑day horizon) while laying concrete for **GA** (12‑18 months). The repo already contains the primitives to build our **Intelligence Fabric (Summit / IntelGraph)** and **Execution Fabric (Maestro Conductor + Policy Gates)**, with significant scaffolding for observability, security, and data operations.

**Immediate objective:** Align the portfolio around a paved‑road platform (golden paths + policy packs) and ship 3 user‑visible capabilities with full compliance artifacts, then expand into GA with white‑label automation, multi‑tenant policy & residency, and sealed supply chain.

**Definition of Winning:**

- **MVP‑2:** 3 external users successfully run CompanyOS in a managed environment with signed artifacts, SLO dashboards, and audit export; 1 white‑label pilot configured end‑to‑end from templates.
- **GA:** Multi‑tenant SaaS + self‑host capable, policy‑governed deployments with SBOM+SLSA provenance, OPA federation, residency controls, and hardened runtime; 3 paying customers; 95% golden‑path adoption internally.

---

## 1) Where We Are — Repo Recon (Public Surface)

_Observed top‑level assets and signals (non‑exhaustive; reflects current public tree):_

- **Architecture & Governance Artifacts**: `adr/`, `.evidence/`, `SECURITY/`, `RUNBOOKS/`, `audit/`, `controls/`, `contracts/`
- **Execution Fabric**: `.maestro/`, `.mc/`, `conductor-ui/`, `controllers/`, `cli/`, `compose/`, `deploy/`, `charts/`, `docker/`
- **Intelligence Fabric**: `catalog/`, `activities/`, `analysis/`, `cognitive-insights/`, `cognitive_insights_engine/`, `cognitive-targeting-engine/`, `ai-ml-suite/`
- **Data Spine**: `data/`, `db/`, `data-pipelines/`, `airflow/dags/` (ETL/C DC), `connectors/`
- **Observability**: `alerting/`, `alertmanager/`, `dashboard/`, `dash/`, `benchmarks/harness/`
- **Security**: `.security/`, `crypto/kms/`, `.githooks/`, `.husky/`, `.github/` (Actions/Checks), `.vale/` (docs lint), `.zap/` (DAST), `clients/cos-policy-fetcher/`
- **Product & UX**: `apps/`, `client/` + `client-v039/`, `conductor-ui/`, `docs-site/`, `brands/`, `comms/templates/`
- **Standards & Golden Paths**: `GOLDEN/datasets/`, `config/`, `companyos/` (platform root), `charts/` (Helm), `deploy/`, `compose/`
- **Evidence of Active Ops**: `bug-bash-results/20250922/`, `archive/20250926/` (cleanup cadence), `backlog/`

**Signals:** Strong alignment to the Prime Directive (policy & evidence first), extensive scaffolding for CI/CD and security, and a monorepo structure suitable for paved‑road tooling. Gaps remain in: cross‑cutting threat model, multi‑tenant tenancy boundary, formal SLO kits per service, and one‑click white‑label automation.

---

## 2) Target Architecture (C4‑ish) & Platform Primitives

### 2.1 Context (C1)

- **Actors**: Operators (SRE/SecOps), Builders (platform/product devs), Tenants (customers/white‑label), Data Stewards, Compliance Officers.
- **Systems**:
  - **CompanyOS Platform** (paved road, policy fabric, golden paths).
  - **IntelGraph** (graph+timeline+map, provenance‑first).
  - **Maestro Conductor (MC)** (plans, orchestrates, and gates changes via OPA/ABAC).
  - **Observability Stack** (Prometheus/Grafana, structured logs, traces).
  - **CI/CD** (provenance + attestations; SBOM; signatures; SLSA‑aligned).

### 2.2 Containers (C2)

- **APIs** (`api/`, `apis/`): stateless services with typed interfaces, OpenAPI contracts, auth via OIDC + step‑up WebAuthn; policy sidecar.
- **IntelGraph Services** (`catalog/`, `activities/`, `analysis/`): event‑sourced ingestion, graph store, timeline index, map tiler; provenance ledger.
- **MC Orchestrator** (`.maestro/`, `.mc/`, `controllers/`, `conductor-ui/`): workflow engine, policy evaluation (OPA), rollout manager, canary controller.
- **Data Spine** (`data-pipelines/`, `airflow/dags/`, `connectors/`, `db/`): CDC into lake/warehouse; schema versioning; lineage.
- **Edge & Clients** (`client/`, `client-v039/`, `apps/`): progressive disclosure UI, in‑app “why/how” telemetry.
- **Security Services** (`crypto/kms/`, `.security/`): KMS broker, secret provisioning, signing service.

### 2.3 Components (C3)

- **Policy Fabric**: OPA bundles, ABAC evaluator, policy distribution/rollback, disclosure packager, data redaction library.
- **Release Manager**: canary manager, automated rollbacks, error budget guard, synthetic probes.
- **Provenance & Supply Chain**: SBOM gen, sigstore/cosign sign+verify, SLSA provenance attestations, CVE budget gate.
- **Observability First**: standard SDK, golden dashboards, SLO kit per service, alertmanager wiring.

### 2.4 Code‑Level (C4, exemplar patterns)

- **Service Template**: typed interface, OpenAPI, Healthz, Metrics, Tracing, OPA check hooks, SBOM make target, Helm chart, runbook.
- **Data Job Template**: Airflow DAG with lineage annotations, schema registry bump, residency label, budgeted retries, test fixtures.

---

## 3) Gaps & Risks (Portfolio Balance Sheet)

**Architecture / Platform**

- Multi‑tenant boundary & tenancy isolation policy not codified across all services.
- Policy pack distribution and rollback story partially implemented; needs atomic, versioned releases + cohort rollout.
- No single **Threat Model** document spanning IntelGraph + MC + supply chain.

**Security / Compliance**

- End‑to‑end SLSA provenance not enforced at all gates (pre‑merge vs pre‑release parity).
- Secrets lifecycle: rotation cadence and envelope encryption not uniform across services.
- Redaction & DLP guards exist in parts, but not standardized across ingest paths.

**Data**

- Unified schema registry & lineage view exist in pieces; residency & retention tags not enforced end‑to‑end.
- CDC/ingestion replay + backfill guardrails need hardening.

**Observability & Ops**

- SLO kits not universally adopted; synthetic probes limited.
- Canary/rollback scripts exist but not integrated as “one switch” in MC.

**Dev Ergonomics**

- Local dev (`docker compose`) stacks exist, but hot‑reload + seed datasets inconsistent; test runtime budgets drift.

---

## 4) MVP‑2 PRD (90‑Day, Now‑Value)

### 4.1 Problem Statement

Teams and early pilots need a reliable paved road to ship features behind policy gates with audit‑ready evidence and fast rollback. Today, primitives exist but are fragmented.

### 4.2 Objectives & Success Metrics

- **O1.** One‑click scaffold → deploy for a new service on the paved road (golden path adoption **≥85%** for new services).
- **O2.** End‑to‑end signed artifacts with SBOM + provenance attached to each release (**100%** for paved‑road services).
- **O3.** Policy gates enforce ABAC, data residency & disclosure packaging on ingress/egress (**0 critical violations** in canary).
- **O4.** SLO kits live: latency, availability, and error budget dashboards with tested alerts (**100%** coverage for paved‑road services).
- **O5.** Audit export ready: evidence bundles (ADR, SBOM, attestations, release notes) exportable per release.

### 4.3 In‑Scope (MVP‑2)

1. **Golden Path Platform v1**
   - Repo scaffolds (`cli` generator), standard service template, Helm chart, policy sidecar wiring, CI workflow template.
   - "Depot Day" refresh: paved‑road templates, lints, and checks.
2. **Policy Fabric v1**
   - OPA bundle build/publish; ABAC evaluator; data residency tags; disclosure packager; redaction library.
   - Policy cohort rollout + rollback plan.
3. **Supply Chain v1**
   - SBOM (cyclonedx/spdx), cosign signing + verification, SLSA provenance attestation, CVE budget gate.
4. **Release & Reliability v1**
   - Canary manager; synthetic probes; automated rollback; error budget enforcement; runbooks.
5. **Observability First v1**
   - SDK; golden dashboards; SLO kits per service; alertmanager integration; e2e probes for 3 critical paths.
6. **White‑Label Pilot v0**
   - Configurable theming/branding, policy packs per tenant, tenant secrets bootstrap; 1 pilot tenant end‑to‑end.

### 4.4 Out‑of‑Scope (for MVP‑2)

- Full multi‑region geo‑fencing; advanced chargeback; BYOK‑HSM; cross‑tenant analytics.

### 4.5 Users & Jobs‑To‑Be‑Done

- **Platform Dev**: scaffold → code → ship via paved road; see SLOs; pass gates.
- **SRE/SecOps**: operate with SLOs, probes, and rollback; verify signatures; export audit.
- **Data Steward**: tag datasets; enforce residency; review disclosures.
- **Tenant Admin**: apply policy pack; brand UI; manage secrets.

### 4.6 Requirements (Functional)

- **F1** Scaffold CLI (`companyos new service`) generates: repo module, Dockerfile, SBOM targets, OPA hooks, Helm chart, CI pipeline, runbook stub, SLO kit stubs.
- **F2** Policy packs defined in code: ABAC rules, residency tags, disclosure templates; packaged and versioned; applied at ingress/egress.
- **F3** CI gates: secret scan, license scan, SAST, unit+integration tests, OPA evaluation; pre‑release: SBOM, sign, verify, CVE budget check; post‑release: drift + attestation validate.
- **F4** MC canary: traffic split, synthetic probe watch, auto‑rollback on SLO breach; evidence snapshot captured.
- **F5** Audit export: zip bundle containing ADRs, SBOMs, signatures, release notes, policy evaluations, probe results.

### 4.7 Non‑Functional Requirements

- **Availability:** ≥99.5% for MC control plane (pilot scope).
- **Latency:** P95 < 250ms for policy checks; P95 < 150ms for service health endpoints.
- **Security:** All artifacts signed; vulnerabilities with CVSS ≥7 blocked unless waived; waivers time‑boxed.
- **Compliance:** Residency labels on all datasets; disclosure pack present for external data egress.
- **Observability:** 100% paved‑road services expose metrics/logs/traces; golden dashboards exist and are linked in runbooks.
- **Performance:** Template services handle 500 RPS baseline on dev cluster with CPU budget caps.

### 4.8 Acceptance Criteria (AC)

- **AC‑1:** Creating a new service via CLI and merging first PR yields a signed container with attached SBOM and a passing policy evaluation.
- **AC‑2:** Deploying via MC canary performs traffic split, monitors probes, and auto‑rolls back upon induced failure.
- **AC‑3:** SLO dashboards for the new service show latency/availability; synthetic probe visible; alert fires in test.
- **AC‑4:** A sample dataset marked `EU‑Only` is blocked from US region egress without approved disclosure pack.
- **AC‑5:** Audit export is downloadable and includes all expected artifacts for a given release SHA.

### 4.9 Telemetry & Evidence

- Post‑deploy verification checklist + archived evidence in `.evidence/`.
- Dashboards links stored in `RUNBOOKS/` for each service.

### 4.10 Rollout & Risk

- **Rollout:** flag‑gated; cohort of internal services first, then pilot tenant.
- **Risks:** policy regression causing false blocks; signing infra outages; probe flakiness.
- **Mitigations:** blue/green for policy bundles; offline signing cache; probe stabilization sprints.

---

## 5) GA PRD (12–18 Months, Enduring Moats)

### 5.1 GA Themes

1. **Multi‑Tenant Platform**: hard tenancy isolation, per‑tenant policy bundles, resource quotas, BYOK (KMS/HSM), residency enforcement.
2. **Policy & Compliance Fabric**: federated OPA, fine‑grained ABAC/Attribute stores, disclosure lifecycle with approvals, privacy budget hooks.
3. **Deterministic Supply Chain**: SLSA‑3+ provenance, hermetic builds, reproducible pipelines, anti‑tamper attestations.
4. **Observability at Scale**: error budget enforcement across portfolio, synthetic mesh, golden dashboards generator.
5. **Data Spine**: unified schema registry, lineage graph UI, CDC with backfill governance, cross‑region data movement policy.
6. **White‑Label Automation**: tenant bootstrap wizard, theming engine, catalogs of connectors, policy marketplace.

### 5.2 GA Functional Requirements

- **G‑F1** Multi‑tenant control plane with tenant‑scoped policy bundles; OPA federation; per‑tenant secrets and keys (BYOK/HSM option).
- **G‑F2** Residency & export controls enforced at API, data pipeline, and UI levels with central policy registry.
- **G‑F3** End‑to‑end SLSA‑3+: provenance for source→build→deploy; in‑cluster verification; stored attestations.
- **G‑F4** Canary manager v2: black/red experiments; budgeted releases; auto‑halt on budget burn.
- **G‑F5** Schema registry + lineage explorer; privacy budget hooks; anonymization & minimization utilities.
- **G‑F6** White‑label provisioning: one‑click tenant creation, DNS/TLS, branding, connector selection, policy pack assignment.
- **G‑F7** Cost & Efficiency: autoscaling with guardrails, infra cost per active unit SLO; per‑tenant quotas and cost exports.

### 5.3 GA Non‑Functional

- **Availability:** ≥99.9% control plane; ≥99.95% public APIs.
- **Security:** All artifacts signed; KMS‑backed keys; periodic key rotation; zero known critical vulns.
- **Compliance:** Data retention & residency enforced; audit trails exportable; DLP and disclosure approvals tracked.
- **Performance:** P95 policy check <150ms; template services sustain 2k RPS on standard node group.
- **Operability:** All services with runbooks; chaos‑lite probes in canary per release.

### 5.4 GA Acceptance Criteria (selected)

- Tenants isolated at network, namespace, and policy scopes; cross‑tenant access provably blocked via tests.
- OPA federation supports hot‑swap policy bundles; rollback within 2 minutes.
- Audit export includes SLSA provenance, SBOM, and compliance assertions with digital signatures.
- White‑label wizard creates a new tenant in <15 minutes with all policy and branding applied.

---

## 6) Workstreams, Milestones & Timeline

### 6.1 MVP‑2 (Oct–Dec 2025)

- **Oct 2025**
  - Golden Path v1 released; CLI scaffolder published; templates migrated (≥3 services).
  - SBOM + signing operational in CI for paved‑road repos.
- **Nov 2025**
  - Policy Fabric v1 enforcing ABAC + residency; disclosure packager in egress proxies.
  - SLO kits + golden dashboards live; synthetic probes on 3 critical paths.
- **Dec 2025**
  - MC canary manager v1 with automated rollback; first white‑label pilot live; audit export passes evidence review.

### 6.2 GA (Q1–Q4 2026)

- **Q1–Q2 2026**: Multi‑tenant control plane; schema registry + lineage; BYOK (KMS).
- **Q3 2026**: SLSA‑3+ provenance; OPA federation; privacy budgets; policy marketplace beta.
- **Q4 2026**: GA readiness—scalability hardening; cost SLOs; 3 paying customers.

---

## 7) Implementation Plan (Golden Paths)

### 7.1 Paved‑Road CI/CD Template

- **Pre‑merge:** secret scan, license scan, SAST, unit/integration/e2e, OPA eval, DLP check.
- **Pre‑release:** SBOM (CycloneDX/SPDX), cosign sign; SLSA provenance; CVE budget; policy regression suite.
- **Post‑release:** drift detect; attestation validation; audit event snapshot; chaos‑lite probe in canary.

### 7.2 Service Template Layout

```
services/<name>/
  adr/                  # ADRs for service decisions
  api/                  # OpenAPI and handlers
  charts/<name>/        # Helm chart with policy sidecar
  ci/                   # Reusable CI templates
  opa/                  # Policy hooks, rego tests
  pkg/                  # Typed core
  internal/             # adapters
  scripts/              # local dev, smoke tests
  runbook.md            # link to dashboards & probes
  slo.yaml              # SLOs and budgets
  Makefile              # sbom, sign, attest, test
```

### 7.3 Data Job Template Layout

```
data-jobs/<name>/
  dags/                 # Airflow
  schema/               # versioned schemas
  tests/                # fixtures and validation
  lineage.yaml          # dataset dependencies
  residency.yaml        # region constraints
  Makefile              # unit tests, static checks
```

### 7.4 Policy Pack Structure

```
policy-packs/<pack-name>/
  abac/                 # attributes & rules
  residency/            # data tags & region policies
  dlp/                  # redaction rules
  disclosures/          # templates & checklists
  tests/                # conftest rego tests
  manifest.yaml         # version, cohorts, rollback plan
```

---

## 8) Data & Compliance

- **Classification:** `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED` (PII/PHI/Export).
- **PII Minimization:** schema checkers; privacy budget trackers in analytic queries.
- **Residency:** dataset‑level tags (`US‑Only`, `EU‑Only`); enforced in APIs and pipelines.
- **Lineage:** capture at source and pipeline edges; render in IntelGraph.
- **Disclosure:** automated generation for egress; approval workflow; archive in audit bucket.

---

## 9) Observability & SLOs

- **SDK:** standard metrics (RED/USE), structured logs, trace IDs, audit IDs.
- **Golden Dashboards:** generated from `slo.yaml`; ship with every service.
- **SLO Baselines:**
  - Control plane availability ≥99.5% (MVP‑2), 99.9% (GA).
  - Policy check P95 <250ms (MVP‑2), <150ms (GA).
- **Probes:** synthetic e2e for canary + steady‑state; failure injection for rollback tests.

---

## 10) Security & Threat Model (Initial Cut)

- **Assets:** source code, build pipelines, containers, keys, data, policy bundles, audit evidence.
- **Adversaries:** supply‑chain attackers, insider misuse, rogue tenants, data exfiltration via connectors.
- **Controls:** least privilege IAM; signed commits; branch protections; SBOM gating; OPA on ingress/egress; KMS with rotation; DLP/redaction; anomaly alerts.
- **Open Items:** end‑to‑end threat model doc; STRIDE per major service; tenant boundary tests.

---

## 11) Runbooks & Incident Doctrine

- **Containment:** minutes; roll back decisively via MC; inform in clear terms.
- **Evidence:** export audit snapshot; attach to incident ticket; post‑mortem with guardrails.
- **Regression:** add tests; template guardrails; linters updated.

---

## 12) Deliverables Checklist (Evidence or It Didn’t Happen)

- ADR per decision (stored in `adr/` under service).
- C4 diagrams checked into repo (`docs/architecture/`).
- Threat model per service; portfolio threat model.
- Tests + coverage reports; performance benchmarks on hot paths.
- CI logs with signed artifacts; SBOM & vuln report per release.
- SLO dashboards URLs in runbooks; alerts tested and recorded.
- Release notes + migration notes + customer comms (if user‑facing).
- Post‑deploy verification artifacts in `.evidence/`.

---

## 13) RACI & Org Plan (Battle Rhythm)

- **Platform (Golden Paths, CI/CD, Policy Packs)** – _R:_ Platform Eng; _A:_ Architect‑General; _C:_ SRE, SecOps; _I:_ Product Ops.
- **MC & Release Reliability** – _R:_ SRE; _A:_ Architect‑General; _C:_ Platform; _I:_ Product Ops.
- **IntelGraph & Data Spine** – _R:_ Data Eng; _A:_ Data Lead; _C:_ SecOps; _I:_ Compliance.
- **Security & Supply Chain** – _R:_ SecOps; _A:_ CISO/Delegate; _C:_ Platform; _I:_ All.
- **White‑Label & Tenancy** – _R:_ Product Eng; _A:_ PM; _C:_ Platform/SecOps; _I:_ GTM.

**Weekly Rhythm:** Mon Portfolio stand‑up; Midweek ADR reviews & threat modeling; Fri Evidence review; Rolling Depot Days.

---

## 14) Backlog (Prioritized)

1. Golden Path v1 templates & CLI generator.
2. SBOM/signing/provenance gates.
3. Policy packs v1 + cohort rollout/rollback.
4. SLO kits + golden dashboards + probes.
5. MC canary manager v1 + auto‑rollback.
6. Audit export pipeline.
7. White‑label pilot (branding + policy + secrets).
8. Multi‑tenant control plane (GA track).
9. Schema registry + lineage explorer (GA track).
10. BYOK (KMS) and rotation runbooks (GA track).

---

## 15) Appendix A — Directory Mapping (Observed → Capability)

- `companyos/` → Platform root, paved road.
- `.maestro/`, `.mc/`, `controllers/`, `conductor-ui/` → Execution Fabric (MC).
- `catalog/`, `activities/`, `analysis/` → IntelGraph (graph/timeline/map).
- `data-pipelines/`, `airflow/dags/`, `connectors/`, `db/` → Data Spine.
- `alerting/`, `alertmanager/`, `dashboard/`, `benchmarks/harness/` → Observability.
- `.security/`, `crypto/kms/` → Security & KMS.
- `GOLDEN/datasets/`, `charts/`, `deploy/`, `compose/`, `cli/` → Golden paths & infra.
- `RUNBOOKS/`, `SECURITY/`, `audit/`, `.evidence/` → Governance & evidence.
- `clients/cos-policy-fetcher/` → Policy distribution client.

---

## 16) Appendix B — Sample ADR Template

```
# ADR-XXX: <Decision>
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded
Context: <Problem, constraints, forces>
Decision: <What and why>
Consequences: <Trade-offs, risks>
Alternatives: <Considered>
Evidence: <Links to benchmarks, threat model, POC>
```

---

## 17) Callouts & TODOs

- Authoritative threat model and multi‑tenant boundary tests are the two biggest deltas to GA.
- Drive golden‑path adoption via migration sprints; enforce with light‑touch governance (scorecards in Evidence Review).
- Keep budgets: latency, error budgets, CVE; publish weekly.

> **Operating Slogans:** Logistics wins; evidence speaks. Policies are code; compliance is continuous. Move the bottleneck; compound the moat. Small PRs; big impact.
