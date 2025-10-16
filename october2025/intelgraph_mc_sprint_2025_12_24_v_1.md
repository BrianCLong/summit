````markdown
---
slug: intelgraph-mc-sprint-2025-12-24
version: v1.0
created: 2025-09-29
sprint_window: 2025-12-24 → 2026-01-06 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2025‑12‑24 → 2026‑01‑06)

> **Mission (Sprint N+6)**: Package **Black‑Cell (air‑gapped) bundle v0.9**, finalize **SOC 2 evidence automation v2**, ship **self‑serve tenant onboarding & billing**, harden **supply‑chain (SLSA/SBOM) + secrets rotation**, and deliver **graph performance optimizations** while keeping SLOs/cost guardrails green. Evidence bundle v7 included.

## Conductor Summary (Commit)

**Assumptions & Provenance**

- Builds on 2025‑12‑10 GA (Kafka & Hybrid Search), Delegated Admin/SCIM, dashboards, incident automation.
- Summit bundles remain pending import; placeholders _[ATTACH FROM SUMMIT BUNDLE]_ where applicable.

**Goals**

1. **Black‑Cell v0.9**: offline, no‑egress deployment with signed export channels, file‑drop ingestion, provenance resync tool.
2. **Evidence Automation v2**: SOC 2 control mapping expansion, auto‑collectors (logs, configs, scans), one‑click export.
3. **Self‑Serve Onboarding & Billing**: tenant signup, plan selection, metering, budgets & invoices (internal sandbox billing).
4. **Supply‑Chain Hardening**: SLSA provenance attestations, SBOM diff gates, dependency review with allowlist; secret rotation runbook.
5. **Graph Perf & Cost**: Neo4j query tuning, hot‑path caches, query planner hints, and write‑amplification reduction.

**Non‑Goals**

- Cross‑cloud DR (tracked separately), advanced anomaly detection, production external billing gateways.

**Constraints**

- SLOs unchanged. Black‑Cell runs fully offline with **no external calls**.
- Cost guardrails unchanged; budget alerts at 80% burn; offline bundle sized ≤ 8 GB.

**Risks**

- R1: Air‑gapped bundle drift vs SaaS features. _Mitigation_: feature flags + compatibility tests.
- R2: Billing calculations inaccuracies. _Mitigation_: metering golden tests, shadow invoices.
- R3: Perf changes regress correctness. _Mitigation_: query plan snapshots + canary perf tests.

**Definition of Done**

- Black‑Cell bundle installs in isolated cluster; exports signed and verifiable; resync succeeds with >99.99% provenance continuity; SOC 2 v2 exporter runs; self‑serve onboarding flows in sandbox; SLSA/SBOM gates live; perf targets met (see Observability).

---

## Swimlanes

- **Lane A — Black‑Cell** (Platform + SRE + Security)
- **Lane B — Evidence Automation** (Security + QA + MC)
- **Lane C — Onboarding & Billing** (Backend + Frontend + SRE FinOps)
- **Lane D — Supply‑Chain & Secrets** (Security + Platform)
- **Lane E — Graph Performance** (Backend + Graph Eng)
- **Lane F — QA & Release** (QA + PM)

---

## Backlog (Epics → Stories → Tasks) + RACI

Estimates in SP.

### EPIC A: Black‑Cell (Air‑Gapped) v0.9 (36 SP)

- **A‑1** Offline bundle build (Helm + OCI) (10 SP) — _Platform (R), SRE (A)_
  - AC: `ig-blackcell.tgz` signed (cosign), manifests SHA logged.
- **A‑2** File‑Drop connector (local/volume) (8 SP) — _Data Eng (R)_
  - AC: schema mapping + dedupe + provenance; throughput ≥ 40 MB/s.
- **A‑3** Export signer & gateway (8 SP) — _Backend (R), Sec (A)_
  - AC: signed tar exports (hash chain + X.509); policy‑gated.
- **A‑4** Provenance resync tool (10 SP) — _Data Eng (R), MC (C)_
  - AC: reconcile hashes post‑egress; mismatch report ≤ 1e‑6.

### EPIC B: Evidence Automation v2 (26 SP)

- **B‑1** Control catalog expansion (10 SP) — _Sec (R)_
- **B‑2** Auto‑collectors (configs/logs/scans) (8 SP) — _SRE (R)_
- **B‑3** One‑click export (8 SP) — _Backend (R), MC (A)_

### EPIC C: Self‑Serve Onboarding & Billing (34 SP)

