[MODE: WHITE]

# DIRK IG — Counter‑Threat & Intel Director Workstream (Q4 2025)

**Classification:** Internal // Need‑to‑Know • **Owner:** DIRK IG (Directorate K++) • **Date:** 2025‑09‑30 (America/Chicago)

---

## A) Executive Summary (Decisions & Next Steps)

- **Adopt this DIRK IG workstream** aligned to the October pack and repo state; cadence is **biweekly Wednesday sprints** with weekly staging cuts and biweekly prod releases.
- **Three priority thrusts:** (1) **Provable Compliance** (provenance, attestations, policy‑as‑code), (2) **Operational Hardening** (detections, runbooks, cost/safety guardrails), (3) **Delivery Conductor** (release evidence bundles and GA readiness gates).
- **Start now:** Kick off **Sprint 2025‑10‑01 → 2025‑10‑14** with scope and DoD below; stand‑up the Victory Ledger and Evidence Bundle pipeline on Day 1.
- **Gap‑closers** included here as actionable tasks (cheap, fast, high‑impact) to seal edges in the existing October plans.

---

## B) Findings & Rationale (What, Why, So‑What)

**Sources reviewed (high‑level):** October pack (numerous sprint files incl. `intelgraph_mc_sprint_2025_10_01_v_1_0.md` and follow‑ons), Switchboard docs, GA release notes drafts, installer/infra packs, and Summit repo (extensive CI/CD workflows, security docs, salvage archives). ZIP provenance (SHA‑256):

- `october2025.zip` → `92ab340ee190b0078199dad06befe50ca15e7537347f6100b7cd5a7bdd726702`
- `summit-main (1).zip` → `27f925b91197b7354da23bbf09b5c4a9d45803d5d39fca7acd058355e7679388`

**Key observations**

1. **Cadence pre‑defined**: October pack sets **biweekly Wednesday sprints** with weekly staging cuts; aligns with GA preparation—keep it.
2. **Strong deployable‑first ethos** in IntelGraph; however, **proof‑carrying artifacts** (attestations/tests) are inconsistently generated at release time.
3. **Security posture present** (SECURITY docs, SBOM/Signing), but **telemetry→detections→runbooks** chain is incomplete across graph ingest, NL→Cypher ops, and Conductor actions.
4. **Operational risks** around: secrets rotation, environment drift, cost overruns on LLM/RAG paths, and change‑approval evidence.
5. **Governance & audit**: many pieces exist; **need a unified Victory/Evidence Ledger** with immutability, hashes, and bundle manifest per release.

**So‑What:** Converge delivery around a **single conductor** that enforces policy gates, emits evidence bundles, and backs every release with verifiable proofs. This reduces blast radius, increases auditability, and accelerates GA.

---

## C) Recommendations (Prioritized; Effort × Impact)

**Quick Wins (Week 1):**

1. **Victory Ledger bootstrap** (low effort, high impact): repo folder + schema + signing; enable per‑PR evidence manifests.
2. **OPA deny‑by‑default bundle** for Conductor actions (low, high): ship a minimal bundle + tests (samples below).
3. **Detections v0** for NL→Cypher and ingest anomalies (low, high): two Sigma/TTP rules + Grafana panels.
4. **Cost guardrails** (low, high): request caps + alerts on token/egress; kill‑switches via feature flags.

**Near‑Term (Sprints 1–3):** 5. **Evidence Bundle at Release** (med, high): signed SBOM, policy test report, pipeline provenance, dataset lineage. 6. **Secrets & Identity** (med, high): rotation playbook + vault CSI enforcement + scoped service accounts. 7. **Incident Playbooks** (med, high): BEC (supply‑chain), data leak, pipeline compromise—tabletop‑first with RACI.

**Strategic (Q4):** 8. **Bitemporal registry + consent gates** integrated in ER pipeline (med, high). 9. **Adjudication UI + audit trail** (med, high). 10. **Golden Path conformance tests** in CI (med, high).

---

## D) Sprint Cadence (Oct → Dec 2025)

**Operating principle:** weekly **staging** cut; **production** every other Wednesday.

