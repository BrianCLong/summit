# CorePlatform+AppTeam-2025-11-03-CompanyOS+Switchboard-ga-hardening-023

**Sprint 23 (Nov 3 → Nov 14, 2025, America/Denver)**  
**Release Train:** Q4’25 “Foundations GA” — Wave 2  
**Theme:** GA hardening — **SLO proofs, policy conformance, receipts at scale, canary → pilot ramp**, and white‑label readiness.

---

## 0) Sprint Goal & Exit Criteria (Joint)

**Goals:**

1. Run **72h pilot ramp** (2 tenants) with **p95 < 1.5s** on critical flows, **p99 error < 0.5%**, and **zero unsigned deploys**.
2. **Receipts at scale:** verify 1M receipts/day pipeline with compaction + selective disclosure.
3. **Policy conformance report** published (≥95% privileged flow coverage) and consumable by auditors.
4. **White‑label kit v1:** theme/branding + policy profiles + export/import tested.

**Exit Criteria (2025‑11‑14):**

- Canary → Pilot(2) ramp completed; no P1s; rollback runbook dry‑run recorded.
- Receipts backfill job catches up ≤ 4h RPO; verification CLI on sample 50k receipts passes.
- Conformance report exported (HTML+JSON) and pinned in evidence bundle.
- Switchboard approvals/command‑palette/runbooks at p95 UI→API latency ≤ 1.5s; denial reasons visible.
- White‑label: tenant theming applied; policy profile import successful; per‑tenant cost dashboards present.

---

## 1) CompanyOS (Core Platform) — Work Breakdown

### EPIC A — Scale & SLO Proofs

- **A1. Receipts Throughput & Backfill**  
  _Stories:_ streaming writes, compaction tuning, backfill worker, selective disclosure map cache.  
  _Acceptance:_ sustain 12 req/s avg receipts ingest; backfill 10M receipts in ≤ 8h; verification rate ≥ 500 receipts/s.
- **A2. Multi‑Tenant Isolation Audit**  
  _Stories:_ namespace guards, data‑residency tags enforcement, cross‑tenant e2e tests.  
  _Acceptance:_ isolation tests green; residency policy evidence attached.

### EPIC B — Policy Conformance & Evidence

- **B1. Coverage ≥ 95% (Privileged Flows)**  
  _Stories:_ scenario matrix expansion; diff‑aware simulator; flaky test quarantine.  
  _Acceptance:_ coverage report ≥ 95%; simulator report attached to PRs.
- **B2. Auditor‑Friendly Report**  
  _Stories:_ HTML/JSON report generator, receipt cross‑links, policy provenance (bundle hash, signer).  
  _Acceptance:_ report exported & signed; linked from evidence manifest.

### EPIC C — FinOps & Billing Hardening

- **C1. Unit Price Catalog Sign‑off**  
  _Stories:_ finance‑signed catalog, change log, policy gating on updates.  
  _Acceptance:_ catalog signed and referenced in receipts; update requires dual‑control.
- **C2. Cost Anomaly Detection (MVP)**  
  _Stories:_ z‑score detector; alerting; RCA worksheet export.  
  _Acceptance:_ synthetic anomaly triggers alert; worksheet links evidence & queries.

---

## 2) Switchboard (App Team) — Work Breakdown

### EPIC D — Approvals & Rationale v3

- **D1. Template Governance**  
  _Stories:_ version pinning, deprecation, ownership metadata; migration tool.  
  _Acceptance:_ selecting deprecated template shows warning; owner required; migration emits receipt.
- **D2. Reviewer Load & SLAs**  
  _Stories:_ queue views, SLA badges, out‑of‑office routing.  
  _Acceptance:_ overdue badge logic correct; OOO reroutes to backup reviewer.

### EPIC E — Command Palette v1.1 & Runbooks v1

- **E1. Palette Recents & Context**  
  _Stories:_ per‑tenant recents, entity‑aware suggestions, offline cache.  
  _Acceptance:_ cold start ≤ 400ms; suggestions reflect current context.
- **E2. Runbook Marketplace v1**  
  _Stories:_ verified signatures, version/channel (stable/canary), uninstall receipts.  
  _Acceptance:_ install/uninstall flows emit receipts; channel switch logs rationale.

### EPIC F — White‑Label Readiness

- **F1. Theme Pack v1**  
  _Stories:_ logo/colors/typography tokens; tenant‑scoped themes; export/import.  
  _Acceptance:_ theme import swaps branding without rebuild; receipts log change.
- **F2. Policy Profiles (Starter)**  
  _Stories:_ profile presets (Internal/Pro/Enterprise), import wizard.  
  _Acceptance:_ profile import applies OPA bundle subset; diff preview shows changes.

---

## 3) Definition of Done (Both)

- Spec/policy updated; simulator + coverage reports stored.
- Unit/integration/e2e/load tests green; trace exemplars attached.
- Evidence bundle updated (receipts, SBOM, SLSA, conformance report); selective disclosure verified.
- Grafana dashboards & Prometheus alerts updated; SLO budgets enforced.
- Helm/Terraform changes merged; feature flags + ramps documented.
- Release notes drafted with perf/cost deltas.