- **C‑1** Tenant signup + verification (10 SP) — _Frontend (R), Backend (C)_
- **C‑2** Metering (GraphQL calls, ingest events, storage) (10 SP) — _SRE FinOps (R)_
- **C‑3** Budget & invoice (sandbox) (8 SP) — _Backend (R)_
- **C‑4** Admin UI for plans & caps (6 SP) — _Frontend (R)_

### EPIC D: Supply‑Chain & Secrets (24 SP)

- **D‑1** SLSA attestations (8 SP) — _Security (R)_
- **D‑2** SBOM diff gate (8 SP) — _QA (R)_
- **D‑3** Secret rotation runbook + KMS (8 SP) — _Platform (R)_

### EPIC E: Graph Performance (24 SP)

- **E‑1** Query plan snapshots & hints (10 SP) — _Backend (R)_
- **E‑2** Hot‑path caches (5 SP) — _Backend (R), SRE (C)_
- **E‑3** Write‑amplification reduction (9 SP) — _Graph Eng (R)_

### EPIC F: QA & Release (16 SP)

- **F‑1** Conformance + offline install tests (8 SP) — _QA (R)_
- **F‑2** Evidence bundle v7 (8 SP) — _MC (R)_

_Total_: **160 SP** (descope candidates: C‑4, E‑2 if capacity < 140 SP).

---

## Architecture (Deltas)

```mermaid
flowchart LR
  subgraph Black-Cell (Air-gapped)
    UIN[UI]
    GW[Graph Gateway]
    NEO[(Neo4j)]
    PG[(PostgreSQL)]
    REDIS[(Redis)]
    FD[File-Drop Connector]
    LEDGER[(Provenance Ledger)]
    XPT[Export Signer]
  end
  UIN --> GW --> NEO
  GW --> PG
  GW --> REDIS
  FD --> PG
  FD --> LEDGER
  LEDGER --> XPT
  subgraph SaaS (Online)
    RSYNC[Provenance Resync API]
  end
  XPT -- signed bundle --> RSYNC
```
````

**ADR‑018**: Air‑gapped bundle uses **no egress**; only signed export files can leave. _Trade‑off_: operational friction vs assurance.

**ADR‑019**: Provenance resync reconciles hash‑chains and emits a mismatch proof. _Trade‑off_: storage overhead vs integrity.

**ADR‑020**: Metering calculated server‑side with immutable logs. _Trade‑off_: extra storage vs billing accuracy.

---

## Data & Policy

**Provenance Resync (PG)**

```sql
CREATE TABLE resync_reports (
  report_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  items JSONB NOT NULL,
  mismatches INT NOT NULL
);
```

**Metering (PG)**

```sql
CREATE TABLE metering_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  kind TEXT CHECK (kind IN ('graphql_call','ingest_event','storage_gb_hour')),
  quantity NUMERIC NOT NULL,
  ts TIMESTAMPTZ NOT NULL
);
```

**Policies (OPA)**

```rego
package intelgraph.egress

default allow = false

allow {
  input.channel == "signed_export"
  input.signature.valid
  input.dataset.purpose[_] == "investigation"
}
```

---

## APIs & Schemas

**GraphQL — Onboarding & Billing**

```graphql
type Plan {
  id: ID!
  name: String!
  priceUSD: Float!
  caps: Budget
}

type Invoice {
  id: ID!
  month: String!
  items: [InvoiceItem!]!
  totalUSD: Float!
}

type InvoiceItem {
  kind: String!
  quantity: Float!
  unitPriceUSD: Float!
  amountUSD: Float!
}

type Mutation {
  signupTenant(name: String!, region: String!, planId: ID!): ID!
  setPlan(tenantId: ID!, planId: ID!): Boolean @auth(abac: "admin.write")
  generateInvoice(tenantId: ID!, month: String!): Invoice
    @auth(abac: "admin.write")
}
```

**Resync API (REST)**

```
POST /provenance/resync
Body: { tenantId, bundleSha256, manifest, signatures[] }
```

---

## Security & Privacy

- **Supply‑chain**: SLSA provenance attestations for images & artifacts; SBOM (CycloneDX) stored & diffed.
- **Secrets**: KMS‑backed envelope encryption; quarterly rotation; break‑glass w/ approvals & logging.
- **Privacy**: export policies enforce purpose limitation; metering logs exclude PII.

---

## Observability & SLOs

