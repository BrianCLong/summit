```markdown
---
slug: intelgraph-mc-sprint-2026-04-15
version: v1.0
created: 2025-09-29
sprint_window: 2026-04-15 → 2026-04-28 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2026‑04‑15 → 2026‑04‑28)

> **Mission (Sprint N+14)**: Monetize and harden the platform: **Marketplace Billing v1.0 (external)**, **Customer Trust Portal v1.0**, **SDKs v1.1** (typed clients + retries + telemetry), **AIOps Anomaly Preview** for ingest/GraphQL, **Residency Audit Reports**, and **Accessibility/Localization pass**—all within SLOs and cost guardrails. Evidence bundle v15 included.

## Conductor Summary (Commit)
**Builds on** 2026‑04‑01 sprint (Policy v2 GA, Query Budgets GA, Contracts v1.0, Audit Lake, Upgrade Cycle, PenTest fixes).

**Goals**
1. **Marketplace Billing v1.0**: external billing gateway integration (Stripe test mode) for paid connectors/plugins with usage‑based pricing; signed invoices.
2. **Customer Trust Portal v1.0**: tenant‑visible SLO, security, privacy & compliance status; downloadable evidence snapshots.
3. **SDKs v1.1**: stronger typing, persisted‑ID helpers, built‑in retries/backoff, telemetry hooks, and example apps.
4. **AIOps Anomaly Detection (Preview)**: detect spikes in ingest lag, API p95, error rate; route to incident templates.
5. **Residency Audit Reports**: per‑dataset residency compliance + export history; quarterly attestation PDF.
6. **A11y & i18n pass**: WCAG 2.2 AA fixes and localization framework for EN/ES initial.

**Non‑Goals**
- Marketplace revenue share contracts; production live payments; deep ML anomaly models.

**Constraints**
- SLOs unchanged; trust portal must only expose metadata & proofs (no sensitive data).
- Cost guardrails unchanged; billing runs in test/sandbox.

**Risks**
- R1: Billing edge cases on refunds/voids. _Mitigation_: test mode only + reconciliation job.
- R2: AIOps false positives. _Mitigation_: debounce windows + multi‑signal consensus.
- R3: A11y scope creep. _Mitigation_: prioritize critical WCAG AA failures only.

**Definition of Done**
- Marketplace items can be priced and “purchased” (test mode) with signed invoice & SBOM; trust portal live for 2 tenants; SDKs v1.1 published with examples; anomaly preview raises actionable alerts feeding incident workflows; residency audit PDFs generated; A11y AA checks pass on key pages.

---

## Swimlanes
- **Lane A — Marketplace Billing** (Backend + Security + Frontend)
- **Lane B — Trust Portal** (Frontend + SRE + Security)
- **Lane C — SDKs v1.1** (Frontend + Backend)
- **Lane D — AIOps Anomaly Preview** (SRE + DS)
- **Lane E — Residency Audits** (Security + Backend)
- **Lane F — A11y & i18n** (Frontend + QA)
- **Lane G — QA & Evidence** (QA + MC)

---

## Backlog (Epics → Stories → Tasks) + RACI
Estimates in SP.

### EPIC A: Marketplace Billing v1.0 (32 SP)
- **A‑1** Stripe test‑mode integration + webhooks (12 SP) — _Backend (R), Sec (C)_
  - AC: create checkout, receive events, sign invoice PDFs; sandbox keys.
- **A‑2** Pricing & metering bridge (10 SP) — _SRE FinOps (R)_
  - AC: map plugin usage → line items; reconcile daily.
- **A‑3** Admin UI & receipts (10 SP) — _Frontend (R)_

### EPIC B: Customer Trust Portal v1.0 (28 SP)
- **B‑1** SLO & uptime tiles (8 SP) — _SRE (R)_
- **B‑2** Security/Privacy status & docs (10 SP) — _Security (R), MC (C)_
- **B‑3** Evidence snapshot downloads (10 SP) — _Backend (R)_

### EPIC C: SDKs v1.1 (26 SP)
- **C‑1** Type‑safe clients & PQ helpers (10 SP) — _Frontend (R)_
- **C‑2** Retries/backoff + telemetry hooks (8 SP) — _Backend (R)_
- **C‑3** Examples & docs (8 SP) — _Frontend (R), PM (C)_

### EPIC D: AIOps Anomaly Preview (26 SP)
- **D‑1** Signals & detectors (EWMA/seasonal) (10 SP) — _DS (R)_
- **D‑2** Alert routing to incident templates (8 SP) — _SRE (R)_
- **D‑3** Dashboard & tuning (8 SP) — _SRE (R)_

### EPIC E: Residency Audit Reports (22 SP)
- **E‑1** Export history & dataset residency join (8 SP) — _Backend (R)_
- **E‑2** Attestation PDF generator (8 SP) — _Backend (R), Sec (C)_
- **E‑3** Admin scheduling & delivery (6 SP) — _Frontend (R)_

### EPIC F: Accessibility & i18n (18 SP)
- **F‑1** WCAG 2.2 AA fix pack (10 SP) — _Frontend (R), QA (C)_
- **F‑2** i18n framework + ES locale (8 SP) — _Frontend (R)_

### EPIC G: QA & Evidence v15 (12 SP)
- **G‑1** Billing/trust portal acceptance packs (6 SP) — _QA (R)_
- **G‑2** Evidence bundle v15 (6 SP) — _MC (R)_

_Total_: **164 SP** (descope: D‑3 or F‑2 if capacity < 145 SP).

---

## Architecture (Deltas)
```mermaid
flowchart LR
  subgraph Marketplace
    REG[Plugin Registry]
    BILL[Billing Gateway (Stripe test)]
    REC[Reconcile Job]
  end
  REG --> BILL
  BILL --> REC
  subgraph Trust Portal
    TP[Portal UI]
    SLO[SLO Metrics API]
    EVC[Evidence Catalog]
  end
  SLO --> TP
  EVC --> TP
  subgraph SDKs
    JS[SDK JS v1.1]
    PY[SDK Py v1.1]
  end
  subgraph AIOps
    SIG[Signals]
    DET[Detectors]
    INC[Incident Templates]
  end
  SIG --> DET --> INC
  subgraph Residency
    AUD[Residency Auditor]
    PDF[PDF Generator]
  end
  AUD --> PDF
