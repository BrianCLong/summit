```markdown
---
slug: intelgraph-mc-sprint-2026-03-18
version: v1.0
created: 2025-09-29
sprint_window: 2026-03-18 → 2026-03-31 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2026‑03‑18 → 2026‑03‑31)

> **Mission (Sprint N+12)**: Take **Cross‑Cloud DR** to **GA**, graduate **Governed Exports** and **Catalog** to **v1.1**, roll out **Policy Reasoner v2** (dataset‑level + per‑purpose overrides), introduce **Query Budgeting** (per‑op cost limits), and ship **Operational Readiness Reviews (ORR) pack** with automated evidence. Evidence bundle v13 included.

## Conductor Summary (Commit)
**Goals**
1. **Cross‑Cloud DR GA**: codify runbooks, automate failover/return, SLO boards, region fitness checks.
2. **Governed Exports v1.1**: one‑click export presets, proof viewer/validator UI, offline verify tool polish.
3. **Catalog v1.1**: dataset quality scores, contract status rollups, lineage heat‑map, API discoverability.
4. **Policy Reasoner v2**: hierarchical rules (tenant→dataset→purpose), test matrix, decision diffs.
5. **Query Budgeting**: per‑persisted‑ID budgets; reject/shape on projected cost; admin controls + alerts.
6. **ORR Pack**: automated checklists (SLOs, runbooks, alerts, backups, guards) and sign‑off workflow.

**Non‑Goals**
- Active/active writes; embedding ER decisioning; marketplace monetization.

**Constraints**
- Platform SLOs unchanged; DR failover must keep read p95 ≤ +15% vs baseline.
- Cost guardrails unchanged; budgets honored even during DR.

**Risks**
- R1: Aggressive query budgets block legitimate analytics. _Mitigation_: sandbox overrides with approval + audit.
- R2: Policy v2 regressions. _Mitigation_: decision diff tests + shadow mode.
- R3: DR automation mistakes. _Mitigation_: approval gates + dry‑run + staged.

**Definition of Done**
- DR GA drills pass with automated evidence; governed export v1.1 UX shipped; catalog v1.1 deployed; policy v2 in shadow with 0 breaking diffs, opt‑in for 2 tenants; query budgets enforce on top 10 persisted IDs; ORR pack used for this release.

---

## Swimlanes
- **Lane A — DR GA & Fitness** (Platform + SRE)
- **Lane B — Governed Exports v1.1** (Backend + Security + Frontend)
- **Lane C — Catalog v1.1** (Backend + Frontend + QA)
- **Lane D — Policy Reasoner v2** (Security + Backend)
- **Lane E — Query Budgeting** (Backend + SRE FinOps)
- **Lane F — ORR & Evidence** (QA + MC)

---

## Backlog (Epics → Stories → Tasks) + RACI
Estimates in SP.

### EPIC A: Cross‑Cloud DR GA (34 SP)
- **A‑1** Automated failover/return (12 SP) — _SRE (R), Platform (A)_
  - AC: single command w/ approval; timers captured; mTLS secrets rotated.
- **A‑2** Region fitness checks (10 SP) — _SRE (R)_
  - AC: CPU, lag, quota, error rate thresholds gate failover.
- **A‑3** SLO boards + alerts (12 SP) — _SRE (R)_

### EPIC B: Governed Exports v1.1 (26 SP)
- **B‑1** Proof viewer UI (10 SP) — _Frontend (R)_
- **B‑2** Offline verify CLI polish (8 SP) — _Security (R)_
- **B‑3** Preset composer (mask/tokenize/residency/license) (8 SP) — _Backend (R)_

### EPIC C: Catalog v1.1 (26 SP)
- **C‑1** Quality scores & badges (10 SP) — _Backend (R), QA (C)_
- **C‑2** Lineage heat‑map (8 SP) — _Frontend (R)_
- **C‑3** API discoverability (OpenAPI/SDL cards) (8 SP) — _Backend (R)_

### EPIC D: Policy Reasoner v2 (28 SP)
- **D‑1** Hierarchical rules & overrides (12 SP) — _Security (R), Backend (C)_
- **D‑2** Decision diff test harness (8 SP) — _QA (R)_
- **D‑3** Shadow mode + metrics (8 SP) — _SRE (R)_

### EPIC E: Query Budgeting (24 SP)
- **E‑1** Budget estimator (persisted‑ID) (8 SP) — _Backend (R)_
- **E‑2** Enforcer (reject/shape) (8 SP) — _Backend (R), SRE (C)_
- **E‑3** Admin UI + alerts (8 SP) — _Frontend (R)_

### EPIC F: ORR & Evidence v13 (18 SP)
- **F‑1** ORR checklist automation (10 SP) — _QA (R), MC (A)_
- **F‑2** Evidence bundle v13 (8 SP) — _MC (R)_

_Total_: **156 SP** (descope: C‑2 or E‑3 if capacity < 140 SP).

---

## Architecture (Deltas)
```mermaid
flowchart LR
  subgraph Cloud A (Primary)
    GWA[Gateway]
    PGA[(PG A)]
    NEOA[(Neo4j A)]
  end
  subgraph Cloud B (Secondary)
    GWB[Gateway]
    PGB[(PG B - RO)]
    NEOB[(Neo4j B - RO)]
  end
  Auto[Failover Automator]-->GWA
  Auto-->GWB
  Fit[Region Fitness Checks]-->Auto
  subgraph Exports
    EXP[Exporter]
    PV[Proof Viewer]
    CLI[Verify CLI]
  end
  EXP-->PV
  EXP-->CLI
  subgraph Catalog
    REG[Registry]
    QS[Quality Scorer]
    MAP[Lineage Heat-map]
  end
  REG-->QS
  REG-->MAP
  subgraph Policy v2
    HIER[Hierarchical Policy]
    DIFF[Decision Diff]
  end
  HIER-->DIFF
  subgraph Budgets
    EST[Estimator]
    ENF[Enforcer]
    UI[Admin UI]
  end
  EST-->ENF-->UI