- **Perf Targets**:
  - API reads p95 ≤ 350 ms; writes p95 ≤ 700 ms (unchanged).
  - Graph 1‑hop ≤ 300 ms; 2–3 hop ≤ 1,200 ms (unchanged).
  - Ingest File‑Drop ≥ 40 MB/s/worker; processing p95 ≤ 100 ms.
- **New Metrics**: offline install time; export size & verification time; metering lag; query plan changes; cache hit rate.
- **Alerts**: export verify failure; SBOM drift; secret nearing expiry; cache hit < 85% for hot ops.

---

## Testing Strategy

- **Unit**: metering arithmetic; export signing/verify; file‑drop schema mapping.
- **Contract**: resync REST; billing GraphQL; OPA egress policy.
- **E2E**: offline install → ingest → export → resync; tenant signup → invoice; secret rotation.
- **Load**: file‑drop 200 GB sample; billing calc for 10M events.
- **Chaos**: corrupt export; missing signature; expired secret; cache eviction storm.

**Acceptance Packs**

- Given air‑gapped install, exports verify and resync mismatch rate ≤ 1e‑6.
- Given month with 1M GraphQL calls & 2M ingest events, invoice matches golden totals ±0.1%.
- Given SBOM diff with new Restricted‑TOS license, CI blocks merge.
- Given secret expiring in <7 days, rotation triggers and services continue.

---

## CI/CD & IaC

```yaml
name: blackcell-build
on: [workflow_dispatch]
jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: helm package charts/blackcell -d dist && cosign sign-blob --key cosign.key dist/ig-blackcell.tgz
      - run: npm run sbom:gen && npm run sbom:diff
```

**Terraform (air‑gapped cluster)**

```hcl
module "blackcell" {
  source = "./modules/blackcell"
  internet_egress = false
  node_count = 3
  storage_class = "encrypted-local"
}
```

---

## Code & Scaffolds

```
repo/
  blackcell/
    charts/
      values-offline.yaml
    tools/
      export-signer.ts
      resync.ts
  connectors/filedrop/
    index.ts
    schema-map.ts
  billing/
    metering.ts
    invoice.ts
  supplychain/
    slsa.yml
    sbom-diff.ts
  secrets/
    rotate.md
    rotate.ts
  perf/
    plansnap.ts
    hints.ts
```

**Export signer (TS)**

```ts
import { createSign } from 'crypto';
export function signBundle(path: string, keyPem: string) {
  const buf = fs.readFileSync(path);
  const sig = createSign('sha256').update(buf).sign(keyPem, 'base64');
  return { sha256: sha256(buf), sig };
}
```

**Resync tool (TS)**

```ts
export async function resync(manifest: any) {
  for (const item of manifest.artifacts) {
    const ok = await verifyHash(item.path, item.sha256);
    if (!ok) report.mismatches++;
  }
  return report;
}
```

**Metering (TS)**

```ts
export function addEvent(
  tenant: string,
  kind: 'graphql_call' | 'ingest_event' | 'storage_gb_hour',
  qty: number,
) {
  // write immutable row; aggregate later
}
```

**Query Plan Snapshot (TS)**

```ts
export async function snapshot(opId: string) {
  const plan = await neo4jProfile(opId);
  await store(plan, { opId, ts: Date.now() });
}
```

---

## Release Plan & Runbooks

- **Staging cuts**: 2025‑12‑28, 2026‑01‑04.
- **Prod**: 2026‑01‑06 (canary 10→50→100%).

**Backout**

- Disable onboarding/billing mutations; pause export channels; revert perf hints.

**Evidence Bundle v7**

- Black‑Cell bundle SHAs & signatures; offline install logs; resync report; SOC 2 v2 export; metering/invoice proofs; SBOM diffs; perf dashboards; signed manifest.

---

## RACI (Consolidated)

| Workstream           | R        | A            | C                    | I   |
| -------------------- | -------- | ------------ | -------------------- | --- |
| Black‑Cell           | Platform | SRE TL       | Security, MC         | PM  |
| Evidence v2          | Security | MC           | QA                   | PM  |
| Onboarding/Billing   | Backend  | Tech Lead    | SRE FinOps, Frontend | PM  |
| Supply‑Chain/Secrets | Security | MC           | Platform             | PM  |
| Graph Performance    | Backend  | Graph Eng TL | SRE                  | PM  |
| QA & Release         | QA       | PM           | MC                   | All |

---

## Open Items

1. Air‑gapped customer requirements checklist _[ATTACH FROM SUMMIT BUNDLE]_.
2. Finalize plan SKUs & unit prices for sandbox billing.
3. Identify top N slow persisted ops for hinting.

```

```
