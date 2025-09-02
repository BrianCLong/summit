# Phase 5 (Months 13–18): External Trust, Certification & Platform Productization

**Intent:** Convert your hardened CI/CD + SRE practice into externally verifiable trust, customer‑visible reliability, and a productized internal platform. Keep shipping faster while proving safety to auditors, customers, and execs.

---

## North‑Star Outcomes

- **Trust:** SOC 2 (or ISO 27001) control walkthroughs pass with zero critical findings; third‑party pen test closes within 30 days.
- **Customer Reliability:** Public SLAs/SLOs with a real‑time status page; incident postmortems published within 7 business days of Sev‑1/2.
- **Platform Productization:** 95% paved‑road adoption; self‑service Backstage templates for primary stacks; time‑to‑first‑deploy ≤ 1 workday.
- **Resilience:** Quarterly org‑wide Game Day (region + identity + data); pipeline continuity drills (SCM/runner outage) pass in < 20m MTTR.
- **Cost & Perf:** p95 latency −15% QoQ on top‑5 endpoints; p95 cost‑to‑serve flat or ↓ 10% QoQ.

---

## Workstreams & Deliverables

### 1) External Certification & Third‑Party Assurance

- **Deliverables**
  - SOC 2/ISO control **mapping matrix** → live checks (CI/CD, GitOps, evidence packs).
  - **Customer Trust Portal**: downloadable Evidence Packs per release; signed changelogs; SBOMs; architecture + data‑flow diagrams.
  - **Third‑party penetration test** engagement; remediation backlog triaged and time‑boxed.
- **Acceptance**: Auditor dry‑run passes; Trust Portal live; pen test criticals closed ≤ 30 days.

### 2) Customer‑Facing Reliability

- **Deliverables**
  - Public **status page** with component SLIs; incident comms macros; public postmortem template.
  - **Error‑budget policy** published and enforced; feature freeze automation when budget exhausted.
  - **Canary rings** standardized: ring‑0 internal → ring‑1 canary tenants → ring‑2 general.
- **Acceptance**: 2 published postmortems without legal edits; budget‑driven freeze triggered at least once and respected.

### 3) Platform as a Product (Paved Road @ 95%)

- **Deliverables**
  - Backstage **Create‑a‑Service** v2 templates (Node/TS, Python, Go) with OTEL, rollout, budgets, SLO annotations, chaos hooks, DR checklists.
  - **Scorecards** with hard gates in CI on score < 80; adoption leaderboard; golden signals baked into templates.
  - **Internal SDK/CLI**: `ig create service`, `ig env preview`, `ig release evidence`, `ig dr restore`.
- **Acceptance**: 95% services on paved road; median time‑to‑first‑deploy ≤ 1 day.

### 4) Pipeline Continuity & Supply‑Chain Resilience

- **Deliverables**
  - **SCM outage drill** (GitHub/GitLab simulated) with mirrored read‑only and queued deploys; runner fleet failover.
  - **Artifact escrow**: mirror container/images + SBOM/provenance to secondary registry; signature verification cross‑registry.
  - **Key lifecycle**: continuous rotation, revocation drills; break‑glass flows with audit.
- **Acceptance**: 2 continuity drills pass; deploys continue during primary SCM brownout; evidence preserved.

### 5) Performance & Cost Autopilot

- **Deliverables**
  - **Adaptive budgets** using rolling P95 with percentile envelopes; automatic PR hints for hotspots.
  - **Autoscale policies** per service (HPA/VPA + KEDA where applicable); burst tests @ 2× traffic.
  - **Read‑path tuning**: DB index advisory job; cache‑hit baseline + alerts.
- **Acceptance**: Top‑5 endpoints −15% p95 latency; 2× traffic without SLO breach.

### 6) Data Governance & Privacy Rails

- **Deliverables**
  - **PII inventory** + DLP rules enforced in CI; field‑level lineage; masked preview datasets.
  - **Backfill contracts** with idempotency + cancellation; data retention checks.
  - **Schema compatibility** verified against sampled prod traffic.