| Sprint   | Window (Weds→Tues)          | Prod Release | Theme                              | DoD‑V (Definition of Done – Victory)                                                                                           |
| -------- | --------------------------- | ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **S‑01** | **2025‑10‑01 → 2025‑10‑14** | 2025‑10‑15   | Conductor Bootstrap + Evidence v0  | Victory Ledger online; OPA bundle v0 with unit tests; 2 detections live; cost guard v0; signed evidence bundle emitted on cut. |
| **S‑02** | **2025‑10‑15 → 2025‑10‑28** | 2025‑10‑29   | Ingest & NL→Cypher Hardening       | More detections; runbooks v1; secrets rotation dry‑run; staging chaos‑day; evidence v1 (SBOM + test report).                   |
| **S‑03** | **2025‑10‑29 → 2025‑11‑11** | 2025‑11‑12   | Consent & Provenance Gates         | ER bitemporal hooks; consent checks; policy gate SLOs; audit trail endpoints.                                                  |
| **S‑04** | **2025‑11‑12 → 2025‑11‑25** | 2025‑11‑26   | Adjudication & GraphRAG Guardrails | Adjudication UI (MVP), RL controller guardrails, hallucination/PII detectors.                                                  |
| **S‑05** | **2025‑11‑26 → 2025‑12‑09** | 2025‑12‑10   | GA Readiness I                     | Golden Path conformance suite; DR tabletop; cost targets met.                                                                  |
| **S‑06** | **2025‑12‑10 → 2025‑12‑23** | 2025‑12‑24   | GA Readiness II (Freeze+Docs)      | Evidence catalog, operator runbooks finalized, change mgmt sign‑offs.                                                          |

**Ceremonies (all CST):**

- **Wed 09:00** Kickoff (scope, risks, gates) • **Wed 16:00** Staging cut • **Fri 10:00** Risk review • **Tue 14:00** Demo & retro • **Prod** every other Wed 16:30 with release notes + evidence bundle.

---

## E) DIRK IG Workstream (Backlog by Stream)

### W1 — Provable Compliance & Evidence

- Victory Ledger repo structure and signing
- Evidence Bundle generator (SBOM, policy tests, lineage)
- Release gates (OPA): deny‑by‑default with scoped allow rules
- Audit endpoints & hash registry; immutability storage hook

### W2 — Operational Hardening (Graph/Conductor)

- Detections for ingest anomalies, NL→Cypher abuse, long‑running jobs
- Cost guard: token/egress caps, autoscale policy, kill‑switches
- Runbooks: incident triage, rotation, rollback; RACI & comms templates
- Golden Path CI: `make up` / smoke tests as blocking gate

### W3 — Data Governance & Consent

- Bitemporal schema + time‑travel reads; consent/contract enforcement
- Adjudication UI & audit: decision logs, appeal path, retention clocks
- Dataset/feature lineage capture integrated with Evidence Bundle

---

## F) Gap‑Closers (Seeing Around Corners)

1. **Evidence Orphans**: releases without complete proofs → **Action:** fail release if Evidence Bundle missing required sections (policy tests, SBOM, lineage hashes).
2. **Secrets Drift**: ad‑hoc secrets in env → **Action:** enforce Vault CSI; PR check fails if raw secret found; rotation runbook + schedule.
3. **Cost Overrun** on LLM paths → **Action:** per‑tenant budget ceilings; alerting + auto‑throttle; weekly cost report to Victory Ledger.
4. **Unmodeled NL→Cypher abuse** → **Action:** detections + query shape limits; blocklist/allowlist; anomaly alerts.
5. **Change Approval Ambiguity** → **Action:** Conductor policy requiring named approvers, signed notes, and hash references in release PR.
6. **Disaster Recovery** gaps → **Action:** tabletop + restore test (RTO/RPO), documented in Evidence Bundle.
7. **SBOM/Signing coverage** uneven → **Action:** move to pipeline‑generated, signed SBOMs; verify on deploy.

---

## G) Artifacts (Ready‑to‑Ship Templates)

### 1) OPA/ABAC Bundle (skeleton)

```
package conductor.release

# Default‑deny
default allow := false

# Allow release when evidence bundle proves required checks
allow {
  input.evidence.sbom.signed == true
  input.evidence.tests.pass == true
  input.evidence.provenance.hashes_valid == true
  input.change.approvals["security"] == "approved"
  input.change.approvals["qa"] == "approved"
}

# Block if cost guard not enabled for tenant
deny["cost_guard_missing"] {
  not input.runtime.cost_guard.enabled
}
```

