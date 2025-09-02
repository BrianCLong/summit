# Sprint 24 — IntelGraph Vertical Slice

**Dates:** Mon Aug 25 → Fri Sep 5, 2025 (10 working days)

---

## 1) Sprint Goal

**Platform‑first.** Stand up **dev → stage → prod** plus **ephemeral preview envs per PR**, codified with **Terraform modules** and **Helm charts** (core + predictive suite) and **sealed‑secrets** for secret management. Every merge **builds/publishes Helm charts** and **produces Terraform plans**; **PRs must show terraform plan + chart diff artifacts** prior to approval/merge.

**Secondary:** Maintain the IntelGraph vertical slice behind feature flags and ship via the new delivery pipeline.

**Success Criteria (demo‑able):**

- Create a PR → preview env spins up with seeded data and passes E2E smoke within 10 min; teardown on close.
- Promote dev→stage via **canary** with **auto‑rollback** on SLO burn or health check fail; schema‑migration gates prevent bricking prod.
- **Policy gates** enforce: provenance manifests present, citations resolve, no breaking UX diffs, **zero critical security findings**.
- **Observability:** OTEL traces, Prometheus metrics, SLO dashboard + burn alerts; rollback wired to alerts.
- **Supply chain:** SBOM attached to images; deps scanned; image signed; secret scans clean.
- **FinOps:** budget alerts in CI; merge blocked if query or storage cost tests exceed thresholds.
- **SRE:** incident classes, runbooks, auto‑remediation hooks, and a postmortem template published.

---

## 2) Sprint Scope (User Stories)

> **Track A — Platform (Committed)** • **Track B — Product (Flagged/Stretch)**

### P1. Environments & IaC (make this real first)

**As an** engineer **I want** dev→stage→prod and preview envs per PR backed by Terraform + Helm + sealed‑secrets **so that** delivery is reproducible and safe.

- **Acceptance Criteria**
  - Terraform modules for cluster, networking, storage, Neo4j, vector store, and CI service accounts; `terraform plan` artifact on every PR.
  - Helm charts for **core** and **predictive suite** build & publish on merge; PRs show **chart diff** artifact.
  - Preview envs per PR (namespace pattern `{repo}-{pr}-{sha}`) create on open, destroy on close.
  - Secrets only through **sealed‑secrets**; no plaintext in repo; CI fails on secret leak.
- **Tasks**
  1. TF modules: `modules/{network,eks,neo4j,vector,observability}`
  2. Charts: `charts/{core,predictive-suite}` + `helmfile` or release workflow
  3. Preview env GitHub Action (create/teardown) + seed data job
  4. Sealed‑secrets controller + developer workflow docs
- **Estimate:** 13 • **Owner:** Platform

### P2. Continuous Delivery policy (how we ship without regret)

- **Acceptance Criteria**
  - Canary deploys (Flagger/Argo Rollouts) with automatic rollback on error‑rate/latency SLO burn.
  - Schema migration gates: pre‑flight checks, reversible migrations, block deploy if gate fails.
  - Releases gated on acceptance patterns: provenance manifest present, citations resolve, UX snapshot diff non‑breaking.
  - Block release on **critical** security findings.
- **Tasks:** rollout controller + analysis templates; migration gate job; acceptance policy job.
- **Estimate:** 8 • **Owner:** Platform

### P3. Test pyramid in the pipeline (green or you don’t ship)

- **Acceptance Criteria**
  - **Unit/contract** (connectors, GraphQL types) run on PR.
  - **Cypher tests** against ephemeral Neo4j container.
  - **E2E** (ingest→resolve→runbook→report) against preview env on PR.
  - **Load (k6)** nightly on stage; thresholds codified.
  - **Chaos drills** (pod/broker kill) nightly on stage; must self‑heal.
  - **Security tests** (authz, query depth) + **acceptance packs** with golden outputs.
- **Tasks:** test harnesses + CI wiring; seed datasets; golden outputs repo.
- **Estimate:** 8 • **Owner:** QA+Platform

### P4. Observability‑driven rollback (telemetry is the tripwire)

- **Acceptance Criteria**
  - OTEL tracing wired through ingest → graph → copilot; Propagate trace IDs.
  - Prometheus metrics + Grafana dashboards; define SLOs (latency, error‑rate) and burn‑rate alerts.
  - Auto‑rollback linked to SLO burn alerts in delivery controller.
  - Autoscaling policies documented and applied.
- **Tasks:** OTEL SDKs; service dashboards; alert rules; HPA configs; rollback hooks.
- **Estimate:** 8 • **Owner:** Platform

### P5. Governance & provenance gates (policy by default)

