# CorePlatform+AppTeam-2025-12-15-CompanyOS+Switchboard-post-ga-ops-scale-026
**Sprint 26 (Dec 15 → Dec 23, 2025, America/Denver)**  
**Release Train:** Q4’25 “Foundations GA” — Post‑GA Ops & Scale  
**Theme:** **Stabilize, scale, and optimize** — error budgets, cost/latency reductions, customer onboarding runbooks, EU residency preview, and support SLAs.

> **Capacity note:** Short sprint (7 working days). Prioritize reliability, cost, and onboarding.

---
## 0) Sprint Goal & Exit Criteria (Joint)
**Goal:** Operate the GA candidate in production‑like conditions, onboard 1 paying partner end‑to‑end, and harden ops with error‑budget guardrails and cost controls.

**Exit Criteria (2025‑12‑23):**
- **SLOs held:** p95 critical flows < 1.5s, p99 error < 0.5% over the sprint; **error budget burn rate ≤ 1.0**.
- **Cost:** per‑tenant COGS dashboards live; top 3 cost drivers optimized for ≥ **15%** reduction on pilot tenants.
- **Onboarding:** partner onboarding runbook executed end‑to‑end (invite → policy profile → theme → metering → invoice); receipts present.
- **Support:** **SLA/OLA** documents shipped; escalation runbook tested; PagerDuty (or equivalent) wired.
- **Residency:** EU region preview environment stands up; residency policy gates active; data seed passes residency checks.
- **Docs:** admin, operator, and partner quick‑start guides published; evidence bundle updated.

---
## 1) CompanyOS (Core Platform)
### EPIC A — Reliability & Error Budgets
- **A1. Error‑Budget Policy & Burn Alerts**  
  *Stories:* define SLOs per critical flow; implement burn‑rate alerts (1h/6h windows); automatic feature‑ramp pause.  
  *Acceptance:* alerts firing in staging; ramp controller pauses on burn>1.0; receipts for policy decisions.
- **A2. Hot Path Perf & Cache Audit**  
  *Stories:* audit caches (graph query plan, attribute fetch, receipts viewer); add TTL metrics; fix worst offender.  
  *Acceptance:* ≥ 10% reduction in mean latency on targeted path; cache hit rate graphs added.

### EPIC B — FinOps & Cost Reduction
- **B1. Storage & Retention Tuning**  
  *Stories:* evidence compaction thresholds; tiered storage; retention policies (configurable).  
  *Acceptance:* storage cost on pilot reduced ≥ 15% without breaking verification.
- **B2. Query Credits & Throttling**  
  *Stories:* credit budgets; soft/hard limits; friendly error UX; receipts on limit changes.  
  *Acceptance:* throttling works; receipts logged; no SLO breach under loadgen.

### EPIC C — Residency EU Preview
- **C1. EU Stack (Preview)**  
  *Stories:* region tags, KMS keys, sharded buckets; residency policy bundle `eu‑preview`.  
  *Acceptance:* tenant in EU writes/reads only within region; cross‑region blocks logged.
- **C2. Data Seeding & Verification**  
  *Stories:* synthetic dataset with PII‑like markers; residency verification tool.  
  *Acceptance:* tool shows **0 cross‑region artifacts**; receipts bundled.

---
## 2) Switchboard (App Team)
### EPIC D — Partner Onboarding v1
- **D1. Invite → Activate → Configure**  
  *Stories:* invite emails, first‑run checklist, profile/theme apply, API key issuance, metering verification.  
  *Acceptance:* runbook completes < 15m; all steps emit receipts; checklist stored.
- **D2. Usage & Billing Transparency**  
  *Stories:* per‑tenant usage drill‑downs; credit balance; upcoming invoice preview.  
  *Acceptance:* panels render for pilot; numbers reconcile with FinOps API.

### EPIC E — Support SLAs & Incident UX
- **E1. SLA/OLA Surfacing**  
  *Stories:* show SLO status & error budget in footer/admin; link to ToS/Support.  
  *Acceptance:* real‑time SLO widget visible; burn rate badge.
- **E2. Escalation & Pager Wiring**  
  *Stories:* on‑call schedule import; incident templates; one‑click escalate with rationale.  
  *Acceptance:* test page hits on‑call; receipts captured.

---
## 3) Definition of Done (Both)
- Specs/OPA diffs merged; tests (unit/e2e/load) green; coverage reports archived.
- Evidence bundle updated (SLO reports, receipts, residency proof); public verifier passes.
- Dashboards + alerts updated; error‑budget policies live; runbooks updated.
- Helm/Terraform changes merged; flags & ramps documented.
- Release notes drafted with perf/cost changes.

---
## 4) Artifacts, Collateral, Scaffolds
### 4.1 Error‑Budget Rego (burn‑rate gating)
```rego
package ops.error_budget

burn_alert(level) {
  rate := input.burn_rate
  level := "page"
  rate > 2.0  # 1h window
}

pause_ramps { input.burn_rate > 1.0 }
```

