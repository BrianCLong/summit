# CorePlatform+AppTeam-2026-01-19-CompanyOS+Switchboard-adapters-marketplace-scale-028

**Sprint 28 (Jan 19 → Jan 30, 2026, America/Denver)**  
**Release Train:** Q1’26 “Scale & Residency” — Wave 2  
**Theme:** **Adapters & Marketplace at Scale** — productionize external adapters, expand runbook marketplace, deepen policy proofs, and drive 15% perf/cost gains.

---

## 0) Joint Sprint Goal & Exit Criteria

**Goal:** Ship adapter suite v1 (identity/storage/payments/notifications) with **signed receipts**, expand the **Runbook Marketplace** with verified packages, and improve **p95 by 10%** + **storage cost by 10%** across pilots while preserving residency and policy guarantees.

**Exit Criteria (2026‑01‑30):**

- **Adapters v1:** OIDC (IdP), S3/GCS/Azure (storage), Stripe‑stub (payments), SES/Sendgrid (notifications) — all with policy hooks & receipts; conformance tests green.
- **Marketplace v1.1:** install/update/rollback channels; signature + SBOM verification; tenant‑scoped catalogs; receipts emitted.
- **Perf/Cost:** 3‑hop graph p95 improved ≥ 10% vs Sprint 27 baseline; evidence storage –10% on pilots.
- **Residency/Compliance:** region enforcement unchanged; adapter I/O respects residency & logs proof receipts.
- **Operate:** dashboards/alerts cover adapters & marketplace; runbooks published; evidence bundle extended.

---

## 1) CompanyOS — Work Breakdown

### EPIC A — Adapter Framework & Conformance

- **A1. Adapter SDK + Contracts**  
  _Stories:_ adapter interface, lifecycle hooks, policy preflight; receipts helper.  
  _Acceptance:_ sample adapter passes contract tests; receipts contain adapter hash & policy decision.
- **A2. Storage Adapters (S3/GCS/Azure)**  
  _Stories:_ signed upload/download; residency gate; checksum receipts.  
  _Acceptance:_ cross‑region attempts blocked; checksum in receipts; throughput ≥ 200 MB/s in staging lane.
- **A3. Identity (OIDC) Adapter**  
  _Stories:_ claims → attributes mapping; JIT provisioning; role/risk attributes.  
  _Acceptance:_ ABAC attributes resolvable ≤ 50ms; simulator proves deny‑by‑default paths.
- **A4. Payments (Stripe‑stub) Adapter**  
  _Stories:_ tokenization, invoice sync stub, event webhooks; receipts on plan changes.  
  _Acceptance:_ draft invoice lines reconcile to FinOps; dual‑control on plan upgrades.

### EPIC B — Perf & Cost Pass (Graph/Provenance)

- **B1. Graph Projection Cache v2**  
  _Stories:_ materialized projections for common queries; TTL + invalidation metrics.  
  _Acceptance:_ 3‑hop p95 improved ≥ 10%; cache hit ≥ 92% on pilots.
- **B2. Evidence Compaction v2.1**  
  _Stories:_ larger block size; delta encoding; policy‑aware pruning.  
  _Acceptance:_ evidence storage –10% with verifier green.

---

## 2) Switchboard — Work Breakdown

### EPIC C — Runbook Marketplace v1.1

- **C1. Channel Management (stable/canary)**  
  _Stories:_ channel pin; update preview; rollback receipts.  
  _Acceptance:_ switch channels without downtime; SBOM + signature check enforced.
- **C2. Tenant‑Scoped Catalogs**  
  _Stories:_ per‑tenant allowlist; policy presets per runbook.  
  _Acceptance:_ non‑allowlisted runbooks blocked with policy reason.

### EPIC D — Adapter Ops UX

- **D1. Adapter Registry UI**  
  _Stories:_ list adapters, health, versions, residency status; install/uninstall; receipts.  
  _Acceptance:_ install emits receipt; health panel shows recent failures.
- **D2. Notifications Adapter**  
  _Stories:_ SES/Sendgrid wiring; template variables; selective disclosure of PII.  
  _Acceptance:_ test emails logged with redacted receipts; bounce/complaint webhooks handled.

---

## 3) Definition of Done (Both)

- Spec/OAS diffs; policy bundle changes; contract tests & coverage reports archived.
- Unit/integration/e2e/load tests green; perf gates enforced; adapter conformance green.
- Evidence bundle updated (adapter proofs, marketplace signatures, perf/cost deltas); public verifier passes.
- Dashboards & alerts updated; runbooks written; Helm/Terraform merged; release notes drafted.

---

## 4) Artifacts, Collateral, Scaffolds

### 4.1 OpenAPI (OAS) — Adapters & Marketplace (excerpt)

```yaml
paths:
  /adapters:
    get: { summary: List installed adapters }
    post: { summary: Install adapter from registry }
  /adapters/{id}/uninstall:
    post: { summary: Uninstall adapter }
  /marketplace/runbooks:
    get: { summary: List runbooks (tenant‑scoped) }
  /marketplace/runbooks/{id}/install:
    post: { summary: Install runbook with channel pin }
```

### 4.2 TypeScript — Adapter Interface (snippet)

