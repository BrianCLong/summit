```markdown
---
slug: intelgraph-mc-sprint-2026-07-08
version: v1.0
created: 2025-09-29
sprint_window: 2026-07-08 → 2026-07-21 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2026‑07‑08 → 2026‑07‑21)

> **Mission (Sprint N+20)**: Operationalize privacy and regional controls, raise service resilience, and prep for enterprise audits: **Privacy v2 rollout**, **Regional Relocation at scale**, **Enterprise Audit Pack (SOC2‑ready)**, **Incident Command System (ICS) v1.0**, **Query Planner v2 (cost‑aware)**, and **Blueprinted Tenants (gold configs)**—while keeping SLOs/cost guardrails green. Evidence bundle v21 included.

## Conductor Summary (Commit)
**Builds on** 2026‑06‑24 (Regional v1.2 partial writes, Privacy v2, SCIM 1.1, Cost Autopilot 2.1, Analytics Packs GA, RTBF v1.0).

**Goals**
1. **Privacy v2 Rollout**: enable query‑time redaction + k‑anon/DP presets for ≥ 70% tenants; purpose‑bound tokens enforced.
2. **Regional Relocation @ Scale**: batch relocation scheduler + safeguards; 4 datasets moved across regions with partial writes.
3. **Enterprise Audit Pack (SOC2 prep)**: generate consolidated controls/evidence (change mgmt, access reviews, retention/RTBF proofs, DR drills) with signed index.
4. **Incident Command System (ICS) v1.0**: incident roles/runbooks, chat‑ops bridges, comms templates, and post‑incident evidence capture.
5. **Query Planner v2 (cost‑aware)**: planner hints + selectivity stats; pre‑flight cost estimation with budget checks; 10% read p95 gain on top 20 queries.
6. **Blueprinted Tenants (Gold Configs)**: one‑click tenant baselines (SLOs, budgets, policies, alerts, dashboards) with drift detection.

**Non‑Goals**
- Active/active write topology; abstractive LLM privacy transforms; external audit attestation.

**Constraints**
- Platform SLOs unchanged. Planner v2 must not increase p95 for any top query by >5%.
- Cost guardrails unchanged; batch relocation windows rate‑limited.

**Risks**
- R1: Planner v2 regression. _Mitigation_: shadow planning + canary enable + rollback flag.
- R2: Batch relocation backlog. _Mitigation_: per‑dataset caps + priority queue + abort safe point.
- R3: ICS noise. _Mitigation_: severity matrix + gating; auto‑close on recovery.

**Definition of Done**
- Privacy v2 on ≥ 70% tenants without breaking diffs; 4 dataset relocations complete with proofs; audit pack index generated & signed; ICS handles at least one live drill with artifacts; planner v2 delivers ≥10% p95 improvement on 20 queries and ≤5% regressions; 3 new tenants created via blueprint with zero drift for 7 days.

---

## Swimlanes
- **Lane A — Privacy v2 Rollout** (Security + Backend + SRE)
- **Lane B — Regional Relocation @ Scale** (Platform + SRE + Backend)
- **Lane C — Enterprise Audit Pack** (MC + Security + SRE + QA)
- **Lane D — ICS v1.0** (SRE + Frontend + MC)
- **Lane E — Query Planner v2** (Backend + Graph Eng)
- **Lane F — Blueprinted Tenants** (Platform + Backend + Frontend)
- **Lane G — QA & Evidence** (QA + MC)

---

## Backlog (Epics → Stories → Tasks) + RACI
Estimates in SP.

### EPIC A: Privacy v2 Rollout (30 SP)
- **A‑1** Tenant waves & feature flags (10 SP) — _Security (R), SRE (C)_
- **A‑2** k‑anon/DP policy presets & monitors (10 SP) — _Data Eng (R)_
- **A‑3** Purpose‑bound token enforcement (10 SP) — _Backend (R)_

### EPIC B: Regional Relocation @ Scale (28 SP)
- **B‑1** Batch scheduler + priority queue (10 SP) — _Platform (R), SRE (A)_
- **B‑2** Partial writes instrumentation & caps (8 SP) — _Backend (R)_
- **B‑3** Four dataset moves + proofs (10 SP) — _SRE (R)_

### EPIC C: Enterprise Audit Pack (26 SP)
- **C‑1** Control catalog + mapping (10 SP) — _Security (R), MC (A)_
- **C‑2** Evidence index + signer (8 SP) — _Backend (R)_
- **C‑3** Export bundle & viewer cards (8 SP) — _Frontend (R)_

### EPIC D: ICS v1.0 (26 SP)
- **D‑1** Role matrix & runbooks (8 SP) — _SRE (R), MC (C)_
- **D‑2** Chat‑ops bridges (Slack/Teams) (10 SP) — _Backend (R)_
- **D‑3** Comms templates & PIR capture (8 SP) — _Frontend (R)_

### EPIC E: Query Planner v2 (28 SP)
- **E‑1** Selectivity stats + histogram store (10 SP) — _Backend (R)_
- **E‑2** Cost estimator & hinting (10 SP) — _Graph Eng (R)_
- **E‑3** Shadow planning + guardrails (8 SP) — _QA (R)_

### EPIC F: Blueprinted Tenants (24 SP)
- **F‑1** Gold config templates (12 SP) — _Platform (R)_
- **F‑2** Drift detection & auto‑fix PRs (6 SP) — _Backend (R)_
- **F‑3** One‑click create UI (6 SP) — _Frontend (R)_

### EPIC G: QA & Evidence v21 (12 SP)
- **G‑1** Planner/relocation/privacy acceptance (6 SP) — _QA (R)_
- **G‑2** Evidence bundle v21 (6 SP) — _MC (R)_

_Total_: **174 SP** (descope: D‑3 or F‑3 if capacity < 150 SP).

---

## Architecture (Deltas)
```mermaid
flowchart LR
  subgraph Privacy v2
    FLAGS[Tenant Flags]
    KAN[Anon/DP Monitors]
    PBT[Purpose-Bound Tokens]
  end
  FLAGS --> KAN --> PBT
  subgraph Regional@Scale
    SCHED[Batch Scheduler]
    PQ[Priority Queue]
    PWRITE[Partial Writes Caps]
  end
  SCHED --> PQ --> PWRITE
  subgraph Audit Pack
    CTRL[Control Catalog]
    IDX[Evidence Index + Signer]
    VIEW[Viewer Cards]
  end
  CTRL --> IDX --> VIEW
  subgraph ICS
    ROLES[Role Matrix]
    BRIDGES[Chat-Ops Bridges]
    COMM[Comms Templates]
  end
  ROLES --> BRIDGES --> COMM
  subgraph Planner v2
    STATS[Selectivity Stats]
    COST[Cost Estimator]
    SHADOW[Shadow Planner]
  end
  STATS --> COST --> SHADOW
  subgraph Blueprint
    GOLD[Gold Templates]
    DRIFT[Drift Detector]
    CREATE[One-Click Create]
  end
  GOLD --> DRIFT --> CREATE