**OPA Bundle Layout**

```
opa-bundle/
  policies/
    conductor.rego
  data/
    required_checks.json
  tests/
    conductor_test.rego
  manifest.json
```

### 2) Sigma Detections (TTP→Rule)

**A) NL→Cypher Abuse (excessive CREATE/DETACH)**

```
title: IG NL2Cypher Excessive Graph Mutation
id: d6a1b8e0-ig-001
status: experimental
logsource:
  product: intelgraph
  service: nl2cypher
  category: application
selection:
  operation: ["CREATE", "DETACH", "DELETE"]
  count_gt: 50
  window: 5m
condition: selection
fields: [user, tenant, model, tokens, ip]
level: high
```

**B) Ingest Anomaly (schema drift)**

```
title: IG Ingest Schema Drift Spike
id: d6a1b8e0-ig-002
status: experimental
logsource:
  product: intelgraph
  service: ingest
selection:
  error_type: ["UnknownProperty", "MissingConstraint"]
  count_gt: 20
  window: 10m
condition: selection
level: medium
```

### 3) Runbook (Incident: Pipeline Compromise)

**Trigger:** unsigned artifact detected in release pipeline.
**Roles:** IC (A), Sec (R), SRE (R), PM (C), Legal/Comms (I)
**Steps:**

1. Freeze pipeline; revoke tokens; capture build logs & hashes.
2. Compare SBOM vs. expected; run signature verification; snapshot infra state.
3. Root‑cause; rotate credentials; patch; re‑run with heightened logging.
4. Post‑Action: Evidence Bundle report + risk entry update.

### 4) Dashboard (KPIs/KRIs)

- **TTD/MTTR**, **control coverage %**, **evidence completeness %**, **cost per 1k tokens**, **egress per tenant**, **anomaly rates**.
- Panels sourcing: pipeline events, OPA decisions, Sigma alerts, cost meter, SBOM signer.

### 5) Risk Ledger Entries (initial)

| ID   | Risk                       | Likelihood | Impact | Owner | Mitigation            | Residual |
| ---- | -------------------------- | ---------- | ------ | ----- | --------------------- | -------- |
| R‑01 | Evidence gap on release    | Med        | High   | MC    | Evidence gate w/ OPA  | Low      |
| R‑02 | Secrets drift              | Med        | High   | Sec   | Vault CSI + scans     | Low      |
| R‑03 | LLM cost surge             | Med        | Med    | Eng   | Budget caps + alerts  | Low      |
| R‑04 | NL→Cypher abuse            | Low‑Med    | High   | Eng   | Detections + limits   | Med      |
| R‑05 | Supply‑chain/signing break | Low        | High   | SRE   | Sign/verify mandatory | Low      |

---

## H) Proof‑Carrying Analysis (PCA)

**Assumptions:** October pack and Summit repo are source‑of‑truth for cadence and backlog; GA target requires verifiable evidence on release. No access beyond provided artifacts; no production data touched.

**Evidence:** Hashes above; sampled sprint files (e.g., 2025‑10‑01 plan) show biweekly cadence and evidence intent; IntelGraph README enforces deployable‑first golden path.

**Caveats:** ZIP snapshots may trail the GitHub tip; some documents show draft status; exact infra (cloud/provider) unspecified.

**Checks:**

- Cadence dates normalized to **Wednesdays** (CST) and mapped to sprint files (Oct→Dec).
- All recommendations align to **deny‑by‑default**, **minimum‑necessary access**, and **audit‑ready** artifacts.

---

## I) Kickoff Agenda (Sprint 2025‑10‑01)

1. Confirm owners & RACI for Evidence Bundle.
2. Approve OPA required checks (min set above).
3. Wire cost guard toggles + alerting.
4. Land two detections + one dashboard; demo in staging.
5. Define rollback paths and freeze criteria for prod cut 2025‑10‑15.

---

## J) Definition of Done — Victory (DoD‑V)

- **Win conditions met** per sprint table.
- **Proofs attached** (signed Evidence Bundle with SBOM, policy tests, lineage, approvals).
- **Rollback verified** (dry‑run) and **owners assigned** for follow‑through.

---

_Prepared by DIRK IG (Directorate K++). This document is auditable and designed for sprint execution immediately._