```ts
export interface AdapterContext {
  tenant: string;
  region: string;
  userId: string;
}
export interface AdapterReceiptMeta {
  adapterHash: string;
  version: string;
}
export interface StorageAdapter {
  put(
    key: string,
    bytes: Uint8Array,
    ctx: AdapterContext,
  ): Promise<{ receipt: AdapterReceiptMeta }>;
  get(
    key: string,
    ctx: AdapterContext,
  ): Promise<{ data: Uint8Array; receipt: AdapterReceiptMeta }>;
}
```

### 4.3 Rego — Residency Guard for Adapters

```rego
package adapters.residency

deny {
  input.ctx.region != input.resource.region
}
```

### 4.4 Contract Tests (pseudo‑CLI)

```
adapter-test run --kind storage --impl packages/adapters/s3 --matrix tests/storage-matrix.yaml --evidence ./artifacts/adapter-s3.json
```

### 4.5 Grafana Panels (JSON sketch)

```json
{
  "title": "Adapters & Marketplace",
  "panels": [
    {
      "type": "stat",
      "title": "Adapter Errors (5m)",
      "targets": [
        { "expr": "sum(rate(adapter_errors_total[5m])) by (adapter)" }
      ]
    },
    {
      "type": "graph",
      "title": "Runbook Installs/sec",
      "targets": [{ "expr": "sum(rate(runbook_install_total[1m]))" }]
    },
    {
      "type": "stat",
      "title": "Graph 3‑hop p95 (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(graph_3hop_ms_bucket[5m])) by (le))"
        }
      ]
    }
  ]
}
```

### 4.6 Prometheus Alerts

```
- alert: AdapterErrorSpike
  expr: sum(rate(adapter_errors_total[5m])) by (adapter) > 5
  for: 10m
  labels: { severity: warning }
  annotations: { summary: "Adapter error spike" }

- alert: MarketplaceSignatureFail
  expr: increase(marketplace_signature_fail_total[10m]) > 0
  for: 0m
  labels: { severity: critical }
  annotations: { summary: "Runbook signature verification failed" }
```

### 4.7 Helm/Terraform (0.28.0 bumps)

```yaml
companyos:
  image.tag: 0.28.0
  adapters:
    enabled: true
switchboard:
  image.tag: 0.28.0
  marketplace:
    channels: ['stable', 'canary']
```

```hcl
module "adapter_registry" { source = "./modules/registry" backend = "s3" index_bucket = "adapters-index" }
module "notifications" { source = "./modules/notifications" providers = ["ses","sendgrid"] }
```

### 4.8 Runbooks

```md
# Install Storage Adapter (S3)

1. Upload package; verify signature & SBOM.
2. Apply residency policy; dry‑run contract tests.
3. Install; smoke test put/get; receipts verified.

# Runbook Channel Switch

1. Preflight policy; preview diff; pin channel.
2. Switch to canary; monitor errors; roll forward/back as needed.
```

### 4.9 Evidence Manifest

```yaml
bundle:
  version: 0.28.0
  adapters: s3://evidence/adapters/2026-01-30/*.json
  marketplace: s3://evidence/marketplace/2026-01-30/*.json
  perf_cost: s3://evidence/finops/2026-01/*.json
  sbom: s3://artifacts/sbom/*-0.28.0.spdx.json
  attestations: s3://artifacts/slsa/*-0.28.0.intoto.jsonl
```

### 4.10 Release Notes Template 0.28.0

```md
# 0.28.0 — Adapters & Marketplace at Scale

**Adapters:** storage(OOS), identity(OIDC), notifications(SES/Sendgrid), payments(stub) with receipts.
**Marketplace:** channels, tenant‑scoped catalogs, signed packages.
**Perf/Cost:** 3‑hop p95 –10%; evidence storage –10% on pilots.
```

---

## 5) Milestones & Dates

- **2026‑01‑19 Mon:** Kickoff; adapter framework merged; registry provisioned.
- **2026‑01‑22 Thu:** Storage + OIDC adapters conformance green; marketplace channels demo.
- **2026‑01‑27 Tue:** Notifications + payments stub wired; perf/cost checkpoint.
- **2026‑01‑30 Fri:** Exit review; evidence bundle finalized; release notes cut.

---

## 6) RASCI

- **Responsible:** Core Platform (adapters/perf), App Team (marketplace/UX), SRE (registry/alerts), Security (signing/attestations)
- **Accountable:** Product Leads
- **Support:** Design, FinOps, Partner Success, Legal/DPO
- **Consulted:** Compliance, Exec
- **Informed:** All Hands

---

## 7) Acceptance Test Checklist

- [ ] Adapters pass contract tests; receipts contain hash & policy link
- [ ] Marketplace installs/updates/rollbacks verified; signatures & SBOMs checked
- [ ] 3‑hop p95 –10% vs baseline; evidence cost –10%
- [ ] Dashboards/alerts cover adapters & marketplace
- [ ] Runbooks current; evidence bundle verifies

---

## 8) Packaging & Delivery

- Charts: `ops/helm/*-0.28.0`
- Terraform: adapter registry, notifications modules
- Seeds: adapter examples, marketplace catalog entries
- Evidence: adapter/marketplace proofs, perf/cost deltas, SBOM/SLSA
- Screens/Docs: registry UI, channel switch demo, perf graphs
