# CorePlatform+AppTeam-2025-12-01-CompanyOS+Switchboard-ga-launch-025
**Sprint 25 (Dec 1 → Dec 12, 2025, America/Denver)**  
**Release Train:** Q4’25 “Foundations GA” — Launch  
**Theme:** **GA Launch Readiness** — finalize SLO proofs, close compliance pack, billable usage → invoices, and partner‑ready white‑label.

---
## 0) Sprint Goal & Exit Criteria (Joint)
**Goal:** Cut a GA candidate (0.25.0) for CompanyOS + Switchboard ready for first paying partners.

**Exit Criteria (2025‑12‑12):**
- **SLOs:** p95 critical flows < 1.5s, p99 error < 0.5% across 2 pilot tenants for 7 consecutive days.
- **Compliance:** Evidence bundle complete (SBOM, SLSA, policy conformance ≥ 95%, DR receipts, purge manifest, data residency proof).
- **Billing:** billable usage finalized; **Invoices v1** generated (PDF + JSON) with line‑item receipts; export to accounting stub.
- **White‑label:** theme/profile import verified; per‑tenant branding applied without redeploy.
- **Security:** unsigned images blocked in prod; dual‑control deletes enforced; selective disclosure validated by audit.
- **Operate:** runbooks current; dashboards & alerts tuned; on‑call ready; pricing tiers and ToS links surfaced.

---
## 1) CompanyOS (Core Platform)
### EPIC A — SLO Proof & Perf Hardening
- **A1. Perf budget locks**  
  *Stories:* freeze hot paths, guardrails in CI; perf regression blocker.  
  *Acceptance:* perf gate blocks PRs > +10% latency on golden queries.
- **A2. Resiliency drills**  
  *Stories:* chaos tests (broker loss, clock skew), backpressure tuning.  
  *Acceptance:* no SLO breach > 10m; alerts/auto‑rollback exercised.

### EPIC B — Billing & Invoices v1
- **B1. Usage Finalization**  
  *Stories:* cut‑off window, reconciliation, corrections receipt.  
  *Acceptance:* zero dangling events; corrections logged with receipts.
- **B2. Invoice Generation & Export**  
  *Stories:* taxes placeholders, cost centers, accounting export (CSV/JSON).  
  *Acceptance:* invoices generated for pilots; export validates against schema.

### EPIC C — Compliance & Purge
- **C1. Purge Manifest (verifiable)**  
  *Stories:* request → plan → dual‑control execute → receipt chain.  
  *Acceptance:* end‑to‑end purge demo; public verifier passes.
- **C2. Residency & Sharding Report**  
  *Stories:* residency proofs (region tags), shard map export.  
  *Acceptance:* report bundled; auditor checklist ticks.

---
## 2) Switchboard (App Team)
### EPIC D — Approvals & Admin UX (GA polish)
- **D1. Reviewer UX polish**  
  *Stories:* queue filters, bulk actions w/ policy preflight, rationale templates nits.  
  *Acceptance:* time‑to‑decision median improves ≥ 15% vs last sprint.
- **D2. Partner Console GA**  
  *Stories:* invite flow, API keys rotation, audit timeline deep‑links.  
  *Acceptance:* tenant onboarding runbook completes in < 15m.

### EPIC E — White‑Label & Docs
- **E1. Theme/Brand QA**  
  *Stories:* contrast checks, token snapshot tests.  
  *Acceptance:* theme tests pass; AA contrast met for default.
- **E2. Admin Guides & ToS surfacing**  
  *Stories:* inline help, link ToS/pricing, copy review.  
  *Acceptance:* docs shipped as code, linked from app footer.

---
## 3) Definition of Done (Both)
- Spec/OPA bundle diffs committed; coverage reports archived.
- Unit/integration/e2e/load tests green; perf gates enforced.
- Evidence bundle updated; receipts verified; selective disclosure checked.
- Dashboards/alerts tuned; SLO probe traces attached.
- Helm/Terraform, feature flags/ramp plans merged; release notes drafted.

---
## 4) Artifacts, Collateral, Scaffolds
### 4.1 OpenAPI (OAS) — Billing & Evidence (excerpt)
```yaml
paths:
  /finops/close-period:
    post: { summary: Finalize usage for billing period }
  /finops/invoices:
    post: { summary: Create invoice for tenant+period }
    get:  { summary: List invoices }
  /evidence/bundle:
    get:  { summary: Download current evidence bundle manifest }
```

