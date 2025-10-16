# Topicality · Q1 Kickoff Sprint Plan — **2026‑01‑05 → 2026‑01‑19**

**Slug:** `topicality-sprint-2026-01-05-v0-1`  
**Version:** v0.1.0

> First sprint after the holiday freeze. Purpose: restart cadence, turn EOY artifacts into production value, and hit Q1 performance & adoption targets with disclosure‑first releases.

---

## 0) Table of Contents

1. Executive Summary & Goals
2. Inputs from EOY Close (evidence & deltas)
3. Objectives → KPIs → Acceptance
4. Swimlanes & Work Breakdown
5. Backlog (prioritized)
6. Maestro ChangeSpec (scaffold)
7. Release Gate (January) & Canary Policy
8. Governance & Compliance (SOC2‑lite v1.4)
9. Runbooks & Demos
10. Risk Heatmap & Unblocks
11. Calendar & Rituals
12. Appendix: Issue/PR templates, CI hooks & stubs

---

## 1) Executive Summary & Goals

**Why now:** EOY sprint landed cost hardening, SSO/SCIM coverage, marketplace submissions, and complete disclosure packs. Next: **performance + explainability**, **marketplace activation**, and **monetization**. All with SLO/cost guardrails and canaryable releases.

**Sprint Goal (single sentence):**

> Deliver **Copilot Explainability v2** (task rationale + graph highlights), drive **preview p95 ≤ 200 ms** with **≥ 94% cache hit‑rate**, activate **2 marketplace listings**, and ship **metering→billing v1** with daily reconciliation — all with full Disclosure Pack coverage.

**Timebox:** 2 weeks (2026‑01‑05 → 2026‑01‑19); mid‑sprint demo **2026‑01‑13**; freeze **2026‑01‑18 EOD**.

**Owners (by lane):** PM — Maya · Copilot — Nina · Platform/Perf — Priya · Prov‑Ledger — Alex · Identity/Enterprise — Jordan · Connectors/Marketplace — Omar · Monetization — Sam · Governance — Jordan.

---

## 2) Inputs from EOY Close (evidence & deltas)

- **Evidence:** `v1.1.0` Disclosure Pack (SBOM, SLSA, risk, rollback, decision memo), cost budgets runs, marketplace submission checklists, redaction UX PRs.
- **Carry‑overs:** AAD group→role edge cases; autoscaling target tracking under bursty loads; Atlassian listing review; DPIA residuals.

---

## 3) Objectives → KPIs → Acceptance

### Objective A — **Copilot Explainability v2 + Safety**

- **KPIs**
  - Preview **p95 ≤ 200 ms**; cache hit‑rate **≥ 94%**; semantic accuracy **≥ 93%** (300 Q/A).
- **Acceptance**
  - Explain panel shows: natural‑language rationale, graph highlights (nodes/edges), and cost/row deltas; safety categories logged; unit tests + storybook.

### Objective B — **Platform Performance & Cost**

- **KPIs**
  - p95 API latency **≤ 200 ms** (preview path) & **≤ 300 ms** (export path); cost/req **−5%** vs. 2025‑12‑22 baseline.
- **Acceptance**
  - Cache warmers for top prompts; autoscaling right‑sized; query‑shaping profiles; synthetic checks in CI.

### Objective C — **Marketplace Activation (2x live)**

- **KPIs**
  - Slack + GitHub listings **approved & live**; install funnel tracked; 100% golden tests pass.
- **Acceptance**
  - Listings pages + screenshots; scopes/privacy reviewed; webhooks & rotation runbooks finalized.

### Objective D — **Metering→Billing v1**

- **KPIs**
  - Per‑tenant metering drift **≤ ±1%**; nightly Stripe export; reconciliation report w/ deltas **≤ 0.5%**.
- **Acceptance**
  - Exporter + backfill; ABAC entitlements enforced; dashboards show usage & cost attribution.

### Objective E — **Governance (SOC2‑lite v1.4)**

- **KPIs**
  - 100% disclosure coverage; 0 critical policy violations; weekly evidence sync.
- **Acceptance**
  - Updated policy bundle; evidence map; security review notes for marketplace + billing.

---

## 4) Swimlanes & Work Breakdown

> **DoD:** Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Copilot (Nina)

