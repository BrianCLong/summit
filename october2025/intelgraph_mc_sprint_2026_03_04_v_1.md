````markdown
---
slug: intelgraph-mc-sprint-2026-03-04
version: v1.0
created: 2025-09-29
sprint_window: 2026-03-04 → 2026-03-17 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2026‑03‑04 → 2026‑03‑17)

> **Mission (Sprint N+11)**: Prove **Cross‑Cloud Data‑Plane DR v0.9** (warm read‑replicas + controlled failover), ship **Embeddings v0.9 → ER assist** (feature‑gated), add **Catalog & Dataset Registry v1.0**, deliver **Governed Exports** (DLP + license/purpose proofs), and finish **Cost/SLO autopilots** (adaptive caps, burn‑down guards). Evidence bundle v12 included.

## Conductor Summary (Commit)

**Assumptions & Provenance**

- Builds on 2026‑02‑18 sprint (subs/ZDM GA, marketplace v1.0, cost v2, DLP 1.2, optimizer/cache v1).
- Summit bundles still pending import; placeholders marked _[ATTACH FROM SUMMIT BUNDLE]_.

**Goals**

1. **Cross‑Cloud DR v0.9**: async replication for PG/Neo4j to secondary cloud (read‑only), controlled failover drill.
2. **Embeddings→ER Assist**: use vectors as _signals_ to improve ER candidate recall (no raw text retention).
3. **Catalog & Dataset Registry v1.0**: searchable catalog with license/purpose/retention, lineage links, contract status.
4. **Governed Exports v1.0**: export UI/API that bundles DLP preset, license & purpose proofs, residency attestations.
5. **Cost/SLO Autopilots**: adaptive per‑tenant caps, traffic shaping under burn, and auto open issues on guard breach.

**Non‑Goals**

- Full active/active writes; embeddings as primary ER decision.

**Constraints**

- SLOs unchanged. DR drills must keep read p95 ≤ +15% vs baseline during failover window.
- Cost guardrails unchanged; embeddings jobs capped by tenant and off‑peak windows.

**Risks**

- R1: Cross‑cloud lag → stale reads. _Mitigation_: stale‑read headers + user messaging + TTL fencing.
- R2: ER recall gains increase false positives. _Mitigation_: keep vectors as _recall only_, rules/model still gate merges.
- R3: Catalog sprawl. _Mitigation_: contract‑backed registration required; CI blocks unregistered datasets.

**Definition of Done**

- DR drill completed (failover→restore) with evidence; embeddings assist improves candidate recall ≥ 10% at same precision on labeled set; catalog live with search & lineage links; governed exports attach proofs; autopilots throttle traffic & caps when budgets/SLOs burn.

---

## Swimlanes

- **Lane A — Cross‑Cloud DR** (Platform + SRE + Security)
- **Lane B — Embeddings→ER Assist** (DS + Backend)
- **Lane C — Catalog & Registry** (Backend + Frontend + QA)
- **Lane D — Governed Exports** (Backend + Security)
- **Lane E — Autopilots (Cost/SLO)** (SRE FinOps + Backend)
- **Lane F — QA & Evidence** (QA + MC)

---

## Backlog (Epics → Stories → Tasks) + RACI

Estimates in SP.

### EPIC A: Cross‑Cloud DR v0.9 (34 SP)

- **A‑1** Async replication setup (PG/Neo4j) (12 SP) — _Platform (R), SRE (A)_
  - AC: replica lag metrics; read‑only gates writes.
- **A‑2** Router + stale‑read headers (10 SP) — _Backend (R)_
  - AC: `x-ig-stale-read: ms` when from secondary.
- **A‑3** Failover & return drill (12 SP) — _SRE (R)_
  - AC: RTO ≤ 30 min; RPO ≤ 5 min; evidence signed.

### EPIC B: Embeddings Assist v0.9 (26 SP)

- **B‑1** Candidate generation via ANN (10 SP) — _DS (R)_
- **B‑2** ER pipeline hook (8 SP) — _Backend (R)_
- **B‑3** Eval harness & caps (8 SP) — _QA (R), SRE (C)_

### EPIC C: Catalog & Dataset Registry v1.0 (28 SP)

