# Topicality · Q1 Sprint Plan — **2026‑01‑19 → 2026‑02‑02**  
**Slug:** `topicality-sprint-2026-01-19-v0-1`  
**Version:** v0.1.0  

> Second Q1 sprint. Convert kickoff gains into measurable adoption, lower latency/cost further, expand connectors, and productize explainability. Keep disclosure‑first releases with canary + rollback.

---

## 0) Table of Contents
1. Executive Summary & Goals  
2. Last Sprint Recap (evidence & deltas)  
3. Objectives → KPIs → Acceptance  
4. Swimlanes & Work Breakdown  
5. Backlog (prioritized)  
6. Maestro ChangeSpec (scaffold)  
7. Release Gate (Jan→Feb RC)  
8. Governance & Compliance (SOC2‑lite v1.4.1)  
9. Runbooks & Demos  
10. Risk Heatmap & Unblocks  
11. Calendar & Rituals  
12. Appendix: Templates & CI hooks (diff‑only)

---

## 1) Executive Summary & Goals
**Why now:** Kickoff sprint targeted Explainability v2, perf, marketplace activation, and metering→billing v1. Next, we drive **self‑serve adoption**, **latency under 190 ms p95** in preview, **expand connectors (+2)**, and **close billing loop** with alerts & dispute workflows.

**Sprint Goal (single sentence):**
> Ship **Explainability v2.1** with inline evidence links, achieve **preview p95 ≤ 190 ms** & **cache hit ≥ 95%**, certify **2 new connectors (Trello, ServiceNow)**, finalize **billing alerts + dispute flows**, and raise **self‑serve activation ≥ 30%** of new workspaces.

**Timebox:** 2 weeks (2026‑01‑19 → 2026‑02‑02); mid‑sprint demo **2026‑01‑27**; freeze **2026‑02‑01 EOD**.

**Owners:** PM — Maya · Copilot — Nina · Platform/Perf — Priya · Connectors — Omar · Monetization — Sam · Prov‑Ledger — Alex · Governance — Jordan · Growth — Sam.

---

## 2) Last Sprint Recap (evidence & deltas)
- **Evidence to import:** `v1.2.0-rc1` Disclosure Pack; k6 runs; cache hit telemetry; Slack/GitHub listing approvals; metering reconciliation report.  
- **Deltas:** Explainability UI polish (accessibility + keyboard); marketplace install funnel events; export path perf regressions under high fan‑out.

---

## 3) Objectives → KPIs → Acceptance
### Objective A — **Explainability v2.1 (Inline Evidence)**
- **KPIs**  
  - Preview **p95 ≤ 190 ms**; cache hit **≥ 95%**; semantic accuracy **≥ 94%**.  
- **Acceptance**  
  - Panel shows: rationale, graph highlights, **evidence links (claim IDs)**; keyboard accessible; Storybook stories complete.

### Objective B — **Platform Performance & Cost**
- **KPIs**  
  - API preview path p95 **≤ 190 ms**; export path p95 **≤ 280 ms**; cost/req **−3%** vs. last sprint.  
- **Acceptance**  
  - Warmers cover 95% of top prompts; autoscaling HPA tuned; query shaping profiles expanded; synthetic checks green.

### Objective C — **Connector Certification (+2)**
- **KPIs**  
  - **Trello, ServiceNow** certified; mapping coverage **≥ 95%**; rate‑limit compliance **100%** in CI.  
- **Acceptance**  
  - `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixtures, rotation runbooks; `connector-cert` workflow green.

### Objective D — **Billing Alerts & Disputes**
- **KPIs**  
  - Billing drift alerts under **±0.5%**; dispute TTR **≤ 3 business days**.  
- **Acceptance**  
  - Alerting rules; reconciliation diff thresholds; dispute intake form + runbook; ABAC entitlements for credit grants.

### Objective E — **Self‑Serve Activation (Growth)**
- **KPIs**  
  - New workspace **activation ≥ 30%** (runs ≥ 3 tasks + 1 export + 1 connector).  
- **Acceptance**  
  - Onboarding checklist in‑product; email nudges; analytics dashboard.

---

## 4) Swimlanes & Work Breakdown
> DoD = Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Copilot (Nina)
- Inline evidence links (claim IDs) in Explainability panel.  
- Accessibility polish (keyboard, aria‑labels).  
- Semantic eval harness extension; regression tests.

### 4.2 Platform/Perf (Priya)
- Cache warmer coverage to 95%; TTL/jitter tuning; autoscaling targets; query shaping v2.  
- Synthetic preview/export checks in CI.

### 4.3 Connectors (Omar)
- Trello, ServiceNow scaffolds; mappings, policies, goldens; rotation runbooks.  
- Marketplace listing updates if required (scopes).

### 4.4 Monetization (Sam)
- Billing alerts on reconciliation drift; dispute workflow (issue template + labels); credit entitlements via ABAC.

### 4.5 Prov‑Ledger (Alex)
- Export path fan‑out profiling; streaming back‑pressure tuning; memory caps.

### 4.6 Governance (Jordan)
- SOC2‑lite v1.4.1: marketplace & billing controls; evidence sync automation.

### 4.7 Growth (Sam)
- Onboarding checklist + nudges; activation dashboard; funnel instrumentation.

---

## 5) Backlog (prioritized)
- **Q1‑A3:** Inline evidence + a11y polish.  
- **Q1‑B3:** Cache warmers 95% + autoscaling tune.  
- **Q1‑B4:** Synthetic checks for preview/export p95.  
- **Q1‑C3..C4:** Trello/ServiceNow certification.  
- **Q1‑D2:** Billing alerts + dispute workflow.  
- **Q1‑E1:** Activation onboarding + dashboard.  
- **Q1‑P1:** Export fan‑out perf.

---

## 6) Maestro ChangeSpec (scaffold)
```yaml
# .maestro/changes/20260119-sprint-q1-adoption-perf.yaml
area: copilot,platform,connectors,monetization,prov-ledger,governance,growth
intent: release
release_tag: v1.2.0-rc2
window:
  start: 2026-01-19
  end:   2026-02-02