- Explainability v2 UI (rationale + graph highlights).
- Safety categorization & logs; semantic eval harness refresh.
- Preview path profiling; cache‑miss telemetry.

### 4.2 Platform/Perf (Priya)

- Cache warmers (rules + TTL/jitter); query‑shaping profiles; autoscaling targets.
- Synthetic checks; k6 perf jobs; burn‑rate alerts tuned.

### 4.3 Connectors/Marketplace (Omar)

- Slack/GitHub listings approval tasks; webhook handling; rotation runbooks; install funnel telemetry.

### 4.4 Monetization (Sam)

- Metering exporter (hourly + nightly); Stripe sandbox export; reconciliation job & report.

### 4.5 Prov‑Ledger (Alex)

- Export path tuning (streaming back‑pressure; memory caps); partial‑proof UX polish; metrics panels.

### 4.6 Identity/Enterprise (Jordan)

- AAD group→role mapping edge cases; SCIM conflict resolution polish; admin audit views.

### 4.7 Governance (Jordan)

- SOC2‑lite v1.4 updates; DPIA deltas; disclosure automation checks in CI.

---

## 5) Backlog (prioritized)

- **Q1‑A1:** Explainability v2 panel + tests.
- **Q1‑A2:** Preview safety categories + logs.
- **Q1‑B1:** Cache warmers + query‑shaping profiles.
- **Q1‑B2:** Autoscaling targets + synthetic checks.
- **Q1‑C1:** Slack listing approval + go‑live.
- **Q1‑C2:** GitHub listing approval + go‑live.
- **Q1‑D1:** Metering exporter + reconciliation report.
- **Q1‑E1:** SOC2‑lite v1.4 evidence map update.

---

## 6) Maestro ChangeSpec (scaffold)

```yaml
# .maestro/changes/20260105-sprint-q1-kickoff.yaml
area: copilot,platform,connectors,monetization,prov-ledger,identity,governance
intent: release
release_tag: v1.2.0-rc1
window:
  start: 2026-01-05
  end: 2026-01-19
objective: >
  Copilot Explainability v2 with preview p95 ≤200ms & ≥94% cache hit, Slack+GitHub listings live,
  metering→billing v1 with reconciliation, SOC2-lite v1.4 updates.

owners:
  product: maya.k
  copilot: nina.v
  platform: priy a.s
  connectors: omar.r
  monetization: sam.d
  prov_ledger: alex.t
  identity: jordan.p
  governance: jordan.p

kpis:
  - name: preview_latency_p95_ms
    target: '<=200'
  - name: cache_hit_rate
    target: '>=0.94'
  - name: semantic_accuracy
    target: '>=0.93'
  - name: metering_accuracy
    target: '>=0.99'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2200

work_items:
  - epic: Explainability v2
    stories: [UI rationale+highlights, safety categories, eval harness]
  - epic: Performance & Cost
    stories: [cache warmers, query shaping, autoscaling, synthetic checks]
  - epic: Marketplace Activation
    stories: [Slack approval, GitHub approval, install funnel]
  - epic: Monetization
    stories: [metering exporter, nightly billing export, reconciliation]
  - epic: Export Path Perf
    stories: [streaming memory caps, partial-proof UX, metrics]

checks:
  - name: gate-sbom
    run: gh workflow run attest-sbom.yml
  - name: gate-slsa
    run: gh workflow run attest-provenance.yml
  - name: policy-abac
    run: gh workflow run abac-policy.yml
```

---

## 7) Release Gate (January) & Canary Policy

```yaml
# .github/workflows/release-gate-jan.yml (excerpt)
name: Release Gate (Jan RC)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SBOM+SLSA+ABAC
        run: |
          gh workflow run attest-sbom.yml
          gh workflow run attest-provenance.yml
          gh workflow run abac-policy.yml
      - name: Perf & Cost Checks
        run: |
          gh workflow run latency-check.yml
          gh workflow run cost-budgets.yml
      - name: Marketplace & Billing Checks
        run: |
          test -f marketplace/slack/README.md && test -f marketplace/github/README.md
          gh workflow run metering-export.yml
```

```yaml
# Argo Rollouts analysis (tightened)
rollouts.argoproj.io/analysis: |
  metrics:
    - name: error-rate
      threshold: 0.008
    - name: latency-p95
      threshold: 200
    - name: cost-per-req
      threshold: 0.0095
  rollbackOnFailure: true
```