```

**ADR‑063**: Shadow planning computes plans/costs side‑by‑side; activation is per‑query via feature flag. _Trade‑off_: extra CPU vs safe rollout.

**ADR‑064**: Batch relocation controlled by scheduler + queue; partial writes capped per dataset. _Trade‑off_: longer window vs stability.

**ADR‑065**: Audit pack index is a signed JSON manifest linking to evidence artifacts in the audit lake. _Trade‑off_: indirection vs integrity.

---

## Data & Policy
**Selectivity Histograms (PG)**
```sql
CREATE TABLE selectivity_hist (
  tenant_id UUID,
  attr TEXT,
  bucket JSONB,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, attr)
);
```

**Audit Pack Index (JSON)**
```json
{
  "version":"soc2-prep-v1",
  "controls":[{"id":"CC2.1","artifacts":["s3://ig-audit/.../change-mgmt.jsonl.gz"]}],
  "signatures":["..."]
}
```

**ICS Severity Matrix (YAML)**
```yaml
sev:
  - S1: "customer-impacting outage"
  - S2: "SLO burn > 50%"
  - S3: "degraded non-critical"
```

**Blueprint Template (YAML)**
```yaml
tenant:
  slo: { read_p95_ms: 350, write_p95_ms: 700 }
  budgets: { graphql_usd_day: 50, ingest_usd_day: 100 }
  privacy: { k: 5, epsilon: 2 }
  alerts: ["quota80","slo_burn","residency_violation"]
```

---

## APIs & Schemas
**GraphQL — Planner, Audit, Blueprint**
```graphql
scalar JSON

type PlanPreview { cost: Float!, estP95Ms: Int!, hints: JSON }

type Query { planPreview(opId: String!, vars: JSON!): PlanPreview! @auth(abac: "admin.write") }

