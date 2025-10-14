# IntelGraph · Maestro Conductor (MC)
# Workstream: SDLC Orchestration & Evidence
# Sprint: 2026‑03‑29 → 2026‑04‑12 (13)

> Mission: Execute external audit and harden **trust-by-default** posture in production. Operationalize CMK rotations, privacy‑budget governance, export proofs, and Black‑Cell flow at scale. Add supply‑chain attestations, live compliance posture, and zero‑downtime data evolution v2. Ship clean, green, auditable increments.

---

## Conductor Summary (One‑Screen)
**Goal.** Land an external‑auditor facing release with one‑click artifact retrieval, continuous proofs (residency, license, privacy budgets), CMK rotation calendar, supply‑chain attestations (SLSA/Sigstore), and zero‑downtime index/data changes v2. Build live compliance scorecards and real‑time policy anomaly detection. 

**Assumptions.** Sprint‑12 shipped CMK + rotation worker, PETs v2 (ε budgets), export‑time proofs, Black‑Cell bundle + verify/resync, deprecation enforcement, and p99 tail reduction.

**Non‑Goals.** New analytics features; adding major connectors.

**Constraints.** Org SLOs, cost guardrails, multi‑tenant SaaS + ST‑DED + Black‑Cell; evidence required for promotion.

**Risks.** CMK rotation misconfig; auditor scope creep; index v2 rollout latency spikes; policy anomaly false positives.

**Definition of Done.**
- External Audit Pack v1.5 published (read‑only, signed, watermarked) with residency/license/ε‑budget proofs and CMK rotation logs.
- Supply‑chain attestations added: SLSA provenance, Sigstore (Fulcio/Rekor) for images/bundles.
- Zero‑downtime index/data migration v2 executed on one hot path; ACA checks green.
- Privacy‑budget governance dashboards live; alerts and override workflows wired.
- Black‑Cell incremental update (delta bundle) validated in clean‑room.
- Live compliance scorecard ≥ 0.96; policy anomaly detections triaged with SLA.

---

## Carryover / Dependencies
- Fulcio/Rekor access; cosign key rotation window.  
- Auditor accounts + portal scoping confirmed.  
- Data platform sign‑off on index v2 rollout window.

---

## EPICS → Stories → Tasks (MoSCoW)

### EPIC BW — External Audit Pack v1.5 (Must)
**BW1. Pack Generator**  
- Extend `ig-evidence` to produce auditor‑scoped pack: SBOM, provenance, residency/license proofs, ε budgets, CMK logs, DR/RTBF proofs, game‑day evidence; watermark + timeboxed links.  
**BW2. Portal Delivery**  
- Read‑only page for auditors with request queue, access receipts, and download manifests.  
**Acceptance:** Auditor retrieves pack without repo access; signatures verify; watermarks visible.

### EPIC BX — Supply‑Chain Attestations (Must)
**BX1. SLSA Provenance**  
- Attest build provenance for container images and Black‑Cell bundles; attach to releases.  
**BX2. Sigstore Integration**  
- Use Fulcio for certs, upload attestations to Rekor transparency log; verify in CI.  
**Acceptance:** `cosign verify-attestation` succeeds; CI blocks on missing/invalid attestations.

### EPIC BY — Zero‑Downtime Data Evolution v2 (Must)
**BY1. Online Indexing**  
- Build indexes concurrently; throttle; readiness gates; cutover with ACA and fallback.  
**BY2. Dual‑Path Reads**  
- Shadow read compare; detect plan regressions; rollback switch.  
**Acceptance:** One hot path migrated with < 2% error budget impact; ACA green; p95 steady.

### EPIC BZ — Privacy‑Budget Governance (Should)
**BZ1. Dashboards & Alerts**  
- ε budget remaining per tenant/time window; alerts 20%/10% thresholds.  
**BZ2. Override Workflow**  
- Warranted top‑up/override flow; ledger entries; comms templates.  
**Acceptance:** Two simulated exhaustion events handled; overrides logged; no unapproved overages.

### EPIC CA — Policy Anomaly Detection (Should)
**CA1. Denial Patterning**  
- Model deny reasons over time; detect spikes (z‑score) and unusual actor/resource mixes.  
**CA2. Response & Tuning**  
- Auto‑open issue with trace exemplars; suppression rules; escalation path.  
**Acceptance:** Detected anomaly triaged within SLA; false‑positive rate < 5% after tuning.

### EPIC CB — Black‑Cell Delta Bundle (Should)
**CB1. Delta Build**  
- Produce signed delta (policies, dashboards, fixtures) vs last bundle; checksum map.  
**CB2. Offline Apply & Verify**  
- `ig-offline apply` replays delta; verify manifests; resync ledger.  
**Acceptance:** Clean‑room updates from v1.4 → v1.5 using delta; verify passes.

### EPIC CC — Live Compliance Scorecard (Must)
**CC1. Score Composition**  
- Evidence coverage, policy coverage, residency proofs freshness, SCIM reviews, SBOM/vuln SLAs, DR drills recency.  
**CC2. Promotion Gate**  
- Block promotion when score < threshold; portal surfacing per service/team.  
**Acceptance:** Score ≥ 0.96 for this sprint’s release; gate enforced.