---

## 8) Governance & Compliance (SOC2‑lite v1.4)

- **Policy bundle updates:** marketplace webhooks, billing exports, access logs.
- **Evidence map:** link CI artifacts → disclosure paths; weekly sync job.

```rego
# policy/marketplace.rego (excerpt)
package marketplace

default allow = false

allow {
  input.install.scopes ⊆ {"read:channels","read:issues","read:metadata"}
  input.tenant.approved == true
}
```

---

## 9) Runbooks & Demos

- **Demo (8–10m):**
  1. Explainability v2: rationale + highlighted subgraph.
  2. Preview perf: k6 run → p95 ≤ 200 ms; cache hit telemetry ≥ 94%.
  3. Slack/GitHub marketplace flows; rotation runbooks.
  4. Metering→billing export; reconciliation report; ABAC entitlements.
  5. Disclosure Pack checks in PR.

**Demo acceptance:** One‑take; all gates green; attach `v1.2.0-rc1` Disclosure Pack.

---

## 10) Risk Heatmap & Unblocks

| Risk                            | Prob. | Impact | Owner  | Mitigation                                  |
| ------------------------------- | ----: | -----: | ------ | ------------------------------------------- |
| Explainability perf regressions |     M |      H | Nina   | Memoize highlights; async render; profiling |
| Cache hit‑rate below target     |     M |      M | Priya  | Warmer coverage + TTL/jitter tuning         |
| Marketplace approval delays     |     M |      M | Omar   | Pre‑review; align scopes; sample videos     |
| Billing reconciliation deltas   |     L |      H | Sam    | Double‑entry + alerts; manual override      |
| Policy regressions              |     L |      M | Jordan | CI policy suite; shadow mode first          |

**Unblocks:** reviewer contacts for Slack/GitHub; Stripe sandbox keys; k6 env; Grafana access.

---

## 11) Calendar & Rituals (America/Denver)

- Daily Standup 09:30 MT.
- Spike Review **2026‑01‑08** (Explainability v2, cache warmers).
- Mid‑sprint Demo **2026‑01‑13**.
- Release Drill **2026‑01‑18**.
- Freeze **2026‑01‑18 EOD**.
- Sprint Demo/Close **2026‑01‑19**.

---

## 12) Appendix: Issue/PR templates, CI hooks & stubs

```yaml
# .github/ISSUE_TEMPLATE/marketplace_task.yml (new)
name: Marketplace Task
labels: [marketplace]
body:
  - type: input
    id: listing
    attributes: { label: Listing (slack/github/atlassian) }
  - type: checkboxes
    id: checklist
    attributes:
      label: Reviewer Checklist
      options:
        - label: Scopes documented
        - label: Privacy & security sections
        - label: Screenshots/video attached
        - label: Webhooks & rotation runbook
```

```yaml
# .github/workflows/reconcile-billing.yml (new)
name: reconcile-billing
on:
  schedule:
    - cron: '15 2 * * *'
jobs:
  reconcile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Export usage
        run: node tools/metering/export.js > .evidence/metering/usage-${{ github.run_id }}.json
      - name: Reconcile
        run: node tools/metering/reconcile.js --stripe sandbox
```

```javascript
// tools/metering/reconcile.js (stub)
console.log(JSON.stringify({ ok: true, delta_pct: 0.3 }));
```

```tsx
// apps/web/components/ExplainabilityPanel.tsx (stub)
import React from 'react';
export default function ExplainabilityPanel({
  rationale,
  highlights,
}: {
  rationale: string;
  highlights: any[];
}) {
  return (
    <div className="rounded-2xl p-3 shadow">
      <h4 className="font-semibold mb-2">Why this query?</h4>
      <p className="text-sm mb-2">{rationale}</p>
      <div className="text-xs opacity-80">
        {highlights.length} highlighted nodes/edges
      </div>
    </div>
  );
}
```

```makefile
# Makefile (append)
demo-explainability:
	npm --prefix apps/web run storybook
perf-preview:
	k6 run tests/k6/preview_latency.js
reconcile-billing:
	node tools/metering/reconcile.js --stripe sandbox
```

**END OF PLAN**