---

## 4) Artifacts, Collateral, Scaffolds

### 4.1 Evidence Manifest (YAML)

```yaml
bundle:
  version: 0.23.0
  receipts_prefix: s3://evidence/pilot/*/2025-11-14/
  conformance_report: s3://evidence/reports/policy-conformance-2025-11-14.json
  sbom: s3://artifacts/sbom/*-0.23.0.spdx.json
  attestations: s3://artifacts/slsa/*-0.23.0.intoto.jsonl
  policy_bundle: s3://policies/companyos/1.9.0.tgz
```

### 4.2 Policy Simulator CLI (README excerpt)

```
simulator run --matrix ./policies/matrix-privileged.yaml --bundle ./dist/opa-1.9.0.tar.gz --report ./artifacts/conformance.json
```

### 4.3 Helm Values (bumped)

```yaml
companyos:
  image.tag: 0.23.0
  policy.bundleVersion: 1.9.0
  receipts.backfill.enabled: true
switchboard:
  image.tag: 0.23.0
  features:
    approvals.template_governance: true
    runbooks.marketplace_v1: true
    palette.context_recents: true
```

### 4.4 Prometheus Alerts (additions)

```
- alert: ReceiptsBackfillLag
  expr: receipts_backfill_lag_seconds > 14400
  for: 15m
  labels: { severity: critical }
  annotations: { summary: "Receipts backfill RPO > 4h" }

- alert: PolicyCoverageDrop
  expr: policy_privileged_coverage_ratio < 0.95
  for: 30m
  labels: { severity: warning }
  annotations: { summary: "Policy coverage below 95%" }
```

### 4.5 Grafana Panels (JSON sketch)

```json
{
  "title": "GA Hardening — Joint",
  "panels": [
    {
      "type": "stat",
      "title": "Receipts/sec",
      "targets": [{ "expr": "sum(rate(provenance_receipts_total[1m]))" }]
    },
    {
      "type": "stat",
      "title": "Coverage (privileged)",
      "targets": [{ "expr": "policy_privileged_coverage_ratio" }]
    },
    {
      "type": "graph",
      "title": "Pilot p95 (critical flows)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(flow_latency_ms_bucket{flow=~\"(approval|graph_3hop|runbook_step)\"}[5m])) by (flow,le))"
        }
      ]
    }
  ]
}
```

### 4.6 White‑Label Pack (structure)

```
white-label/
  themes/
    default.json
    partner-a.json
  policy-profiles/
    internal.yaml
    pro.yaml
    enterprise.yaml
  scripts/
    import-theme.ts
    import-profile.ts
```

### 4.7 Runbook — Pilot Ramp & Rollback

```md
# Pilot Ramp (2 tenants)

1. Enable feature flags (canary→pilot) with ticket link.
2. Smoke tests + SLO probes.
3. Monitor alerts: latency, error, receipts/sec, coverage.
4. If any SLO breach > 30m → **Rollback** (helm rollback; disable flags) and attach receipts.
```

### 4.8 Release Notes Template 0.23.0

```md
# 0.23.0 — GA Hardening Sprint

**CompanyOS:** receipts at scale, conformance report, isolation audit.
**Switchboard:** approvals v3, palette 1.1, runbook marketplace v1, white‑label kit v1.
**SLOs:** p95 < 1.5s; p99 error < 0.5% on pilot tenants.
```

---

## 5) Milestones & Dates

- **2025‑11‑03 Mon:** Kickoff; policy bundle 1.9.0 published; backfill job enabled in staging.
- **2025‑11‑07 Fri:** Mid‑sprint review — receipts throughput + coverage report.
- **2025‑11‑12 Wed:** Pilot ramp to 2 tenants; white‑label import demo.
- **2025‑11‑14 Fri:** Go/No‑Go; evidence bundle finalized; release notes cut.

---

## 6) RASCI

- **Responsible:** Core Platform (CompanyOS), App Team (Switchboard), Policy Guild, SRE, Security
- **Accountable:** Product Leads (CompanyOS & Switchboard)
- **Support:** Design, FinOps, Partner Success, Legal/DPO
- **Consulted:** Exec, Compliance, Pilot Tenant POCs
- **Informed:** All Hands

---

## 7) Acceptance Test Checklist

- [ ] 1M receipts/day sustained; verification rate ≥ 500/s
- [ ] Policy coverage ≥ 95%; conformance report exported & signed
- [ ] p95 UI→API (approvals/runbooks/palette) ≤ 1.5s on pilot
- [ ] White‑label theme/profile import works; receipts logged
- [ ] Isolation & residency tests green; no cross‑tenant leaks

---

## 8) Packaging & Delivery

- Charts: `ops/helm/*-0.23.0`
- Terraform: policy/notary/backfill toggles
- Seeds: white‑label themes, policy profiles, simulator matrix update
- Evidence: receipts, conformance, SBOM, SLSA, pilot SLO exports
- Screens/Docs: pilot dashboard screenshots; rollback demo recording
