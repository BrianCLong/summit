# IntelGraph · Maestro Conductor (MC)

# Workstream: SDLC Orchestration & Evidence

# Sprint: 2026‑02‑27 → 2026‑03‑13 (11)

> Mission: Cement **org‑wide continuous compliance** and **privacy‑by‑default** while shrinking toil. Land runtime query budgets, PETs (privacy‑enhancing techniques) for analytics, automated incident evidence, and access transparency. Finish org CI federation and prep for external audit window.

---

## Conductor Summary (One‑Screen)

**Goal.** Deliver: 1) Runtime query budgeting + admission control, 2) PETs v1 (k‑anonymity, limited differential privacy) for export/analytics, 3) Access Transparency log + user‑visible audit receipts, 4) Automated incident evidence packer with comms templates, 5) Federation 100% adoption + drift hard block, 6) Q2 audit rehearsal with red/blue table‑top.

**Assumptions.** Sprint‑10 delivered residency enforcement w/ proofs, dynamic masking/redaction, org CI federation (≥ 8 repos), red‑team chaos suite, DORA/PRS roll‑ups.

**Non‑Goals.** New customer features outside governance; deep analytics algorithms beyond PETs v1.

**Constraints.** Org SLOs/cost guardrails; MT SaaS + ST‑DED + Black‑Cell; evidence required to promote.

**Risks.** Query budgets blocking legitimate spikes; PET utility loss; access transparency log volume; adoption frictions.

**Definition of Done.**

- Query budgets enforced per tenant/route; exemptions policy‑driven; dashboards & alerts live.
- PETs v1 wired into export/analytics with measurable privacy/utility; defaults documented.
- Access Transparency available to tenant admins; receipts watermarked + signed.
- Incident Evidence Packer generates signed bundles automatically on P1+ incidents.
- CI federation at 100% of active repos; drift bot escalates to block within 24h.
- Audit rehearsal executed; findings triaged with SLAs and owners.

---

## Carryover / Dependencies

- Legal/Privacy sign‑off on PET parameters (k, ε ranges).
- CS/Support processes for access transparency requests.
- Incident scribe rotation confirmed for rehearsal.

---

## EPICS → Stories → Tasks (MoSCoW)

### EPIC BK — Runtime Query Budgets & Admission Control (Must)

**BK1. Budget Model**

- Per tenant/route budgets (QPS, concurrency, fan‑out credits) aligned with plan tiers.  
  **BK2. Admit/Reject + Shed**
- Token/credit buckets, queue with fair scheduling; 429/503 with `Retry‑After`; emergency taps for on‑call.  
  **BK3. Observability & Override**
- Dashboards, SLO guard, override API with ledger entry; alerts at 80/90% burn.  
  **Acceptance:** Budgets enforced; controlled surge handled; override audited; SLOs intact.

### EPIC BL — PETs v1: k‑Anonymity & DP (Must)

**BL1. k‑Anonymity Export**

- Grouping + suppression to ensure group size ≥ k; policy link to purpose/roles.  
  **BL2. DP Counts (ε‑DP)**
- Laplace noise for aggregated counts; user docs on utility bounds; ε configurable by plan.  
  **BL3. Audit & Evidence**
- Export manifests include k/ε; proofs stored; tests verify guarantees on fixtures.  
  **Acceptance:** Exports respect k; DP queries add noise as configured; evidence attached.

### EPIC BM — Access Transparency & Receipts (Must)

**BM1. Access Log**

- Append structured logs for admin/operator access with purpose/warrant; hash chain to ledger.  
  **BM2. Tenant Receipts**
- Portal page for per‑tenant access receipts (view/download), filters, watermarks.  
  **BM3. Notifications**
- Optional email/webhook for sensitive access events.  
  **Acceptance:** Tenant admin views last 90 days; receipts signed; test webhook fires.

### EPIC BN — Incident Evidence Packer (Should)

**BN1. Packer Hooks**

- On P1/P2 incident open/close: collect timelines, alerts, traces, commit diffs, ACA, residency/masking proofs.  
  **BN2. Signed Bundle**
- Produce `incident-<id>.zip` with manifest + signature; upload to portal.  
  **Acceptance:** Simulated P1 produces complete, signed bundle within 10 min of close.

### EPIC BO — Federation Completion & Drift Hard Block (Must)

**BO1. Last‑Mile Migration**

- Move remaining repos to `ig-ci@v1`; add evidence badges.  
  **BO2. Hard Block**
- Failing drift → status check blocks merge in 24h; escalation to owners.  
  **Acceptance:** 100% repos on shared CI; drift blocked within SLA.

### EPIC BP — Audit Rehearsal & Table‑Top (Should)

**BP1. Control Walkthrough**

- SOC2/privacy controls demo using portal artifacts + evidence diffs.  
  **BP2. Red/Blue Table‑Top**
- Simulate data export abuse + region failover; practice comms & receipts.  
  **Acceptance:** Findings logged with owners/SLAs; updated runbooks.

---

## Acceptance Criteria & Verification

