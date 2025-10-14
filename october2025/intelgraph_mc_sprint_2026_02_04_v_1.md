```markdown
---
slug: intelgraph-mc-sprint-2026-02-04
version: v1.0
created: 2025-09-29
sprint_window: 2026-02-04 → 2026-02-17 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2026‑02‑04 → 2026‑02‑17)

> **Mission (Sprint N+9)**: Promote **Multi‑Cloud to GA (AWS+GCP)**, introduce **Realtime Subscriptions** with SLO guards, ship **Zero‑Downtime Migrations (ZDM)** kit, launch **Connector Marketplace v0.9**, add **Graph Embeddings Preview** (GDS/RAG‑safe), and formalize **Customer Portal** with SLA reports—while maintaining platform SLOs/cost guardrails. Evidence bundle v10 included.

## Conductor Summary (Commit)
**Assumptions & Provenance**
- Builds on 2026‑01‑21 sprint (multi‑cloud v0.9, federation subgraphs, model ops, PII redaction, usage reports).
- Summit bundles remain pending import; placeholders _[ATTACH FROM SUMMIT BUNDLE]_ where noted.

**Goals**
1. **Multi‑Cloud GA**: production overlays, health checks, cost parity dashboards, and failover playbook (control plane only).
2. **Realtime Subscriptions**: GraphQL subscriptions for entity changes; fan‑out p95 ≤ 250 ms; backpressure & authZ.
3. **ZDM Kit**: schema versioning/migrations with dual‑write + read‑compat shims; automated cutover/rollback.
4. **Connector Marketplace v0.9**: pluggable registry, signing, policy class checks, and one‑click enablement.
5. **Graph Embeddings (Preview)**: embeddings service with per‑tenant opt‑in; capped cost; no raw content leakage (RAG‑safe design).
6. **Customer Portal**: SLA & cost dashboards, usage statements, download of evidence bundle snapshots.

**Non‑Goals**
- Cross‑cloud *data plane* DR; embedding‑based ER replacement; external paid marketplace.

**Constraints**
- SLOs unchanged, plus Subscriptions: server→client latency p95 ≤ 250 ms.
- Cost guardrails unchanged; embeddings jobs limited to off‑peak windows and per‑tenant caps.

**Risks**
- R1: Subscriptions overload during spikes. _Mitigation_: topic partitioning, fan‑out pools, backpressure with drop policies for non‑critical.
- R2: ZDM dual‑write divergence. _Mitigation_: write‑audit, consistency checks, canary cutovers.
- R3: Marketplace plugin security. _Mitigation_: signing + sandbox + policy class checks.

**Definition of Done**
- Multi‑cloud overlays run prod traffic (subset tenants) with cost parity dashboards; subscriptions enabled for pilot tenants meeting latency SLO; ZDM executed on one schema change with evidence; marketplace installs signed plugins; embeddings preview produces vectors + hybrid search integration; customer portal live for 2 tenants.

---

## Swimlanes
- **Lane A — Multi‑Cloud GA** (Platform + SRE)
- **Lane B — Realtime Subscriptions** (Backend + SRE)
- **Lane C — Zero‑Downtime Migrations** (Backend + QA)
- **Lane D — Connector Marketplace** (Backend + Security)
- **Lane E — Embeddings Preview** (DS + Backend)
- **Lane F — Customer Portal** (Frontend + SRE FinOps)
- **Lane G — QA & Evidence** (QA + MC)

---

## Backlog (Epics → Stories → Tasks) + RACI
Estimates in SP.

### EPIC A: Multi‑Cloud GA (30 SP)
- **A‑1** Production overlays & health checks (10 SP) — _Platform (R), SRE (A)_
  - AC: AWS/GCP overlays with parity; health endpoints and regional SLO boards.
- **A‑2** Cost parity dashboards (8 SP) — _SRE FinOps (R)_
  - AC: SKU‑normalized view; alert at 80% variance week‑over‑week.
- **A‑3** Failover playbook (6 SP) — _SRE (R)_
- **A‑4** Residency conformance suite (6 SP) — _QA (R), Sec (C)_

### EPIC B: Realtime Subscriptions (28 SP)
- **B‑1** Gateway → broker fan‑out (10 SP) — _Backend (R)_
  - AC: Socket.IO or WebSocket server with topic authZ.
- **B‑2** Backpressure & QoS (8 SP) — _Backend (R), SRE (C)_
  - AC: per‑tenant burst caps; 429 on subscribe flood; queue depth metrics.
- **B‑3** SLA dashboards (10 SP) — _SRE (R)_
  - AC: p50/p95 fan‑out, drops, reconnects; burn alerts.

### EPIC C: Zero‑Downtime Migrations (ZDM) (26 SP)
- **C‑1** Dual‑write shims + toggles (10 SP) — _Backend (R)_
- **C‑2** Read‑compat mapper (6 SP) — _Backend (R)_
- **C‑3** Cutover/rollback CLI + checks (10 SP) — _QA (R), Backend (C)_

### EPIC D: Connector Marketplace v0.9 (24 SP)
- **D‑1** Plugin registry & signing (10 SP) — _Backend (R), Sec (A)_
- **D‑2** Policy/TOS class checks (6 SP) — _Sec (R)_
- **D‑3** Install/enable UX (8 SP) — _Frontend (R)_

### EPIC E: Graph Embeddings Preview (28 SP)
- **E‑1** Embedding service + pgvector writer (12 SP) — _DS (R), Backend (C)_
- **E‑2** Cost caps & scheduler (8 SP) — _SRE (R)_
- **E‑3** Hybrid search integration (8 SP) — _Backend (R)_

### EPIC F: Customer Portal v0.9 (22 SP)
- **F‑1** SLA & usage dashboards (10 SP) — _Frontend (R), SRE (C)_
- **F‑2** Evidence bundle downloads (6 SP) — _Backend (R)_
- **F‑3** Notifications & webhooks (6 SP) — _SRE (R)_

### EPIC G: QA & Evidence v10 (12 SP)
- **G‑1** Federation compat under subs/ZDM (6 SP) — _QA (R)_
- **G‑2** Evidence bundle v10 (6 SP) — _MC (R)_

_Total_: **170 SP** (descope candidates: E‑3 or F‑3 if capacity < 150 SP).

---

## Architecture (Deltas)
```mermaid
flowchart LR
  subgraph Cloud A (AWS)
    GW_A[Gateway + Subgraphs]
    WS_A[WebSocket Fan-out]
  end
  subgraph Cloud B (GCP)
    GW_B[Gateway + Subgraphs]
    WS_B[WebSocket Fan-out]
  end
  Router[Cross-Cloud Router] <--> GW_A
  Router <--> GW_B
  GW_A --> Broker[(Broker/Streams)] --> WS_A
  GW_B --> BrokerB[(Broker/Streams)] --> WS_B
  subgraph Migrations
    ZDM[Dual-write Shim]
    MAP[Read-Compat Mapper]
  end
  GW_A --> ZDM --> DB[(PG/Neo4j)]
  ZDM --> DBv2[(PG/Neo4j vNext)]
  MAP --> GW_A
  subgraph Marketplace
    REG[Plugin Registry]
    SIGN[Signer]
  end
  REG --> SIGN
  subgraph Embeddings
    EMB[Embed Service]
    PVEC[pgvector]
  end
  EMB --> PVEC
  subgraph Portal
    PORT[Customer Portal]
    EVDL[Evidence Downloads]
  end