```

**ADR‑037**: DR automation gated by region fitness and approvals. _Trade‑off_: slower switch vs safety.

**ADR‑038**: Query budgets enforce cost ceilings per persisted ID. _Trade‑off_: bounded spend vs denied heavy queries.

**ADR‑039**: Policy v2 is hierarchical with deterministic precedence (tenant < dataset < purpose). _Trade‑off_: complexity vs flexibility.

---

## Data & Policy
**Budgeting (PG)**
```sql
CREATE TABLE query_budgets (
  tenant_id UUID,
  op_id TEXT,
  daily_cost_cap_usd NUMERIC NOT NULL,
  action TEXT CHECK (action IN ('reject','shape')) DEFAULT 'shape',
  PRIMARY KEY (tenant_id, op_id)
);
```

**Policy v2 (Rego excerpt)**
```rego
package intelgraph.policy.v2

# precedence: tenant < dataset < purpose
allow[action] {
  some rule
  action := input.action
}
```

**Quality Score (PG)**
```sql
CREATE TABLE dataset_quality (
  dataset_id TEXT PRIMARY KEY,
  freshness_score NUMERIC,
  completeness_score NUMERIC,
  contract_health NUMERIC,
  quality NUMERIC GENERATED ALWAYS AS ((freshness_score+completeness_score+contract_health)/3) STORED
);
```

---

## APIs & Schemas
**GraphQL — Budgets & Catalog**
```graphql
type QueryBudget { opId: String!, dailyCostCapUSD: Float!, action: String! }

type Mutation {
  setQueryBudget(opId: String!, dailyCostCapUSD: Float!, action: String!): Boolean @auth(abac: "admin.write")
}

type DatasetQuality { datasetId: ID!, quality: Float!, freshness: Float!, completeness: Float!, contractHealth: Float! }

