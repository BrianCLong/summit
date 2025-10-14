# DIRECTORATE J ∑ — Durga IG Workstream
**Classification:** Internal // Need‑to‑Know  
**Mode:** [JADE] Strategic Foresight + [JINX] Adversary Emulation + [JIGSAW] Narrative Defense  
**Cadence Anchor:** Q4’25 company plan (Oct 6 – Dec 28, 2025), weekly staging / bi‑weekly prod  
**This Sprint:** **S‑03: 2025‑11‑03 → 2025‑11‑14** (Prod target: **2025‑11‑19**)  
**Owner:** Durga IG (Directorate J ∑)

---

## A) Executive Thesis
- **Decisive Idea:** Graduate from “evidence‑present” to **evidence‑enforced**. OPA moves to full prod enforce on core policies; registry reaches **v1** with consent/retention labels enforced; **auto‑rollback** becomes standard on critical policy violations; decision analytics surfaces risk/coverage deltas pre‑release.
- **Next Best Actions:** (1) **OPA core to 100% prod** with exception SLAs; (2) **Registry v1** on two ETL paths; (3) **Auto‑rollback** wired and tested in prod canaries; (4) **Decision Analytics** (coverage heatmap, reversibility score); (5) **External attestation pack** (customer‑shareable redactions + proofs).
- **Win Condition (S‑03):** Two Tier‑1 services ship with **OPA enforce 100%**, **Registry labels required at boundary**, automated rollback validated via controlled canary, and **Evidence v1** attached to public release notes (redacted).

---

## B) COAs (Good/Better/Best)
**Scale: effort (S/M/L) × impact (Low/Med/High)**

- **Good (baseline):** OPA 100% prod on core; Registry v1 for ETL‑A & ETL‑B; Auto‑rollback canary; Decision analytics beta.  
- **Better:** Add cross‑service **policy coverage SLO** (≥0.9) as a deployment gate; narrative prebunk auto‑feeds.  
- **Best:** **Customer‑verifiable proofs** (Sigstore public verify) + SBOM diffs on status page; mixed‑strategy rollout planner (risk‑aware deployment schedule).

**Gate (Day 4):** If OPA denial rate > 3% after optimization, hold 100% prod and complete Registry v1 + auto‑rollback scope first.

---

## C) Deliverables (Ship List)
1) **OPA Core: 100% Prod Enforce**
   - Feature flag flip plan; deny → alert/rollback flow; exceptions SLA (≤ 7 days with justification + expiry).  
   - Coverage badge & heatmap `tools/policy/coverage_report.md`.

2) **Registry v1**
   - API v1: `POST /label`, `GET /label/:id`, `GET /lineage/:id`, `POST /policy/evaluate` (labels present?).  
   - **Ingress/Egress interceptors** for two ETL paths; staging deny + prod warn→deny.

3) **Auto‑Rollback (Prod Canary)**
   - Controller `services/rollbackd/` that watches policy KRI topics and triggers rollout reversal; link Evidence ID.  
   - Canary recipe + runbook.

4) **Decision Analytics v1**
   - Coverage heatmap, **Reversibility Score** (R‑score), and **Decision Debt** metric on Conductor UI.  
   - Search facets: by risk class, by unlabeled flow dependency, by owner.

5) **External Attestation Pack v1**
   - Redacted Evidence Bundle → `evidence/public/EB-<id>.json` (hash + verify script).  
   - Customer‑facing README with verify steps.

6) **Narrative Defense v2**
   - Auto‑generated prebunk briefs from Evidence/Policy coverage; comms sign‑off workflow.

---

## D) Work Breakdown & Swimlanes
**Lane A — OPA (SecOps)**
- A1 Tune rules to target ≤1% false positive; expand tests; publish coverage heatmap.  
- A2 Flip `OPA_ENFORCE_CORE` to 100% prod with staged tenants (50% → 100%).  
- A3 Exception workflow with SLA enforcement + report.

**Lane B — Registry (Data Eng)**
- B1 Stabilize API; add idempotent label upserts; audit log.  
- B2 Ingress/Egress interceptors on ETL‑A/B; prod warn → deny; dashboards for unlabeled hits.  
- B3 Emit lineage to IntelGraph; backfill for last 30 days (best‑effort).

**Lane C — Auto‑Rollback (SRE)**
- C1 Deploy `rollbackd`; wire to OPA violations and KRI alerts.  
- C2 Canary in one Tier‑1 service; measure rollback P95; attach EB.  
- C3 Chaos test: inject violation → confirm rollback + evidence collation.

**Lane D — Decision Analytics (Durga IG)**
- D1 Compute **R‑score** = f(reversible flag, blast radius, dependency fan‑out).  
- D2 Coverage heatmap page; decision debt query.  
- D3 Feed notifications for high debt or low R‑score areas pre‑release.

**Lane E — Evidence/Attestation (Release Eng)**
- E1 Public redaction pipeline; verify script using **Sigstore**.  
- E2 Release notes injection of public EB hash; publish to status page stub.

**Lane F — Narrative (Comms)**
- F1 Prebunk v2 auto‑draft from EB/policy; two‑person review; scheduled posts.  
- F2 Incident comms template for auto‑rollback.

---

## E) Scorecard & Tripwires (Targets)
**KPIs**
- OPA enforce 100% prod (core); deny rate ≤ 2% after tuning.  
- Registry labels on 100% flows for ETL‑A/B; unlabeled deny < 1/day (staging), < 1/week (prod).  
- Auto‑rollback P95 ≤ 6m in canary.  
- Decision analytics coverage ≥ 0.9; R‑score median ≥ 0.7.  
- ≥ 2 public releases with Evidence Pack links + verify steps.