- **C‑1** Registry schema + API (10 SP) — _Backend (R)_
- **C‑2** Catalog UI (search/filter) (10 SP) — _Frontend (R)_
- **C‑3** CI gate for unregistered datasets (8 SP) — _QA (R)_

### EPIC D: Governed Exports v1.0 (24 SP)

- **D‑1** Proof bundle (license/purpose/residency/DLP) (10 SP) — _Backend (R), Sec (A)_
- **D‑2** Export UI & presets (8 SP) — _Frontend (R)_
- **D‑3** Verify tool (6 SP) — _Security (R)_

### EPIC E: Autopilots (Cost/SLO) (22 SP)

- **E‑1** Adaptive caps & shaping (10 SP) — _SRE FinOps (R)_
- **E‑2** SLO burn controller (8 SP) — _SRE (R)_
- **E‑3** Auto‑issue + evidence links (4 SP) — _MC (R)_

### EPIC F: QA & Evidence v12 (12 SP)

- **F‑1** DR/ER‑assist acceptance packs (6 SP) — _QA (R)_
- **F‑2** Evidence bundle v12 (6 SP) — _MC (R)_

_Total_: **146 SP** (descope: C‑3 or E‑3 if capacity < 130 SP).

---

## Architecture (Deltas)

```mermaid
flowchart LR
  subgraph Cloud A (Primary)
    GWA[Gateway]
    PGA[(PostgreSQL A)]
    NEOA[(Neo4j A)]
  end
  subgraph Cloud B (Secondary)
    GWB[Gateway]
    PGB[(PostgreSQL B Readonly)]
    NEOB[(Neo4j B Readonly)]
  end
  PGA ==> PGB
  NEOA ==> NEOB
  Router[Cross-Cloud Router] <--> GWA
  Router <--> GWB
  note[stale-read header]
  subgraph ER Assist
    EMB[Embeddings ANN]
    ERQ[ER Queue]
  end
  EMB --> ERQ --> ERPipeline
  subgraph Catalog
    REG[Dataset Registry]
    UI[Catalog UI]
  end
  REG --> UI
  subgraph Export
    GOV[Governed Exporter]
    PROOF[Proof Bundle]
  end
  GOV --> PROOF
```
````

**ADR‑034**: DR uses async replicas in secondary cloud; writes constrained to primary. _Trade‑off_: potential staleness vs resiliency.

**ADR‑035**: Embeddings only expand candidate sets; final merge requires rules/model thresholds. _Trade‑off_: compute cost vs recall gains.

**ADR‑036**: Governed exports require proof bundle; exports without proofs are denied. _Trade‑off_: friction vs compliance.

---

## Data & Policy

**Registry (PG)**

```sql
CREATE TABLE datasets (
  dataset_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  license TEXT NOT NULL,
  purpose TEXT[] NOT NULL,
  retention TEXT NOT NULL,
  region TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Proof Manifest (JSON)**

```json
{
  "exportId": "<uuid>",
  "tenant": "<uuid>",
  "dlpPreset": "tokenize_strict",
  "license": "Restricted-TOS",
  "purposes": ["investigation"],
  "residency": "US",
  "hash": "sha256-...",
  "signatures": ["..."]
}
```

**Policy (Rego) — Export Gate**

```rego
package intelgraph.export

default allow = false
allow {
  input.proof.license != "Embargoed"
  input.proof.purposes[_] == input.request.purpose
  input.proof.dlpPreset != "none"
}
```

---

## APIs & Schemas

**GraphQL — Catalog & Exports**

```graphql
type Dataset {
  id: ID!
  name: String!
  license: String!
  purpose: [String!]!
  retention: String!
  region: String!
  contractVersion: String!
}

type Query {
  datasets(
    q: String
    license: String
    purpose: String
    region: String
    after: String
  ): [Dataset!]! @auth(abac: "catalog.read")
}