```

**ADR‑043**: Billing in test mode only; invoices signed and stored in audit lake. _Trade‑off_: no real payments vs end‑to‑end flow confidence.

**ADR‑044**: AIOps uses simple EWMA/seasonal detectors for preview; no PII in features. _Trade‑off_: lower accuracy vs fast value.

**ADR‑045**: Trust portal exposes only metadata & proofs; links to evidence snapshots. _Trade‑off_: less detail vs safety.

---

## Data & Policy
**Billing (PG)**
```sql
CREATE TABLE marketplace_orders (
  order_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  plugin_id UUID NOT NULL,
  price_usd NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('created','paid','void','refunded')),
  stripe_session TEXT,
  invoice_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Residency Audit (PG)**
```sql
CREATE VIEW residency_audit AS
SELECT d.dataset_id, d.region, e.export_id, e.dest_region, e.when, (d.region = e.dest_region) AS compliant
FROM datasets d LEFT JOIN exports e ON d.dataset_id = e.dataset_id;
```

**Policy (Rego) — Trust Portal content**
```rego
package intelgraph.trust

allow_publish(item) {
  item.category == "slo"; item.contains_pii == false
} else {
  item.category == "evidence"; item.hash != ""; item.signature != ""
}
```

---

## APIs & Schemas
**GraphQL — Trust & Billing**
```graphql
scalar DateTime

type Invoice { id: ID!, amountUSD: Float!, createdAt: DateTime!, uri: String! }

type TrustTile { kind: String!, status: String!, updatedAt: DateTime! }

type Query {
  trustTiles: [TrustTile!]! @auth(abac: "trust.read")
  invoices: [Invoice!]! @auth(abac: "billing.read")
}

type Mutation {
  createCheckout(pluginId: ID!): String! @auth(abac: "billing.write")
  downloadEvidenceBundle(version: String!): String! @auth(abac: "trust.read")
}
```

**SDK Telemetry (JSON)**
```json
{ "opId":"getEntity:v1", "durationMs": 142, "status": 200, "retries": 1 }
```

---

## Security & Privacy
- **Billing**: webhook signature verification; invoices signed; PII minimized (tokenized customer IDs); test mode only.
- **Trust Portal**: all files from audit lake; no raw data; signed URLs expire.
- **AIOps**: metrics only; no payloads; alerts require human ack.

---

## Observability & SLOs
- Metrics: billing success rate, webhook latency, SDK retry counts, anomaly alerts/day, residency compliance %, A11y violations.
- Alerts: webhook failures; anomaly storm; residency non‑compliance spike; A11y regression > threshold.