---

## Acceptance Criteria & Verification
1) **Audit Pack:** Complete, signed, watermarked; auditor flow works; access receipts in ledger.  
2) **Supply‑Chain:** Attestations present and verifiable for images and bundles; CI gate blocks missing ones.  
3) **Data Evolution:** Online index + dual‑path read migration executed; ACA report attached; rollback tested.  
4) **Privacy Budgets:** Dashboards live; alerts fired on exhaustion; overrides require warrant and are logged.  
5) **Policy Anomalies:** Spike detected → issue created with exemplars; suppression in place; SLA met.  
6) **Black‑Cell Delta:** Delta apply verified in clean‑room; resync logs attached.  
7) **Scorecard:** Promotion blocked below threshold; evidence artifacts linked.

---

## Architecture (Mermaid)
```mermaid
flowchart TD
  subgraph Portal
    AUD[Auditor Pack]
    SCORE[Compliance Scorecard]
  end
  CI[CI/CD] --> ATT[SLSA/Sigstore Attestations]
  ATT --> REL[Release]
  REL --> AUD
  GW[Apollo Gateway] --> POL[Policy]
  POL --> ANOM[Anomaly Detector]
  subgraph Data Evol v2
    IDX[Online Index]
    SHADOW[Shadow Read]
  end
  GW --> IDX
  GW --> SHADOW
  subgraph Privacy Budgets
    ACC[ε Accountant]
    DASH[Dashboards]
  end
  ACC --> DASH --> SCORE
  subgraph Black‑Cell
    DLT[Delta Builder]
    OFF[ig-offline apply]
  end
  DLT --> OFF --> REL
```

---

## Schemas & Manifests
**Attestation Statement (excerpt)**
```json
{ "subject":"ghcr.io/intelgraph/gateway@sha256:...","slsaVersion":"v1.0","builder":"github-actions","provenance":"sha256:..." }
```

**Compliance Score Weights (JSON)**
```json
{ "evidence":0.25, "policy":0.2, "residencyFreshness":0.15, "scimReview":0.1, "sbomVulnSLA":0.1, "drRecency":0.1, "rtbfProofs":0.1 }
```

**Delta Bundle Manifest**
```json
{ "base":"blackcell-v1.4","to":"v1.5","files":[{"path":"policies/ig.bundle","sha256":"..."}],"signature":"cosign:..." }
```

---

## Implementation Scaffolds
**Cosign Attestation (CI)**
```yaml
- name: Sign & Attest
  run: |
    cosign sign $IMAGE
    cosign attest --predicate slsa.json --type slsaprovenance $IMAGE
```

**Dual‑Path Read Hook**
```ts
// execute both query plans; compare hashes; log divergence; cutover when ACA green
```

**ε Budget Alerts (PromQL)**
```
(dp_epsilon_limit - dp_epsilon_spent) < 0.1 * dp_epsilon_limit
```

**Anomaly Detector (pseudo)**
```ts
// group denies by ruleId, actor, resource; compute z-score; open issue with span links
```

**Delta Apply CLI**
```bash
ig-offline apply --from v1.4 --to v1.5 --bundle delta.tgz --verify
```

---

## Dashboards & Alerts
- **Dashboards:** Attestation coverage, dual‑path divergence, ε budgets remaining, anomaly rate by rule, delta apply status, scorecard by team/service.  
- **Alerts:** Missing attestation; dual‑path divergence > 0; ε budget < 10%; anomaly spike; delta verify fail; score < threshold.

---

## Runbooks (Delta)
- **Attestation Fail:** Halt promotion; rebuild provenance; re‑sign; verify; document root cause.  
- **Index Cutover Regression:** Roll back to old plan; open hotfix; capture ACA; schedule retry.  
- **Budget Exhaustion:** Notify tenant; offer warranted top‑up; log override; update docs.  
- **Anomaly Spike:** Validate false positive; tune thresholds; patch policy if real.  
- **Delta Verify Fail:** Abort apply; compare manifests; rebuild; rerun in clean‑room.

---

## Evidence Bundle (v1.5)
- Auditor Pack (signed), SLSA/Sigstore attestations, ACA reports (data evolution), ε budget dashboards, anomaly findings, delta apply logs, scorecard exports, SBOM/provenance deltas.

---

## Backlog & RACI (Sprint‑13)
- **Responsible:** MC, Platform Eng, SRE, SecOps, QA, Docs, Legal/Privacy.  
- **Accountable:** Head of Platform.  
- **Consulted:** Data Platform (indexing), Compliance/Audit (pack), FinOps (KMS/Sigstore cost).  
- **Informed:** Workstream leads.

Tickets: `MC‑643..MC‑700`; dependencies: Sigstore access, auditor portal role, clean‑room env slot.

---

## Next Steps (Kickoff)
- [ ] Generate External Audit Pack v1.5 and grant auditor access.  
- [ ] Wire Sigstore attestations + CI gate.  
- [ ] Execute one zero‑downtime index migration with dual‑path read.  
- [ ] Enable ε budget dashboards + alerts; test override workflow.  
- [ ] Produce and validate Black‑Cell delta bundle in clean‑room.  
- [ ] Turn on compliance scorecard gate and promote when ≥ 0.96.