1. **Budgets:** Budget overage returns 429/503 with `Retry‑After`; dashboards show burn; override API requires justification and ledger record.
2. **PETs:** k‑anonymity verified on synthetic dataset; DP count RMSE within expected bounds for chosen ε; manifests store parameters.
3. **Access Transparency:** Receipts downloadable, signed, and watermarked; access log searchable; sensitive events notify.
4. **Incident Packer:** P1/P2 bundles contain alerts, traces, ACA, residency/masking proofs, commits; cosign verifies.
5. **Federation:** All repos pinned; drift bot hard‑blocks with PR; zero unsupported pipelines remain.
6. **Audit Rehearsal:** Checklist completed; gaps assigned; follow‑ups created.

---

## Architecture Deltas (Mermaid)

```mermaid
flowchart TD
  UI[Portal] --> GW[Apollo Gateway]
  GW --> BGT[Budgeter]
  BGT --> OTL[(OTel)]
  subgraph PETs
    KA[k‑Anon Export]
    DP[DP Aggregator]
  end
  GW --> KA
  GW --> DP
  subgraph Transparency
    AL[Access Log]
    REC[Receipts]
  end
  GW --> AL --> LEDGER[Provenance Ledger]
  AL --> REC
  subgraph Incidents
    PCKR[Incident Packer]
  end
  OTEL --> PCKR
  PCKR --> PORTAL[Portal Artifacts]
  subgraph CI Federation
    IGCI[ig-ci@v1]
    DRIFT[Drift Block]
  end
  Repos[(Repos)] --> IGCI
  Repos --> DRIFT
```

---

## Specs & Schemas

**Budget Config (YAML)**

```yaml
budgets:
  starter: { gql_qps: 50, subs_fanout: 1000, exports_per_min: 5 }
  pro: { gql_qps: 200, subs_fanout: 4000, exports_per_min: 20 }
```

**Access Log Record (JSON)**

```json
{
  "ts": "2026-03-02T12:00:00Z",
  "actor": "op:sre1",
  "tenant": "alpha",
  "action": "read:asset",
  "purpose": "support",
  "warrant": "TKT-123",
  "hash": "..."
}
```

**Incident Manifest**

```json
{
  "id": "INC-204",
  "severity": "P1",
  "artifacts": [
    "alerts.json",
    "traces.json",
    "aca.json",
    "residency.json",
    "masking.json",
    "git-diff.txt"
  ],
  "sha256": "...",
  "signature": "cosign:..."
}
```

**PET Parameters**

```yaml
pet:
  kanon_k: 10
  dp_epsilon: 0.5
  dp_delta: 1e-6
```

---

## Implementation Scaffolds

**Budget Middleware (Express)**

```ts
// checks per-tenant credit buckets; emits Retry-After on reject; records burn
```

**k‑Anon Exporter (Node)**

```ts
// group/suppress; verify k; emit manifest with k and suppression stats
```

**DP Aggregator (pseudo)**

```ts
// add Laplace noise to counts; track epsilon spent per report
```

**Access Receipts API**

```http
GET /transparency/receipts?tenant=alpha&from=2026-02-01&to=2026-03-01
```

**Incident Packer Hook**

```ts
// on IncidentClosed: gather artifacts -> manifest -> cosign sign -> upload
```

**Drift Block (GitHub Check)**

```yaml
- name: CI Drift Block
  run: node scripts/ci-drift-check.js --hard-block --owner-map owners.yaml
```

---

## Dashboards & Alerts

- **Dashboards:** Budget burn by tenant/route; PET parameters per export; access events & receipts; incident evidence completeness; federation adoption & drift; audit rehearsal gaps.
- **Alerts:** Budget burn 80/90%; PET failure; sensitive access without warrant; incomplete incident bundle; repo drift; audit gap overdue.

---

## Runbooks (Delta)

- **Budget Override:** On‑call evaluates, uses override API with reason, timebox; monitor SLO panels; revoke when safe.
- **PET Utility Complaint:** Provide deterministic export w/out PET for legal‑hold only; document exception.
- **Access Event Review:** Confirm warrant; notify tenant admin; attach receipt; RCA if improper.
- **Incident Bundle Missing:** Re‑run packer; attach manual artifacts; note variance.

---

## Evidence Bundle (v1.3.2)

- Budget configs + burn logs; PET parameters + proofs; access receipts + log chain; incident bundles + signatures; federation adoption report + drift PRs; audit rehearsal notes; SBOM/provenance deltas.

---

## Backlog & RACI (Sprint‑11)

- **Responsible:** MC, Platform Eng, SRE, SecOps, QA, Docs, Legal/Privacy, CS.
- **Accountable:** Head of Platform.
- **Consulted:** FinOps (budgets), DPO (PETs), Support (access workflows).
- **Informed:** Workstream leads.

Tickets: `MC‑517..MC‑576`; dependencies: PET review, portal pages, drift bot permissions.

---

## Next Steps (Kickoff)

- [ ] Enable budgets on 2 busiest routes; tune thresholds; expand to all.
- [ ] Ship k‑anon exporter + DP counts; wire manifests & tests.
- [ ] Launch access transparency receipts in portal; pilot with 2 tenants.
- [ ] Turn on incident packer for P1/P2; run simulation.
- [ ] Finish CI federation; enable drift hard‑block.
- [ ] Run audit rehearsal + table‑top; attach findings and owners.