- **Acceptance Criteria**
  - CI fails if: warrant/authority binding not attached to queries; license/TOS rules violated; provenance manifest missing in exports; citations don’t resolve.
  - Policy test pack runs on PR and in release gate.
- **Tasks:** policy as code (OPA/Conftest); provenance/citation checkers.
- **Estimate:** 3 • **Owner:** Platform+Compliance

### P6. Supply‑chain security (close the flank)

- **Acceptance Criteria**
  - SBOM (Syft) attached; deps scanned (Grype/Snyk); container scan (Trivy); image signed (Cosign); provenance attestation published.
  - Secret hygiene checks (Gitleaks) clean.
- **Tasks:** CI jobs + attestations storage; sign/verify steps in deploy.
- **Estimate:** 3 • **Owner:** Security

### P7. FinOps guardrails (speed without spend bleed)

- **Acceptance Criteria**
  - CI job enforces query‑cost and storage budget tests; alerts posted to PR; block on budget explosion.
  - Cost dashboard (Kubecost/Cloud budgets) linked in runbook.
- **Tasks:** budget definitions; cost tests; PR annotations.
- **Estimate:** 2 • **Owner:** Platform+FinOps

### P8. SRE & incident muscle memory (bend, don’t snap)

- **Acceptance Criteria**
  - Incident classes codified; auto‑remediation hooks for common faults.
  - Postmortem template + process published.
  - SLO‑burn alerts wired to both pager and rollback.
- **Tasks:** runbooks; automation scripts; paging policies.
- **Estimate:** 5 • **Owner:** SRE

---

### Track B — Product (Flagged/Stretch)

- Keep prior S1–S6 features **behind flags**, integrate with new pipeline; pull in only if burn‑up allows.
- **Stretch candidates:** S1 Ingest Wizard MVP (flagged), S4 Provenance UI badges, S5 Audit Trail skeleton.

---

## 3) Capacity & Load

- **Team cadence:** 10 days × (Dev/Platform 3.0, QA 1.0, FE 0.5) ≈ **~50 pts capacity**.
- **Committed (Track A):** P1(13)+P2(8)+P3(8)+P4(8)+P5(3)+P6(3)+P7(2)+P8(5) = **50 pts**.
- **Track B (stretch under flag):** limited pulls from S1–S6 if velocity permits.

---

## 4) Definition of Done (DoD)

- Code merged, reviewed, and green on CI; unit tests ≥80% for changed areas; basic perf sanity.
- Feature flags wired; metrics added; logs with correlation IDs.
- Security and PII checks pass; provenance recorded on all created/updated records.
- User‑facing copy reviewed; a11y pass for wizard and copilot panels.
- Demo script updated; docs updated; feature toggled on in the dev/staging envs.

## 5) Definition of Ready (DoR)

- Story has user value, acceptance criteria, design notes (if UI), and test ideas.
- Data samples available; dependencies identified; feature flag name reserved.

---

## 6) Non‑Functional Requirements (Sprint‑relevant)

- **Delivery:** canary + auto‑rollback; schema‑migration gates; policy gates (provenance, citations, UX non‑breaking); **zero criticals**.
- **Privacy & Governance:** warrant/authority bindings, license/TOS enforcement, provenance manifests on export.
- **Observability:** OTEL traces, Prometheus metrics, SLO dashboards, burn alerts linked to rollback.
- **Performance:** ingest 50k rows < 2 min; copilot p95 < 5s; k6 thresholds codified.
- **Security & Supply Chain:** SBOM, vuln scans, image signing, secret scans.
- **Cost:** budget tests in CI; alerts on projection spikes.

---

## 7) Architecture Notes (MVP)

- **Services:** Ingest (wizard, parser, job ctrl) • Graph API (schema, ER, provenance) • Copilot (RAG).
- **Data:** Object store for raw files • Graph store for entities/relations • Vector store for RAG.
- **Interfaces:** Web UI (wizard, entity panel, audit, copilot) • Admin console (flags, schema registry).

---

## 8) Risks & Mitigations

- **CSV variance causes ingest failures:** ship robust sampling + fallbacks; capture row‑level errors.
- **ER false merges:** start deterministic only; manual un‑merge tool stub.
- **RAG hallucinations:** strict case‑scoped retrieval; require citations; confidence display.
- **Policy tag misuse:** provide presets and explainers; deny export without tags.
- **Throughput surprises:** back‑pressure and job retries; cap concurrent ingests.

---

## 9) Test Plan (excerpt)