- **Acceptance**: 0 data‑class incidents; all migrations pass forward/backward checks.

### 7) Multi‑Tenant & Access Boundaries (if applicable)

- **Deliverables**
  - Tenant isolation policy (namespaces, network, IAM); per‑tenant SLOs and budgets.
  - **Rate‑limit** and **quota** policies with exception workflow.
- **Acceptance**: Isolation checks in CI/CD; noisy‑neighbor tests pass.

### 8) Human Systems & Incident Mastery

- **Deliverables**
  - On‑call **charter v2** (no‑page hours, escalation ladders, load caps).
  - Quarterly **Exec War‑Room drill** (Sev‑1 live comms); comms SLAs enforced.
  - **Postmortem analytics** (recurring themes, MTTR drivers) → quarterly improvements.
- **Acceptance**: 100% Sev‑1 postmortems published ≤ 7 business days; measurable page‑load balance.

---

## Execution Cadence

- **Wave A (Weeks 1–4):** Control mapping → automated checks; Trust Portal MVP; status page; ring policy.
- **Wave B (Weeks 5–8):** SCM/runner continuity drills; artifact escrow; autoscale tuning; PII inventory + DLP.
- **Wave C (Weeks 9–12):** Pen test + remediation; paved‑road adoption push; Exec War‑Room drill; multi‑tenant checks.

---

## Immediate 10‑Day Orders

- [ ] Publish **Error‑Budget Policy** publicly; wire freeze automation to budget breach.
- [ ] Stand up **Status Page** with components & SLIs; connect to alert webhooks.
- [ ] Launch **Trust Portal** (static site or Backstage plugin) serving Evidence Pack downloads per release.
- [ ] Configure **Artifact Escrow** to secondary registry + attestations.
- [ ] Schedule **SCM/Runner Outage Drill**; write pass/fail.
- [ ] Kick off **Third‑Party Pen Test** SOW; define vulnerability age SLO (P90 ≤ 14 days).
- [ ] Release **CLI v1** (`ig`) for paved‑road ops tasks.
- [ ] Run **p95 latency hunt** on top‑5 endpoints; open PRs with budgeted targets.
- [ ] Start **PII inventory** + DLP gate in CI for preview datasets.
- [ ] Standardize **canary rings** (ring‑0/1/2) across services.

---

## 30 / 60 / 90‑Day Outcomes

- **Day 30:** Trust Portal live; status page live; Error‑Budget policy enforced; first continuity drill passed; CLI v1 released.
- **Day 60:** Artifact escrow operational; autoscale tuned; PII/DLP gates enforced; first pen test completed with remediation plan.
- **Day 90:** Auditor walkthrough without criticals; paved‑road ≥ 95%; −15% p95 latency on top‑5; two continuity drills passed; 2 published public postmortems.

---

## Gate Library v3 (OPA/Conftest Outlines)

- deny if: release without Evidence Pack hash; exception without approver/expiry; missing SLO annotations; rollout without canary steps; image lacking attestation; privileged/hostPath; LoadBalancer without `sourceRanges`; missing NetworkPolicy/PDB/CPU‑mem limits; preview dataset without DLP label; multi‑tenant workload without tenant label.

---

## Artifacts to Ship (PR Batch Suggestions)

1. `trust-portal/` static site + GitHub Pages action; index Evidence Packs by tag.
2. `statuspage.yml` GitHub Action to update external status page on SLO burn.
3. `escrow-sync.yml` to mirror images/attestations to secondary registry.
4. `scm-continuity-drill.yml` simulating SCM/runner outage; report MTTR.
5. `ig-cli/` with commands: create service, preview, release evidence, dr-restore.
6. `opa/` policies: budget‑freeze, tenant‑labels, dlp‑required.
7. `dlp/` redaction rules + preview dataset pipeline.
8. `perf/` latency‑hunt playbook + k6 budget updates.

---

## Definition of Done (Phase 5)

- Trust Portal + status page public; 2 continuity drills; pen test criticals closed ≤ 30 days; paved‑road ≥ 95%; latency/cost goals met; audit walkthrough passes with zero criticals.