type Mutation {
  enablePrivacyV2(tenantId: ID!, enabled: Boolean!): Boolean @auth(abac: "admin.write")
  scheduleRelocation(datasetId: ID!, window: String!): Boolean @auth(abac: "admin.write")
  createTenantFromBlueprint(name: String!, template: String!): ID! @auth(abac: "admin.write")
}
```

---

## Security & Privacy
- **Privacy**: rollout monitored; DP ε presets enforced; purpose claim required for sensitive endpoints.
- **Regional**: queue encrypted; replay idempotent; audit logs signed.
- **Audit Pack**: access requires `audit.read`; no raw data in viewer, metadata only.
- **ICS**: bridges use signed webhooks; principle of least privilege.

---

## Observability & SLOs
- Metrics: planner v2 adoption %, p95 deltas per op, relocation queue depth, partial write caps hit, privacy rollout %, audit pack build time, blueprint drift count, ICS MTTR/MTTA.
- Alerts: plan regression > 5%; relocation queue overflow; privacy k‑anon violation; unsigned audit index; blueprint drift detected.

---

## Testing Strategy
- **Unit**: histogram math; cost estimator; scheduler; token purpose checks; signer/verify.
- **Contract**: planPreview API; createTenantFromBlueprint; scheduleRelocation; audit index fetch.
- **E2E**: shadow vs active plans; batch relocations with partial writes; privacy rollout for a tenant; ICS drill with artifacts; blueprint create → drift monitor.
- **Load**: 15 RPS plan previews; relocation of 4 datasets; ICS webhook bursts.
- **Chaos**: histogram stale/missing; scheduler stall; chat‑ops outage (fallback email).

**Acceptance Packs**
- Planner v2 improves p95 ≥ 10% across 20 queries; no >5% regressions.
- 4 datasets relocated with proofs; write p95 within +20% during windows.
- Privacy v2 enabled for ≥ 70% tenants with no breaking diffs; k≥5 enforced.
- Audit pack index is signed and references all control artifacts.
- ICS drill ends with PIR and evidence bundle.
- 3 tenants created from blueprint; no drift for 7 days.

---

## CI/CD & IaC
```yaml
name: privacy-regional-audit-ics-planner-blueprint
on: [push]
jobs:
  planner:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run planner:stats && npm run planner:shadow:test
  regional:
    runs-on: ubuntu-latest
    steps:
      - run: npm run regional:batch && npm run regional:replay:test
  privacy:
    runs-on: ubuntu-latest
    steps:
      - run: npm run privacy:enable -- --tenant all && npm run privacy:kanon:dp:test
  audit:
    runs-on: ubuntu-latest
    steps:
      - run: npm run audit:index:build && npm run audit:index:sign
  ics:
    runs-on: ubuntu-latest
    steps:
      - run: npm run ics:drill && npm run ics:bridge:test
  blueprint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run blueprint:create:simulate && npm run blueprint:drift:test
```

**Terraform (queues, bridges, blueprints)**
```hcl
module "relocation_queue" { source = "./modules/queue" visibility_timeout = 600 encrypted = true }
module "chatops" { source = "./modules/chatops" providers = ["slack","teams"] signed_webhooks = true }
module "tenant_blueprints" { source = "./modules/blueprints" gold = ["default-secure","high‑assurance"] }
```

---

## Code & Scaffolds
```
repo/
  planner/v2/
    hist.ts
    cost.ts
    shadow.ts
  regional/batch/
    scheduler.ts
    queue.ts
  audit/pack/
    controls.json
    indexer.ts
    signer.ts
  ics/
    roles.yaml
    bridges/
      slack.ts
      teams.ts
    pir.ts
  privacy/rollout/
    enable.ts
    monitor.ts
  blueprint/
    templates/
      default-secure.yaml
      high-assurance.yaml
    create.ts
    drift.ts
```

**Cost Estimator (TS excerpt)**
```ts
export function estimate(opId:string, vars:any, hist:any){ /* cardinality & plan cost */ }
```

**Relocation Scheduler (TS excerpt)**
```ts
export function schedule(datasetId:string, window:string){ /* enqueue, caps, approvals */ }
```

---

## Release Plan & Runbooks
- **Staging cuts**: 2026‑07‑11, 2026‑07‑18.
- **Prod**: 2026‑07‑21 (canary 10→50→100%).

**Backout**
- Disable planner v2 (shadow only); pause batch relocations; rollback privacy flags for impacted tenants; disable ICS bridges; hide audit pack viewer; freeze blueprint create.

**Evidence Bundle v21**
- Planner shadow/active comparisons; relocation logs; privacy rollout & k‑anon/DP checks; audit index/signatures; ICS drill artifacts; blueprint creation + drift logs; signed manifest.

---

## RACI (Consolidated)
| Workstream | R | A | C | I |
|---|---|---|---|---|
| Privacy v2 Rollout | Security | MC | Backend, SRE | PM |
| Regional @ Scale | Platform | Tech Lead | Backend, SRE | PM |
| Enterprise Audit Pack | MC | Sec TL | Security, SRE, QA | PM |
| ICS v1.0 | SRE | MC | Frontend | PM |
| Planner v2 | Backend | Tech Lead | Graph Eng, QA | PM |
| Blueprinted Tenants | Platform | PM | Backend, Frontend | All |
| QA & Evidence | QA | PM | MC | All |

---

## Open Items
1. Select 4 datasets and windows for relocation.
2. Approve gold blueprint defaults with Security/Privacy.
3. Pick top 20 queries for planner v2 p95 targets.

```