---

## Testing Strategy
- **Unit**: webhook verify; invoice signer; SDK retry/backoff; detector math; PDF generator.
- **Contract**: billing API, trust portal queries, evidence downloads, residency audit view.
- **E2E**: plugin checkout → webhook → invoice; trust portal render + evidence download; anomaly alert → incident template; residency PDF scheduled export.
- **Load**: 100 checkouts in burst (test mode); trust portal 50 RPS; detectors on 30‑day metric windows.
- **Chaos**: dropped webhook events (replay job); audit lake temporary outage; detector false positive inject.

**Acceptance Packs**
- Billing: signed invoice stored; reconcile matches usage bridge.
- Trust: tiles reflect SLOs; evidence downloads work; policy allows only safe artifacts.
- SDKs: telemetry emitted; retries bounded; types generated from SDL.
- AIOps: alerts debounced; routed to incident templates with context.
- Residency: PDF lists violations/compliance; delivered to admins; quarterly schedule created.
- A11y: WCAG 2.2 AA checks pass on key flows.

---

## CI/CD & IaC
```yaml
name: billing-trust-sdk-aiops-residency
on: [push]
jobs:
  billing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run billing:test && npm run billing:webhook:verify
  trust:
    runs-on: ubuntu-latest
    steps:
      - run: npm run trust:evidence && npm run trust:lint
  sdks:
    runs-on: ubuntu-latest
    steps:
      - run: npm run sdk:build && npm run sdk:types && npm run sdk:test
  aiops:
    runs-on: ubuntu-latest
    steps:
      - run: npm run aiops:detect:simulate && npm run aiops:alerts:test
  residency:
    runs-on: ubuntu-latest
    steps:
      - run: npm run residency:audit && npm run residency:pdf:test
```

**Terraform (trust portal & billing secrets)**
```hcl
module "trust_portal" {
  source = "./modules/portal"
  domain = "trust.intelgraph.example"
  signed_urls = true
}

module "billing" {
  source = "./modules/billing"
  stripe_mode = "test"
  webhook_secret = var.stripe_webhook_secret
}
```

---

## Code & Scaffolds
```
repo/
  marketplace/billing/
    api.ts
    webhook.ts
    invoice.ts
  trust/portal/
    pages/index.tsx
    api.ts
  sdks/js/
    src/client.ts
    src/persisted.ts
  sdks/python/
    intelgraph/client.py
  aiops/
    signals.ts
    detectors.ts
    router.ts
  residency/
    audit.sql
    pdf.ts
  a11y/
    checks.yml
    fixes/
```

**Webhook Verify (TS excerpt)**
```ts
app.post('/stripe/webhook', verifyStripeSig, async (req,res)=>{ /* update order, store invoice */ });
```

**SDK Retry (TS excerpt)**
```ts
async function execWithRetry(fetcher, retries=2){ /* jitter, backoff, emit telemetry */ }
```

**Detector (TS excerpt)**
```ts
export function ewma(series:number[], alpha=0.3){ /* ... */ }
```

---

## Release Plan & Runbooks
- **Staging cuts**: 2026‑04‑18, 2026‑04‑25.
- **Prod**: 2026‑04‑28 (canary 10→50→100%).

**Backout**
- Disable checkout; trust portal read‑only; revert SDKs to v1.0; mute anomaly alerts; pause residency PDF scheduler.

**Evidence Bundle v15**
- Billing flows (test) with signed invoices; trust tiles & evidence links; SDKs v1.1 SHAs; anomaly alerts + incident trails; residency reports; A11y checklist; signed manifest.

---

## RACI (Consolidated)
| Workstream | R | A | C | I |
|---|---|---|---|---|
| Marketplace Billing | Backend | Sec TL | SRE FinOps, Frontend | PM |
| Trust Portal | Frontend | Tech Lead | SRE, Security | PM |
| SDKs v1.1 | Frontend | MC | Backend | PM |
| AIOps Preview | SRE | MC | DS | PM |
| Residency Audits | Backend | Sec TL | Security | PM |
| A11y & i18n | Frontend | QA Lead | PM | All |
| QA & Evidence | QA | PM | MC | All |

---

## Open Items
1. Confirm plugin pricing models with PM/Finance (test only).
2. Approve trust portal content categories with Legal/Security.
3. Select tenants for AIOps preview and trust portal pilot.

```