- **Unit & Contract:** connector adapters; GraphQL schema/types; policy checkers; migration pre‑flight.
- **Cypher:** deterministic merges; provenance writes; rollbacks idempotency.
- **E2E (Preview env):** ingest→resolve→runbook→report → asserts citations resolve & provenance attached.
- **Security:** authz matrix; query depth/complexity limits; secret scans.
- **Load (k6):** ingest throughput; copilot p95; graph write/read latencies under threshold.
- **Chaos:** nightly pod/broker kill; verify autoscaling + self‑healing; rollback on burn.
- **Acceptance Packs:** golden outputs for citations/provenance/UX snapshots.

---

## 10) Sprint Timeline & Ceremonies (America/Denver)

- **Sprint Planning:** Mon Aug 25, 9:30–11:00
- **Daily Stand‑up:** 9:15–9:30 (15 min)
- **Backlog Refinement:** Wed Aug 27 & Wed Sep 3, 10:30–11:15
- **Demo / Sprint Review:** Fri Sep 5, 10:00–11:00
- **Retrospective:** Fri Sep 5, 11:15–12:00

---

## 11) Definition of Metrics

- **Delivery:** sprint burndown; throughput; story carryover.
- **Quality:** escaped defects; failed runs per 100 jobs; test coverage.
- **Usage (demo env):** ingests/day; entities created; copilot queries with citations.
- **Governance:** % of nodes with policy tags; audit events per active user.

---

## 12) Environments & Release

- **Environments:** dev, stage, prod; **preview per PR** (namespaced). Seed datasets for dev/stage; prod locked to protected branches.
- **Terraform:** modules for core infra; `plan` on PR with artifact; `apply` only on protected branches with manual gate.
- **Helm:** charts for **core** & **predictive suite**; build & publish on merge; **chart‑diff** action on PR.
- **Secrets:** Bitnami **sealed‑secrets**; CI enforces no plaintext; rotation runbook.
- **Progressive Delivery:** Flagger/Argo Rollouts + Prometheus analysis; schema migration gate; rollback on SLO burn.
- **CI Job Inventory (GitHub Actions example):**
  - `ci:lint+unit` → unit/contract + policy tests
  - `ci:build` → Docker build, SBOM attach, image sign, push
  - `ci:scan` → deps/container/secret scans (block on critical)
  - `ci:helm` → chart build/package + chart‑diff artifact
  - `ci:tf-plan` → terraform plan artifact (PR)
  - `ci:preview-env` → create/update preview; run E2E smoke; teardown on close
  - `cd:deploy` (dev/stage) → canary + analysis + auto‑rollback
  - `cd:promote` (manual gate) → promote to prod if all gates green
- **Release Plan:** release to stage by Wed Sep 3 with canary; prod promotion behind manual gate on Thu Sep 4 if gates pass.

---

## 13) Owners & Contacts

- **Product:** TBD • **Tech Lead:** TBD • **FE:** TBD • **BE:** TBD • **QA:** TBD • **Design:** TBD
- **Stakeholders for demo:** Compliance, Analyst Lead, Platform Ops.

---

## 14) Attachments / Artifacts

- Sample CSV & mapping template (in repo `/samples/ingest/claims.csv`).
- Demo script (`/docs/demos/sprint24.md`).
- Test data manifest & provenance manifest template.

---

## 15) Exit Criteria Checklist

- [ ] PRs show **terraform plan** + **chart diff** artifacts.
- [ ] Preview envs spin up/down automatically per PR; E2E smoke green.
- [ ] Canary deploy in stage with auto‑rollback proven by drill.
- [ ] Schema migration gate prevents a breaking change.
- [ ] Policy gates: provenance present; citations resolve; UX diff non‑breaking.
- [ ] Security: **zero critical** findings; images signed; SBOM attached.
- [ ] Observability: SLO dashboard live; burn‑rate alerts hooked to rollback.
- [ ] FinOps: budget tests wired; PR annotation shows cost deltas.
- [ ] SRE: incident classes/runbooks published; postmortem template merged.

---

## 16) Cut‑to‑the‑Chase Checklist (This Week)

☐ Repo plumbing: actions/pipelines for build→test→scan→package (Docker+Helm) + SBOM + provenance artifact.
☐ Preview apps: spin ephemeral env per PR with seeded data + E2E smoke.
☐ Terraform in CI: plan on PR, apply on protected branches with manual gate.
☐ Canary + rollback: progressive delivery to dev/stage; rollback on SLO burn or health check fail.
☐ Policy gates: fail build if license/authority/provenance checks don’t pass; require “citations resolve” for publish.
☐ Chaos job: nightly pod/broker kill in stage; runbooks verified.
☐ Cost guard job: query budget tests + alerts.