objective: >
  Explainability v2.1 (evidence links), preview p95 ≤190ms & cache ≥95%, Trello+ServiceNow certified,
  billing alerts+disputes, activation ≥30%.

owners:
  product: maya.k
  copilot: nina.v
  platform: priy a.s
  connectors: omar.r
  monetization: sam.d
  prov_ledger: alex.t
  governance: jordan.p
  growth: sam.d

kpis:
  - name: preview_latency_p95_ms
    target: '<=190'
  - name: cache_hit_rate
    target: '>=0.95'
  - name: mapping_coverage
    target: '>=0.95'
  - name: billing_drift_pct
    target: '<=0.5'
  - name: activation_rate
    target: '>=0.30'

budget:
  cost_per_req_max_usd: 0.0095
  ci_minutes_cap: 2300

checks:
  - name: gate-sbom
    run: gh workflow run attest-sbom.yml
  - name: gate-slsa
    run: gh workflow run attest-provenance.yml
  - name: policy-abac
    run: gh workflow run abac-policy.yml
  - name: perf-preview
    run: gh workflow run latency-check.yml
```

---

## 7) Release Gate (Jan→Feb RC)
```yaml
# .github/workflows/release-gate-jan-feb.yml (excerpt)
name: Release Gate (Jan→Feb RC)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gh workflow run attest-sbom.yml && gh workflow run attest-provenance.yml && gh workflow run abac-policy.yml
      - run: gh workflow run latency-check.yml
      - run: gh workflow run metering-export.yml && gh workflow run reconcile-billing.yml
```

---

## 8) Governance & Compliance (SOC2‑lite v1.4.1)
- ABAC entitlements for credits & billing disputes; marketplace webhook controls; weekly evidence sync job update.

```rego
# policy/billing.rego (excerpt)
package billing

default allow_credit = false

allow_credit {
  input.user.role == "admin"
  input.tenant.plan in {"team","enterprise"}
  input.request.reason in {"dispute","service_credit"}
}
```

---

## 9) Runbooks & Demos
- **Demo (8–10m):**  
  1) Explainability v2.1 with evidence link outs.  
  2) Perf: k6 preview p95 ≤ 190 ms; cache hit ≥ 95%.  
  3) Trello connector golden tests & mapping coverage.  
  4) Billing reconciliation + alert + dispute intake.  
  5) Activation dashboard snapshot.

**Demo acceptance:** One‑take; all gates green; Disclosure Pack `v1.2.0-rc2` attached.

---

## 10) Risk Heatmap & Unblocks
| Risk | Prob. | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| Evidence linking perf hit | M | M | Nina | Lazy‑load; memoize; async fetch |
| Cache coverage misses | M | M | Priya | Expand rules; telemetry; warmers |
| Connector API changes | L | M | Omar | Pin versions; golden tests |
| Billing disputes backlog | L | M | Sam | Intake triage; SLAs; templates |
| Policy regressions | L | M | Jordan | CI policy suite; shadow mode |

**Unblocks:** Trello/ServiceNow sandboxes; k6 env; Stripe sandbox; analytics access.

---

## 11) Calendar & Rituals (America/Denver)
- Daily Standup 09:30 MT.  
- Mid‑sprint Demo **2026‑01‑27**.  
- Release Drill **2026‑02‑01**.  
- Freeze **2026‑02‑01 EOD**.  
- Sprint Demo/Close **2026‑02‑02**.

---

## 12) Appendix: Templates & CI hooks (diff‑only)
```yaml
# .github/ISSUE_TEMPLATE/dispute.yml (new)
name: Billing Dispute
labels: [billing, dispute]
body:
  - type: input
    id: tenant
    attributes: { label: Tenant ID }
  - type: textarea
    id: reason
    attributes: { label: Reason & Evidence }
  - type: input
    id: amount
    attributes: { label: Amount (USD) }
```

```yaml
# .github/workflows/activation-dashboard.yml (new)
name: activation-dashboard
on: [workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/analytics/activation.js > .evidence/analytics/activation-${{ github.run_id }}.json
```

```javascript
// tools/analytics/activation.js (stub)
console.log(JSON.stringify({ activation_rate: 0.31, sample: 142 }));
```

**END OF PLAN**