type Query { datasetQuality(id: ID!): DatasetQuality! @auth(abac: "catalog.read") }
```

**Proof Viewer (UI JSON)**
```json
{ "exportId":"...","dlpPreset":"tokenize_strict","residency":"US","license":"Restricted-TOS","verdict":"valid" }
```

---

## Security & Privacy
- **DR**: approvals required; audit each step; secrets revalidated post‑switch.
- **Exports**: proofs signed; viewer never shows raw data; only metadata/hashes.
- **Policy**: decision diffs stored for 30 days (`short-30d`).
- **Budgets**: admin changes require 2‑person approval.

---

## Observability & SLOs
- Metrics: failover duration, region fitness status, proof verify success, catalog quality distribution, policy diff rate, budget rejections.
- Alerts: fitness degraded; export verify failures; quality dips on key datasets; budget denial spikes.

---

## Testing Strategy
- **Unit**: estimator math; policy precedence; proof parser; quality rollups.
- **Contract**: budget API; proof viewer; catalog v1.1.
- **E2E**: automated failover→return; export with proof→offline verify; policy v2 shadow vs v1; budgets block heavy op.
- **Load**: catalog queries at 10 RPS; exporter 10 GB; failover window traffic.
- **Chaos**: simulate unhealthy region; corrupt proofs; policy rule conflicts.

**Acceptance Packs**
- DR GA: RTO/RPO within targets; stale‑read headers set; evidence signed.
- Exports: viewer shows valid proofs; CLI verify passes; invalid proof denied.
- Catalog: quality score visible; lineage map renders; contract rollups accurate.
- Policy v2: no breaking diffs in shadow; decision logs complete.
- Budgets: top 10 op IDs enforced; alerts at 80% of caps.

---

## CI/CD & IaC
```yaml
name: dr-ga-exports-catalog-budgets
on: [push]
jobs:
  dr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run dr:auto:test
  exports:
    runs-on: ubuntu-latest
    steps:
      - run: npm run export:proof:verify
  catalog:
    runs-on: ubuntu-latest
    steps:
      - run: npm run catalog:quality:test
  budgets:
    runs-on: ubuntu-latest
    steps:
      - run: npm run budgets:test
```

**Terraform (fitness gates)**
```hcl
module "region_fitness" {
  source = "./modules/fitness"
  cpu_threshold = 0.7
  lag_threshold_seconds = 5
  error_rate_threshold = 0.01
}
```

---

## Code & Scaffolds
```
repo/
  dr/auto/
    run.ts
    fitness.ts
  exports/viewer/
    ProofViewer.tsx
  policy/v2/
    rules.rego
    shadow.ts
  budgets/
    estimator.ts
    enforcer.ts
  catalog/quality/
    score.ts
    api.ts
```

**Budget Estimator (TS excerpt)**
```ts
export function estimateCost(opId:string, vars:any){ /* static weights + param scan */ }
```

**Policy Shadow (TS excerpt)**
```ts
export function compare(oldVerdict:any, newVerdict:any){ /* diff + metrics */ }
```

---

## Release Plan & Runbooks
- **Staging cuts**: 2026‑03‑21, 2026‑03‑28.
- **Prod**: 2026‑03‑31 (canary 10→50→100%).

**Backout**
- Freeze DR automation (manual only); revert to policy v1; disable budgets enforcement (alert‑only); hide proof viewer.

**Evidence Bundle v13**
- DR automation logs; region fitness snapshots; export proofs & verifier outputs; catalog quality reports; policy v2 shadow diffs; budget enforcement logs; signed manifest.

---

## RACI (Consolidated)
| Workstream | R | A | C | I |
|---|---|---|---|---|
| DR GA | SRE | Platform TL | Security | PM |
| Governed Exports | Backend | Sec TL | Security, Frontend | PM |
| Catalog v1.1 | Backend | Tech Lead | Frontend, QA | PM |
| Policy v2 | Security | MC | Backend | PM |
| Query Budgets | Backend | MC | SRE FinOps | PM |
| ORR & Evidence | QA | PM | MC | All |

---

## Open Items
1. Confirm DR run windows and comms plan with tenants.
2. Approve initial per‑op budget caps for top 10 operations.
3. Set quality scoring formula weights with Data Eng/QA.

```

