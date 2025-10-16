# Sprint 21 — CompanyOS + Switchboard (Oct 6 → Oct 17, 2025)

**Release Train:** Q4’25 “Foundations GA” (wave 1)  
**Cadence:** 2 weeks • Daily standup → Weekly portfolio/risk → Canary + rollback gates  
**Principles:** AI‑first • Zero‑trust • Provenance‑first • Multi‑tenant • Operable • White‑label ready

---

## 0) Sprint Theme & Goal

**Theme:** From working slices to **operable, policy‑gated, provable** product increments.  
**Sprint Goal:** Ship a canary build (staging → 1 pilot tenant) where: (a) Graph read p95 on a 50k‑node test tenant meets target, (b) all privileged actions emit signed receipts + policy decisions, (c) Switchboard approvals center is usable end‑to‑end with rationale capture and audit replay.

**Success KPIs (by 2025‑10‑17):**

- **Perf:** p95 graph query (3‑hop on 50k nodes, warm) \< **1.5s**; p99 error rate \< **0.5%**.
- **Provenance:** 100% of privileged actions carry **signed receipts** (evidence bundle + OPA decision log).
- **Security:** SLSA/SBOM emitted for all deployable images; **least‑privilege IAM** on new services (no wildcards).
- **FinOps:** Per‑tenant metering events end‑to‑end; **cost attribution ≥ 95%** accuracy in staging dashboard.
- **UX:** Approvals with rationale in Switchboard: submit → review → approve/deny → immutable audit available in Timeline.

---

## 1) CompanyOS — Core Epics & Stories

### EPIC A — Graph & Policy

- **A1. 50k‑Node Perf Pass**  
  _Stories:_ index tuning; query plan cache; hot‑path profiling; n+1 eliminations; pagination defaults.  
  _Acceptance:_ 3‑hop canned queries p95 \< 1.5s (staging), p99 \< 2.2s; traces show \>90% hits on prepared plans.
- **A2. ABAC/OPA Coverage ≥ 90% (Privileged Flows)**  
  _Stories:_ attribute catalog v1; policy bundles; simulation harness; deny‑by‑default.  
  _Acceptance:_ policy regression suite green; simulation CLI shows coverage; **step‑up** on high‑risk ops wired.
- **A3. Provenance Ledger Slice (Receipts v1)**  
  _Stories:_ receipt schema; notary adapter; evidence compaction; export API.  
  _Acceptance:_ every privileged action emits signed receipt; export bundle verifies with CLI; selective disclosure works.

### EPIC B — Metering, Costing & Billing

- **B1. Metering Pipeline**  
  _Stories:_ event schema; ingestion; idempotent consumers; DLQ policy; replay w/ provenance.  
  _Acceptance:_ 10k synthetic events ingest \< 1m; replay preserves order & dedupe; evidence bundle captured.
- **B2. FinOps Dashboard v0.9**  
  _Stories:_ per‑tenant usage, unit economics; tag normalization; cost anomaly alert.  
  _Acceptance:_ dashboard renders COGS per tenant; attribution error \< 5% on staged dataset.

### EPIC C — Security & Supply Chain

- **C1. SBOM + SLSA attestations**  
  _Stories:_ build provenance; cosign signing; policy‑gated deploys.  
  _Acceptance:_ images signed; admission policy blocks unsigned; SBOMs attached to release artifacts.
- **C2. Dual‑Control Deletes + Purge Manifest**  
  _Stories:_ approval policy; evidence writing; redaction test.  
  _Acceptance:_ delete requires 2 approvers; purge manifest generated & verified; audit replay passes.

---

## 2) Switchboard — Epics & Stories

### EPIC D — Approvals & Rationale Center

- **D1. Approvals E2E**  
  _Stories:_ request forms; policy evaluation; rationale capture; notifications; audit timeline.  
  _Acceptance:_ demo runbook shows create → evaluate (OPA) → approve/deny with rationale → receipt visible.
- **D2. Rationale Library**  
  _Stories:_ templated justifications; reviewer hints; selective disclosure.  
  _Acceptance:_ reviewers pick a template; rationale stored in evidence; redacted view for non‑privileged roles.

### EPIC E — Command Palette & Incident Hub

- **E1. Command Palette v1**  
  _Stories:_ entity search, common actions, keyboard UX; policy‑gated actions.  
  _Acceptance:_ 10 core actions complete; denied actions show policy reason; telemetry events logged.
- **E2. Runbook Center v0.9**  
  _Stories:_ runbook markdown → executable steps; approvals inline; receipt after each step.  
  _Acceptance:_ sample incident runbook executes end‑to‑end with receipts and rollback notes.

---

## 3) Definition of Done (applies to every Story)

- **Spec & Policy:** updated spec, OPA bundle diff, acceptance tests.
- **Tests:** unit/integration green; policy simulation; golden dataset/regression where applicable.
- **Provenance:** evidence bundle & signed receipt attached to PR; selective disclosure reviewed.
- **Observability:** SLOs + dashboards + alerts; trace exemplars in PR.
- **Docs & Runbooks:** docs‑as‑code updated; runbook snippet added.
- **Packaging:** Helm/Terraform/module changes; seed data; feature flags & ramps.
- **Changelog:** perf & cost impact noted.

---

## 4) Milestones & Dates (America/Denver)

- **2025‑10‑06 Mon:** Kickoff; canary guardrails; perf target lock.
- **2025‑10‑09 Thu:** Perf checkpoint; policy coverage ≥ 70%; receipts wired on pilot flows.
- **2025‑10‑14 Tue:** Switchboard approvals E2E demo; metering pipeline soak.
- **2025‑10‑17 Fri:** Canary go/no‑go; release notes; evidence bundle compiled.

---

## 5) Risks & Mitigations

- **Perf regressions** from policy hooks → _Mitigation:_ cache decisions; bulk attribute fetch; perf budget gates.
- **Policy drift** across services → _Mitigation:_ centralized bundle versioning + admission gate.
- **Audit payload bloat** → _Mitigation:_ compaction, envelope references, sampled full payloads.
- **Step‑up auth friction** → _Mitigation:_ risk‑based prompts; remember‑device; UX copy review.

---

## 6) Owners & RASCI

- **CompanyOS:** A1/A2/A3 → Core Platform; B1/B2 → FinOps + Data; C1/C2 → Security/Platform.
- **Switchboard:** D1/D2/E1/E2 → App Team; shared OPA bundles via Policy Guild.
- **Release Captain:** coordinates canary, evidence, and rollback readiness.

---

## 7) Exit Criteria (Release Gate)

- Canary tenant runs 72h with SLOs met, **0 P1s**, no policy drift; receipts verify with public CLI; dashboards show perf + cost; runbook demo recorded.

---

### Backlog Candidates (stretch if green)

- Entity resolution boost (TF‑IDF + embeddings) on ingest path.
- Data residency tags in evidence bundles.
- Partner theme pack scaffold (white‑label kit v0.1).
