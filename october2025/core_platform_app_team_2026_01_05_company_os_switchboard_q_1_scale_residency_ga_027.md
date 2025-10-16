# CorePlatform+AppTeam-2026-01-05-CompanyOS+Switchboard-q1-scale-residency-ga-027

**Sprint 27 (Jan 5 → Jan 16, 2026, America/Denver)**  
**Release Train:** Q1’26 “Scale & Residency” — Wave 1  
**Theme:** **Scale, Residency GA, and Partner Acceleration** — EU residency GA, SDKs & adapters v1, partner onboarding at scale, and aggressive cost/perf optimizations.

---

## 0) Sprint Goal & Exit Criteria (Joint)

**Goal:** Expand from 2 → 5 pilot/early partners with **EU residency GA**, **stable SDKs**, and **automated onboarding**, while improving p95 by 10% and cutting top cost driver by 10%.

**Exit Criteria (2026‑01‑16):**

- **Residency GA:** EU region fully supported (data path, evidence, purge); cross‑region blocks proven with receipts.
- **SDKs v1:** TS SDK stable (semver 1.0.0) with typed APIs & receipts helpers; Postman collection & contract tests green.
- **Adapters:** identity (OIDC), storage (S3/GCS), payments (stub) adapters shipped with receipts + policy hooks.
- **Partner Acceleration:** Partner Console supports bulk onboarding (CSV/JSON import) with receipts; 3 new tenants created.
- **Perf/Cost:** p95 on critical flows improved ≥ 10% vs Dec rollup; storage/evidence cost reduced ≥ 10% on pilots.
- **Operate:** dashboards/alerts updated; runbooks for residency & onboarding finalized; evidence bundle extended.

---

## 1) CompanyOS (Core Platform)

### EPIC A — Residency GA (EU)

- **A1. EU Residency Enforcement (GA)**  
  _Stories:_ policy bundle `2.1.0-eu`; KMS rotation; audit of cross‑region calls.  
  _Acceptance:_ residency conformance suite passes; receipts include region tags; public verifier green.
- **A2. Purge + Selective Disclosure (EU)**  
  _Stories:_ purge manifest per region; redaction map cache; export proving residency.  
  _Acceptance:_ purge demo in EU; redacted exports verified.

### EPIC B — SDKs & API Stability

- **B1. TypeScript SDK 1.0.0**  
  _Stories:_ stable types, retries/idempotency, receipts helpers, examples.  
  _Acceptance:_ contract tests pass vs OAS 0.27.0; examples compile; semver 1.0.0 tag.
- **B2. Postman & Contract Tests**  
  _Stories:_ Postman collection + Newman CI; negative tests.  
  _Acceptance:_ CI job green; report attached to evidence.

### EPIC C — Cost & Perf

- **C1. Evidence Compaction Tiering v2**  
  _Stories:_ policy‑aware tiering; cold storage handoff; manifest pointers.  
  _Acceptance:_ ≥ 10% storage reduction with verifier passing.
- **C2. Graph Hotpath — Plan Cache+**  
  _Stories:_ TTL tuning; cross‑tenant isolation; pre‑materialized projections.  
  _Acceptance:_ 3‑hop p95 improved by ≥ 10% vs December.

---

## 2) Switchboard (App Team)

### EPIC D — Partner Console v1.1 (Bulk Onboarding)

- **D1. Bulk Tenant Import**  
  _Stories:_ CSV/JSON upload; validation; dry‑run; transactional create; receipts.  
  _Acceptance:_ create 3 tenants via import; all steps logged with receipts.
- **D2. Policy Profile & Theme Packs at Scale**  
  _Stories:_ batch apply; diff/preview; rollback bundles.  
  _Acceptance:_ batch apply works; rollback receipts captured.

### EPIC E — UX & Approvals Polish

- **E1. Reviewer Efficiency**  
  _Stories:_ keyboard actions, quick templates, SLA badges.  
  _Acceptance:_ time‑to‑decision median improves ≥ 10%.
- **E2. Residency Hints**  
  _Stories:_ inline residency indicators on entities; blocked actions show reason.  
  _Acceptance:_ correct messaging + links to docs.

---

## 3) Definition of Done (Both)

- Spec/OAS updated; SDK & Postman synced; policy bundle diff + coverage reports.
- Unit/integration/e2e/load tests green; perf gates enforced; contract tests green.
- Evidence bundle updated (residency conformance, purge receipts, SDK tests, cost/perf deltas).
- Dashboards/alerts tuned; runbooks current; Helm/Terraform merged; release notes drafted.

---

## 4) Artifacts, Collateral, Scaffolds

### 4.1 OpenAPI (OAS) — 0.27.0 key diffs (YAML excerpt)

```yaml
info: { title: CompanyOS API, version: 0.27.0 }
paths:
  /residency/prove:
    post: { summary: Export residency proof bundle for tenant }
  /tenants/bulk-import:
    post: { summary: Create tenants from CSV/JSON, dry‑run supported }
  /receipts/verify:
    post: { summary: Verify receipts bundle (server‑side) }
```

### 4.2 TypeScript SDK (snippets)