### 4.2 Ramp Controller (pseudo‑code)
```ts
if (burnRate > 1.0) {
  flags.pause("new_features");
  receipts.log({ action: "ramp.pause", reason: "error_budget" });
}
```

### 4.3 Grafana Panels (JSON sketch)
```json
{
  "title": "Post‑GA Ops",
  "panels": [
    {"type":"stat","title":"Error Budget Burn (1h)","targets":[{"expr":"slo_error_budget_burn_rate_1h"}]},
    {"type":"graph","title":"Cache Hit Rate (graph plan)","targets":[{"expr":"sum(rate(graph_plan_cache_hits_total[5m])) / sum(rate(graph_plan_cache_requests_total[5m]))"}]},
    {"type":"stat","title":"Storage Cost / Tenant (est)","targets":[{"expr":"tenant_storage_cost_estimate_usd"}]}
  ]
}
```

### 4.4 Prometheus Alerts (burn‑rate, cost, residency)
```
- alert: BurnRateHigh1h
  expr: slo_error_budget_burn_rate_1h > 1
  for: 5m
  labels: { severity: critical }
  annotations: { summary: "Error budget burn > 1.0 (1h)" }

- alert: StorageCostSpike
  expr: increase(tenant_storage_cost_estimate_usd[1h]) > 50
  for: 10m
  labels: { severity: warning }
  annotations: { summary: "Storage cost spike detected" }

- alert: ResidencyViolation
  expr: increase(residency_cross_region_block_total[5m]) > 0
  for: 0m
  labels: { severity: critical }
  annotations: { summary: "Cross‑region write blocked" }
```

### 4.5 OpenAPI (OAS) — Onboarding & Credits (excerpt)
```yaml
paths:
  /partners/invite: { post: { summary: Invite partner admin } }
  /partners/checklist: { get: { summary: First‑run checklist } }
  /credits/balance: { get: { summary: Query credit balance } }
  /credits/limits: { put: { summary: Set credit soft/hard limits } }
```

### 4.6 Terraform & Helm — EU Preview
```hcl
module "eu_kms" { source = "./modules/kms" key_alias = "eu-receipts" }
module "eu_storage" { source = "./modules/storage" region = "eu-west-1" }
```
```yaml
companyos:
  image.tag: 0.26.0
  residency:
    enforce: true
    regions: ["us-east-1","eu-west-1"]
switchboard:
  image.tag: 0.26.0
  features:
    onboarding: true
    sla_widget: true
```

### 4.7 Runbooks
```md
# Partner Onboarding
1) Invite admin; accept + MFA.
2) Apply policy profile; theme pack.
3) Verify metering; run smoke queries.
4) Create invoice preview; confirm figures.

# Cost Optimization — Storage
1) Enable compaction tier 2.
2) Reduce receipt retention for low‑risk to 90d (policy‑gated).
3) Validate verification CLI on sampled receipts.
```

### 4.8 Evidence Manifest
```yaml
bundle:
  version: 0.26.0
  slo_reports: s3://evidence/slo/2025-12-23/*.json
  residency_proof: s3://evidence/residency/eu-preview/*.json
  cost_optimizations: s3://evidence/finops/2025-12/*.json
  sbom: s3://artifacts/sbom/*-0.26.0.spdx.json
  attestations: s3://artifacts/slsa/*-0.26.0.intoto.jsonl
```

### 4.9 Release Notes Template 0.26.0
```md
# 0.26.0 — Post‑GA Ops & Scale
**Ops:** error‑budget guardrails, burn‑rate alerts, ramp pause.
**FinOps:** storage compaction & retention tuning; credit limits.
**Residency:** EU preview environment with policy gates.
**Switchboard:** onboarding v1, SLA widget, escalation wiring.
```

---
## 5) Milestones & Dates
- **2025‑12‑15 Mon:** Kickoff; burn‑rate alerts in staging; EU preview infra.
- **2025‑12‑18 Thu:** Cost optimizations shipped; onboarding runbook demo.
- **2025‑12‑22 Mon:** Residency verification passes; SLO weekly rollup.
- **2025‑12‑23 Tue:** Exit review; evidence bundle compiled; release notes cut.

---
## 6) RASCI
- **Responsible:** Core Platform (reliability/finops/residency), App Team (onboarding/support UX), SRE (alerts/runbooks)
- **Accountable:** Product Leads
- **Support:** Design, Finance, Legal/DPO, Partner Success
- **Consulted:** Compliance, Exec
- **Informed:** All Hands

---
## 7) Acceptance Test Checklist
- [ ] Error‑budget burn ≤ 1.0; ramps pause on breach
- [ ] ≥ 15% storage/COGS reduction on pilots
- [ ] Partner onboarding < 15m; receipts present
- [ ] EU preview blocks cross‑region writes; verification passes
- [ ] Dashboards/alerts live; docs updated

---
## 8) Packaging & Delivery
- Charts: `ops/helm/*-0.26.0`
- Terraform: EU KMS/storage modules
- Seeds: onboarding checklist, credit limits defaults
- Evidence: SLO reports, residency proof, cost optimizations
- Screens/Docs: onboarding flow, SLA widget, cache hit graphs