### 4.2 Invoice JSON Schema (v1)
```json
{
  "$schema":"http://json-schema.org/draft-07/schema#",
  "title":"Invoice",
  "type":"object",
  "required":["id","tenant","period","lines","total"],
  "properties":{
    "id":{"type":"string"},
    "tenant":{"type":"string"},
    "period":{"type":"string"},
    "lines":{"type":"array","items":{"type":"object","required":["sku","qty","unit","price","subtotal","receipt_id"]}},
    "total":{"type":"number"},
    "currency":{"type":"string","default":"USD"}
  }
}
```

### 4.3 Rego — Dual‑Control & Corrections
```rego
package billing.controls

default allow_update = false

allow_update {
  input.action == "invoice.correction"
  count({r | r := input.user.roles[_]; r == "Finance"}) > 0
  input.approvals >= 2
}
```

### 4.4 Terraform & Helm (0.25.0 bumps)
```hcl
module "accounting_export" { source = "./modules/export" sink = "s3://accounting/exports" }
```
```yaml
companyos:
  image.tag: 0.25.0
  billing:
    closeWindowMinutes: 15
switchboard:
  image.tag: 0.25.0
  partnerConsole:
    invites: true
```

### 4.5 Dashboards (Grafana JSON sketch)
```json
{
  "title":"GA — Perf/Billing/Compliance",
  "panels":[
    {"type":"stat","title":"Critical p95 (ms)","targets":[{"expr":"histogram_quantile(0.95, sum(rate(flow_latency_ms_bucket{flow=~\"(graph_3hop|approval|runbook_step)\"}[5m])) by (le))"}]},
    {"type":"stat","title":"p99 Error Rate","targets":[{"expr":"sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"}]},
    {"type":"graph","title":"Invoice Drafts/day","targets":[{"expr":"sum(rate(invoices_created_total[1h]))"}]}
  ]
}
```

### 4.6 Alerts (Prometheus)
```
- alert: PerfGateFail
  expr: ci_perf_gate_failures_total > 0
  for: 0m
  labels: { severity: warning }
  annotations: { summary: "CI perf gate blocked a PR" }

- alert: InvoiceGenErrors
  expr: rate(invoice_generation_errors_total[15m]) > 0
  for: 15m
  labels: { severity: critical }
  annotations: { summary: "Invoice generation errors detected" }
```

### 4.7 Runbooks
```md
# Billing Close
1) Lock period; run reconciliation.
2) Generate corrections; require dual‑control.
3) Create invoices; export CSV/JSON; attach receipts to evidence.

# GA Cut & Rollback
1) Tag 0.25.0; verify SBOM/SLSA signatures.
2) Ramp flags; watch SLOs for 2h.
3) If breach → helm rollback + disable flags; capture receipts.
```

### 4.8 Evidence Manifest
```yaml
bundle:
  version: 0.25.0
  policy_conformance: s3://evidence/reports/policy-conformance-2025-12-12.json
  purge_manifest: s3://evidence/purge/2025-12/*.json
  invoices: s3://evidence/invoices/2025-12/*.json
  sbom: s3://artifacts/sbom/*-0.25.0.spdx.json
  attestations: s3://artifacts/slsa/*-0.25.0.intoto.jsonl
```

### 4.9 Release Notes Template 0.25.0
```md
# 0.25.0 — GA Candidate
**CompanyOS:** perf gates, billing close, purge manifest.
**Switchboard:** partner console invites, approvals polish, docs surfacing.
**Ops:** SLO proofs, compliance bundle complete.
```

---
## 5) Milestones & Dates
- **2025‑12‑01 Mon:** Kickoff; perf gates enabled; billing cut‑off dry‑run.
- **2025‑12‑05 Fri:** Compliance bundle freeze; invoices v1 demo.
- **2025‑12‑10 Wed:** GA cut rehearsal; rollback drill.
- **2025‑12‑12 Fri:** GA candidate tagged; evidence bundle published; go/no‑go.

---
## 6) RASCI
- **Responsible:** Core Platform (perf/billing/compliance), App Team (partner console/UX), SRE (ops), Security (supply chain)
- **Accountable:** Product Leads
- **Support:** Finance, Legal/DPO, Design, Partner Success
- **Consulted:** Compliance, Exec
- **Informed:** All Hands

---
## 7) Acceptance Test Checklist
- [ ] 7‑day SLOs held on pilots
- [ ] Evidence bundle verified end‑to‑end
- [ ] Invoices generated & exported; corrections receipts present
- [ ] White‑label theme/profile applied per tenant without redeploy
- [ ] CI perf gates active; no unsigned images allowed

---
## 8) Packaging & Delivery
- Charts: `ops/helm/*-0.25.0`
- Terraform: accounting export module
- Seeds: theme tokens snapshot tests, price catalog
- Evidence: full bundle with invoices, purge manifest, compliance
- Screens/Docs: GA runbooks, perf dashboar