type Mutation {
  registerDataset(input: DatasetInput!): Boolean @auth(abac: "catalog.write")
  requestGovernedExport(datasetId: ID!, preset: String!, purpose: String!): ID!
    @auth(abac: "export.request")
}
```

**ER Assist Hook (pseudo)**

```ts
const candidates = ann.knn(embedding(e), K);
return rulesFilter(candidates).slice(0, N);
```

---

## Security & Privacy

- **DR**: mTLS across clouds; replica reads tagged; audit failover ops; secrets managed per cloud KMS.
- **Embeddings**: vectors only; source text never stored; per‑tenant caps.
- **Catalog/Exports**: registration required; export gated by proof bundle; logs contain hashes only.

---

## Observability & SLOs

- New metrics: replica lag, stale‑read rate, ER recall delta, catalog coverage %, export proof failures, cap throttles.
- Alerts: lag > 5s 10m; export without proof attempt; recall delta < +10% (actionable); catalog coverage < 90% of active datasets.

---

## Testing Strategy

- **Unit**: registry CRUD; proof manifest signer/verify; ANN candidate gen; router stale‑read.
- **Contract**: catalog API; export gate; ER hook; DR headers.
- **E2E**: failover→restore; ER assist improves recall on labeled set; governed export produces verifiable proof.
- **Load**: cross‑cloud reads +15% p95; embeddings batch at off‑peak; export 10 GB with DLP.
- **Chaos**: drop replication link; ANN index corruption (rebuild path).

**Acceptance Packs**

- DR drill meets RTO/RPO; headers present on stale reads.
- ER assist: ≥ +10% candidate recall at equal precision on sample; merge policy unchanged.
- Catalog: unregistered dataset PR blocked; UI search works.
- Export: proof bundle verifies; gate denies missing/invalid proofs.
- Autopilots: budget/SLO burn triggers shaping and cap reductions with audit.

---

## CI/CD & IaC

```yaml
name: dr-emb-catalog-export
on: [push]
jobs:
  dr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run dr:simulate && npm run dr:verify
  embeddings:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm run emb:eval
  catalog:
    runs-on: ubuntu-latest
    steps:
      - run: npm run catalog:test && npm run policy:sim
  exports:
    runs-on: ubuntu-latest
    steps:
      - run: npm run export:sign && npm run export:verify
```

**Terraform (replication controls)**

```hcl
module "pg_replica" { source="./modules/pg" cloud_secondary="gcp" read_only=true }
module "neo_replica" { source="./modules/neo4j" cloud_secondary="gcp" read_only=true }
```

---

## Code & Scaffolds

```
repo/
  dr/
    router-stale-header.ts
    drill.sh
  er/assist/
    knn.ts
    hook.ts
  catalog/
    api.ts
    ui/
      Catalog.tsx
  export/governed/
    bundle.ts
    verify.ts
  autopilot/
    caps.ts
    slo-burn.ts
```

**Stale‑Read Header (TS)**

```ts
export function markStale(ms: number, res: any) {
  if (ms > 0) res.setHeader('x-ig-stale-read', String(ms));
}
```

**Export Verify (TS)**

```ts
export function verify(bundle: { hash: string; signatures: string[] }) {
  /* hash+sig check */
}
```

---

## Release Plan & Runbooks

- **Staging cuts**: 2026‑03‑07, 2026‑03‑14.
- **Prod**: 2026‑03‑17 (canary 10→50→100%).

**Backout**

- Disable secondary reads; turn off ER assist hook; relax export gates to manual review; disable traffic shaping.

**Evidence Bundle v12**

- DR drill logs & timings; embeddings eval; catalog conformance; export proofs + verifier output; autopilot actions; signed manifest.

---

## RACI (Consolidated)

| Workstream         | R          | A         | C            | I   |
| ------------------ | ---------- | --------- | ------------ | --- |
| Cross‑Cloud DR     | Platform   | SRE TL    | Security     | PM  |
| Embeddings Assist  | DS         | MC        | Backend      | PM  |
| Catalog & Registry | Backend    | Tech Lead | QA, Frontend | PM  |
| Governed Exports   | Backend    | Sec TL    | Security     | PM  |
| Autopilots         | SRE FinOps | PM        | Backend      | All |
| QA & Evidence      | QA         | PM        | MC           | All |

---

## Open Items

1. Confirm secondary cloud regions per tenant _[ATTACH FROM SUMMIT BUNDLE]_.
2. Provide labeled set for ER recall eval.
3. Approve default export presets & proof contents with Legal/Privacy.

```

```