```ts
// packages/sdk-ts/src/index.ts
export * from './client';
export * from './types';
// Receipts helper
export async function withReceipt<T>(fn: () => Promise<T>) {
  const res = await fn();
  // attach last-receipt-id from header for audit linking
  return res;
}
```

### 4.3 Postman Collection (fragment)

```json
{
  "info": {
    "name": "CompanyOS 0.27.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Residency Proof",
      "request": { "method": "POST", "url": "/residency/prove" }
    },
    {
      "name": "Bulk Import",
      "request": { "method": "POST", "url": "/tenants/bulk-import" }
    }
  ]
}
```

### 4.4 Rego — Residency GA

```rego
package residency

default allow = false

allow {
  input.user.region == input.resource.region
}

block_cross_region {
  input.user.region != input.resource.region
}
```

### 4.5 Terraform — EU GA Modules

```hcl
module "eu_notary" { source = "./modules/notary" region = "eu-west-1" key_alias = "eu-receipts" }
module "eu_cold_storage" { source = "./modules/storage-cold" region = "eu-west-1" lifecycle_days = 30 }
```

### 4.6 Helm Values (0.27.0)

```yaml
companyos:
  image.tag: 0.27.0
  residency:
    enforce: true
    regions: ['us-east-1', 'eu-west-1']
  evidence:
    compaction:
      tiering: v2
switchboard:
  image.tag: 0.27.0
  partnerConsole:
    bulkImport: true
  approvals:
    reviewerHotkeys: true
```

### 4.7 Grafana Panels (JSON sketch)

```json
{
  "title": "Q1 Scale & Residency",
  "panels": [
    {
      "type": "stat",
      "title": "Critical p95 (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(flow_latency_ms_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "type": "graph",
      "title": "Storage Cost — Pilots",
      "targets": [
        { "expr": "sum(tenant_storage_cost_estimate_usd) by (tenant)" }
      ]
    },
    {
      "type": "stat",
      "title": "Bulk Imports Succeeded",
      "targets": [{ "expr": "increase(tenants_bulk_import_success_total[1d])" }]
    }
  ]
}
```

### 4.8 Prometheus Alerts

```
- alert: CrossRegionAttempt
  expr: increase(residency_cross_region_block_total[5m]) > 0
  for: 0m
  labels: { severity: warning }
  annotations: { summary: "Cross‑region attempt blocked" }

- alert: BulkImportFailures
  expr: rate(tenants_bulk_import_failed_total[15m]) > 0
  for: 15m
  labels: { severity: critical }
  annotations: { summary: "Bulk import failures detected" }
```

### 4.9 Runbooks

```md
# Residency Proof Export

1. Call /residency/prove; verify signature; attach to evidence.
2. Attempt cross‑region write (negative test); confirm block + receipt.

# Bulk Onboarding

1. Upload CSV/JSON; dry‑run; resolve errors.
2. Execute import; verify receipts + policies applied; email invites sent.
```

### 4.10 Evidence Manifest

```yaml
bundle:
  version: 0.27.0
  residency_ga: s3://evidence/residency/eu-ga/2026-01-16/*.json
  sdk_contract_tests: s3://evidence/qa/sdk-ts-1.0.0/*.json
  cost_perf_deltas: s3://evidence/finops/2026-01/*.json
  sbom: s3://artifacts/sbom/*-0.27.0.spdx.json
  attestations: s3://artifacts/slsa/*-0.27.0.intoto.jsonl
```

### 4.11 Release Notes Template 0.27.0

```md
# 0.27.0 — Q1 Scale & Residency

**Residency:** EU GA with purge + proof exports.
**SDKs:** TypeScript 1.0.0, Postman + contract tests.
**Partners:** bulk onboarding via Partner Console.
**Ops:** p95 –10%, storage –10% on pilots.
```

---

## 5) Milestones & Dates

- **2026‑01‑05 Mon:** Kickoff; policy bundle 2.1.0‑eu published; SDK 1.0.0 RC cut.
- **2026‑01‑08 Thu:** Residency conformance demo; compaction v2 enabled on pilots.
- **2026‑01‑13 Tue:** Bulk onboarding demo (3 tenants); perf/cost checkpoint.
- **2026‑01‑16 Fri:** Exit review; evidence bundle finalized; release notes cut.

---

## 6) RASCI

- **Responsible:** Core Platform (residency, SDKs, perf/cost), App Team (Partner Console, approvals UX), SRE (dashboards/alerts)
- **Accountable:** Product Leads
- **Support:** Design, Finance, Legal/DPO, Partner Success
- **Consulted:** Compliance, Exec
- **Informed:** All Hands

---

## 7) Acceptance Test Checklist

- [ ] Residency GA suite passes; cross‑region blocks verified
- [ ] TS SDK 1.0.0 contract tests green; examples compile
- [ ] Bulk import creates 3 tenants with receipts
- [ ] p95 improved ≥ 10%; storage cost –10% on pilots
- [ ] Dashboards/alerts updated; runbooks finalized

---

## 8) Packaging & Delivery

- Charts: `ops/helm/*-0.27.0`
- Terraform: EU GA modules (notary, cold storage)
- Seeds: bulk import samples, residency fixtures
- Evidence: residency GA, SDK tests, cost/perf deltas
- Screens/Docs: Partner Console bulk import, residency proof UI