```

**ADR‑027**: Subscriptions via brokered fan‑out with strict QoS and tenant caps. _Trade‑off_: added infra vs realtime UX.

**ADR‑028**: ZDM dual‑write + read‑compat to avoid downtime. _Trade‑off_: complexity and temporary write amplification.

**ADR‑029**: Marketplace requires signed plugins + policy class validation. _Trade‑off_: slower onboarding vs safety.

**ADR‑030**: Embeddings are tenant‑opt‑in, cost‑capped, and never leak raw content (RAG‑safe). _Trade‑off_: limited recall vs privacy/cost.

---

## Data & Policy
**Plugin Registry (PG)**
```sql
CREATE TABLE plugins (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  policy_class TEXT NOT NULL CHECK (policy_class IN ('MIT-OK','Open-Data-OK','Restricted-TOS','Proprietary-Client','Embargoed')),
  signature BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

**ZDM Cutover Ledger (PG)**
```sql
CREATE TABLE zdm_cutovers (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  change_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('canary','rolling','rolled_back','complete')),
  report JSONB
);
```

**Embeddings Cap (Policy)**
```rego
package intelgraph.embeddings

max_cost_usd := 50

allow_job {
  input.tenant.monthly_embeddings_spend < max_cost_usd
}
```

---

## APIs & Schemas
**GraphQL — Subscriptions & ZDM**
```graphql
scalar DateTime

type EntityChange { id: ID!, type: String!, at: DateTime!, op: String!, actor: String }

type Subscription {
  entityChanged(tenantId: ID!, filter: JSON): EntityChange!
}

type Mutation {
  zdmCutover(changeId: ID!, mode: String!): Boolean @auth(abac: "admin.write")
}
```

**Marketplace REST**
```
POST /plugins        # upload signed plugin
POST /plugins/{id}/enable
GET  /plugins        # list
```

---

## Security & Privacy
- **AuthZ**: subscribe requires tenant scope and ABAC filter enforcement; per‑tenant rate limits.
- **Supply‑chain**: all marketplace artifacts signed; SBOM recorded.
- **Privacy**: embeddings store vectors only; no raw PII text kept; export redaction still enforced.

---

## Observability & SLOs
- New metrics: subscription fan‑out latency, backlog, drops; ZDM divergence rate; plugin enablement successes; embeddings job cost & throughput; portal download counts.
- Alerts: fan‑out p95 > 250 ms 10m; divergence > 0.01%; unsigned plugin upload attempt; embeddings spend > 80% cap.

---

## Testing Strategy
- **Unit**: backpressure/QoS; read‑compat mappers; plugin signature verify; embeddings cost caps.
- **Contract**: subscription authZ; marketplace API; zdm CLI.
- **E2E**: dual‑write → cutover → rollback; subgraph + subscriptions flow; embeddings → hybrid search; portal downloads.
- **Load**: 5k concurrent subs (pilot tenants); ZDM under 2× write rate; embeddings batch off‑peak.
- **Chaos**: broker partition; cutover mid‑failure (automatic rollback); corrupt plugin signature.

**Acceptance Packs**
- Subscriptions p95 ≤ 250 ms; drops < 1%; ABAC filters applied.
- ZDM: canary → rolling → complete with zero downtime; rollback works; divergence report = 0.
- Marketplace: unsigned plugin rejected; signed plugin enabled; policy class enforced.
- Embeddings preview: cost cap honored; vectors present; hybrid search improves MRR proxy metric on sample.

---

## CI/CD & IaC
```yaml
name: subs-zdm-marketplace
on: [push]
jobs:
  subs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:subs && npm run slo:check
  zdm:
    runs-on: ubuntu-latest
    steps:
      - run: npm run zdm:simulate && npm run zdm:checks
  marketplace:
    runs-on: ubuntu-latest
    steps:
      - run: npm run plugin:sign && npm run plugin:scan
```

**Terraform (realtime & caps)**
```hcl
module "realtime" {
  source = "./modules/realtime"
  max_connections = 5000
  per_tenant_burst = 200
}
```

---

## Code & Scaffolds
```
repo/
  realtime/
    server.ts
    qos.ts
  zdm/
    dualwrite.ts
    cutover.ts
  marketplace/
    api.ts
    signer.ts
  embeddings/
    service.ts
    writer.ts
  portal/
    pages/
      index.tsx
      sla.tsx
      evidence.tsx
```

**QoS (TS excerpt)**
```ts
export function tokenBucket(tenant:string){ /* burst + refill */ }
```

**Dual‑write Shim (TS excerpt)**
```ts
export async function upsertEntityBoth(a:any){ await writeV1(a); await writeV2(map(a)); }
```

**Plugin Signer (TS excerpt)**
```ts
export function sign(bytes:Buffer, key:string){ /* sha256 + sig */ }
```

---

## Release Plan & Runbooks
- **Staging cuts**: 2026‑02‑07, 2026‑02‑14.
- **Prod**: 2026‑02‑17 (canary 10→50→100%).

**Backout**
- Disable subscriptions for tenants (feature flags); abort ZDM and revert to v1; lock marketplace to installed‑only; pause embeddings jobs.

**Evidence Bundle v10**
- Multi‑cloud cost parity reports; subscription SLO dashboards; ZDM cutover logs; plugin signatures & SBOM; embeddings job logs; portal access logs; signed manifest.

---

## RACI (Consolidated)
| Workstream | R | A | C | I |
|---|---|---|---|---|
| Multi‑Cloud GA | Platform | Tech Lead | SRE | PM |
| Subscriptions | Backend | MC | SRE | PM |
| ZDM | Backend | MC | QA | PM |
| Marketplace | Backend | Sec TL | Security | PM |
| Embeddings | DS | MC | Backend, SRE | PM |
| Portal | Frontend | PM | SRE FinOps | All |
| QA & Evidence | QA | PM | MC | All |

---

## Open Items
1. Choose pilot tenants for subscriptions and embeddings preview.
2. Approve plugin policy classes + review workflow with Legal/Sec.
3. Identify first schema change to trial ZDM.

```