**KRIs**
- Spike in denies > 3× baseline 24h.  
- Increase in unlabeled flows > 2/day (staging).  
- High decision debt (> 10) in a service due within 7 days.  
- Narrative anomaly > 95th percentile post‑release.

**Tripwires**
- Auto‑rollback on: critical OPA deny, unlabeled flow in prod boundary, or SLO breach.  
- Freeze policy flips if false positives > 3% for 2h.

---

## F) PCS — Proof‑Carrying Strategy
**Evidence Basis:** Builds directly on S‑01/S‑02 artifacts in repo; IntelGraph decision records; OPA policy test coverage; registry and KRIs dashboards.  
**Assumptions:** IntelGraph read/write OK; CI deploys redaction/verify tools; Sigstore available; SRE has canary lanes.  
**Confidence:** High for OPA/Auto‑rollback canary; Medium‑High for Registry v1; Medium for public attestations at scale.  
**Falsifiers:** If deny rates persist > 3% after tuning, pause 100% prod enforce; if R‑score fails to correlate with rollback outcomes, revisit scoring function; if customer verify steps exceed 3 mins median, simplify tooling.

---

## G) Artifacts & Scaffolding (Drop‑in)

### 1) OPA Coverage Heatmap — `tools/policy/coverage_report.md`
```md
# Policy Coverage Heatmap
| Service | Rules Total | Enforced | Shadow | Coverage |
|---|---:|---:|---:|---:|
| svc-a | 24 | 24 | 0 | 1.00 |
| svc-b | 19 | 16 | 3 | 0.84 |
```

### 2) Registry v1 API (OpenAPI sketch) — `services/registry/openapi.yaml`
```yaml
openapi: 3.0.0
info: {title: Registry API, version: 1.0.0}
paths:
  /label:
    post:
      requestBody: {required: true}
      responses: { '201': {description: created}}
  /label/{id}:
    get:
      responses: { '200': {description: ok}}
  /lineage/{id}:
    get:
      responses: { '200': {description: ok}}
  /policy/evaluate:
    post:
      responses: { '200': {description: ok}}
```

### 3) Rollback Daemon — `services/rollbackd/main.py`
```python
import time
from queue import Queue
from ops import deploy, rollback, attach_evidence
q = Queue()
while True:
    evt = q.get()
    if evt.type in ("OPA_DENY_CRITICAL","UNLABELED_FLOW","SLO_BREACH"):
        rollback(evt.service)
        attach_evidence(evt.service, evt.evidence_id)
```

### 4) Decision Analytics — R‑score calc `tools/conductor/rscore.py`
```python
# R-score in [0,1]
# higher is more reversible (lower blast radius, easy rollback)
from math import exp

def rscore(reversible: bool, blast_radius: int, fanout: int):
    base = 0.8 if reversible else 0.4
    penalty = 1/(1+exp(-(3 - blast_radius))) * 0.3 + 1/(1+exp(-(4 - fanout))) * 0.3
    return max(0, min(1, base - penalty))
```

### 5) External Verify Script — `tools/evidence/verify_public.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
FILE=$1
jq . $FILE > /dev/null
COSIGN_EXPERIMENTAL=1 cosign verify-blob --signature ${FILE}.sig --certificate ${FILE}.crt $FILE
sha256sum $FILE
```

### 6) Canary Recipe — `gamedays/gd-prod-canary-rollback.md`
```md
1. Enable canary (5%) for svc‑a release vX.Y.Z with OPA enforce on.
2. Inject policy violation via test fixture.
3. Observe rollbackd event; verify rollback ≤ 6m; EB attached to incident.
4. Publish summary to #release-ops with EB/DEC links.
```

### 7) Narrative v2 — Incident Comms Template
```md
# Incident Comms — Auto‑Rollback Triggered
- **When/What:** <timestamp> — auto‑rollback executed on <service>.
- **Why:** Policy trigger <type> with evidence EB‑<id>.
- **Impact:** <customer/non‑customer>.
- **Verify:** Public proof hash <sha256>.
- **Next:** root‑cause, policy tune window, next deploy ETA.
```

---

## H) RACI & Resourcing
- **Responsible:** SecOps (OPA), Data Eng (Registry), SRE (Rollbackd), Durga IG (Analytics), Release Eng (Attestation), Comms (Narrative).  
- **Accountable:** CTO / Director Sec.  
- **Consulted:** Legal/DPO for public attestations.  
- **Informed:** Exec staff, Board (monthly).

---

## I) Milestones & Calendar
- **M1 (Nov 5):** OPA 100% prod flip for core policies (tenant binding, reason‑for‑access).  
- **M2 (Nov 7):** Registry v1 live on ETL‑A/B (staging deny, prod warn→deny).  
- **M3 (Nov 8):** Rollbackd canary pass; attach EB to incident post.  
- **M4 (Nov 12):** Decision analytics live (R‑score, coverage, debt).  
- **M5 (Nov 14):** Public EB links on two releases + verify script published.

---

## J) Governance & Provenance
- Evidence retention 7y; exception records auto‑expire; public EB hashes logged; all flips auditable via Conductor DEC ids.

---

## K) DoD‑J (Definition of Done)
- OPA core enforced 100% prod (deny ≤ 2%); Registry v1 on ETL‑A/B; auto‑rollback canary validated (≤ 6m); analytics visible; two public releases with EB hashes and verify steps; scorecard green or justified amber with actions.

