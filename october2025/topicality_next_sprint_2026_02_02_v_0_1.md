# Topicality · Q1 Sprint Plan — **2026‑02‑02 → 2026‑02‑16**  
**Slug:** `topicality-sprint-2026-02-02-v0-1`  
**Version:** v0.1.0  

> Third Q1 sprint. Aim: convert activation into **habitual usage**, drive **latency ≤ 180 ms p95** on preview, unlock **enterprise readiness level‑up** (SSO posture checks, audit drill), expand **connectors (+2)**, and tighten **billing safeguards**.

---

## 0) Table of Contents
1. Executive Summary & Goals  
2. Prior Sprint Recap (evidence & deltas)  
3. Objectives → KPIs → Acceptance  
4. Swimlanes & Work Breakdown  
5. Backlog (prioritized)  
6. Maestro ChangeSpec (scaffold)  
7. Release Gate & Canary Policy  
8. Governance & Compliance (SOC2‑lite v1.4.2)  
9. Runbooks & Demos  
10. Risk Heatmap & Unblocks  
11. Calendar & Rituals  
12. Appendix: CI hooks & templates (diff‑only)

---

## 1) Executive Summary & Goals
**Why now:** We improved preview perf and launched marketplace listings + billing recon. Next, push latency lower, add high‑value connectors, harden enterprise posture (SSO health + audit), and raise activation→habit conversion with in‑product nudges and templates.

**Sprint Goal (single sentence):**
> Ship **Explainability v2.2** (quick‑peek + keyboard/ARIA complete), achieve **preview p95 ≤ 180 ms** & **cache hit ≥ 96%**, certify **2 connectors (Confluence Pages, Linear)**, add **SSO posture checks + audit drill**, and land **billing rate‑limit + anomaly alerts**, with full Disclosure Packs.

**Timebox:** 2 weeks (**2026‑02‑02 → 2026‑02‑16**); mid‑sprint demo **2026‑02‑10**; freeze **2026‑02‑15 EOD**.

**Owners:** PM — Maya · Copilot — Nina · Platform/Perf — Priya · Connectors — Omar · Identity/Gov — Jordan · Monetization — Sam · Growth — Sam · Prov‑Ledger — Alex.

---

## 2) Prior Sprint Recap (evidence & deltas)
- **Evidence:** `v1.2.0-rc2` Disclosure Pack; k6 preview runs; cache telemetry; Trello/ServiceNow cert logs; billing alert/dispute flows; activation dashboard.  
- **Deltas to carry:** explainability evidence link polish; ServiceNow pagination edge case; cache warmer gaps on long‑tail prompts; reconciliation alert thresholds.

---

## 3) Objectives → KPIs → Acceptance
### Objective A — **Explainability v2.2 (Quick‑peek)**
- **KPIs**  
  - Preview **p95 ≤ 180 ms**; cache hit **≥ 96%**; semantic accuracy **≥ 94%**.  
- **Acceptance**  
  - Quick‑peek tooltip with rationale + top‑3 highlights; full keyboard/ARIA; unit + visual tests.

### Objective B — **Platform Performance & Cost**
- **KPIs**  
  - API preview p95 **≤ 180 ms**; export p95 **≤ 260 ms**; cost/req **−2%** vs. last sprint.  
- **Acceptance**  
  - Warmers cover 97% of top prompts; TTL/jitter tuned; autoscaling HPA stable; synthetic checks in CI (preview/export).

### Objective C — **Connector Certification (+2)**
- **KPIs**  
  - **Confluence Pages** + **Linear** certified; mapping coverage **≥ 95%**; CI compliance 100%.  
- **Acceptance**  
  - `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixtures, rotation runbooks; `connector-cert` green.

### Objective D — **Enterprise Posture: SSO Health + Audit Drill**
- **KPIs**  
  - SSO posture screens show **green** for ≥ 90% enterprise tenants; audit export drill p95 **≤ 300 ms**.  
- **Acceptance**  
  - SSO misconfig checks (IdP metadata expiry, clock skew, groups→roles coverage); audit drill runbook + automated sample export.

### Objective E — **Billing Safeguards**
- **KPIs**  
  - Rate‑limit violations **= 0**; anomaly alerts MTTA **≤ 15 min**; reconciliation deltas **≤ 0.4%**.  
- **Acceptance**  
  - Per‑tenant request rate limits; anomaly detection job + alert; thresholds tuned; dispute SLAs tracked.

### Objective F — **Activation → Habit (Growth)**
- **KPIs**  
  - 7‑day habit rate **≥ 22%** of new workspaces (3 sessions + 2 exports + 1 connector used).  
- **Acceptance**  
  - In‑product templates; checklists; email nudges; habit dashboard.

---

## 4) Swimlanes & Work Breakdown
> DoD = Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Copilot (Nina)
- Quick‑peek explainability; a11y polish; evidence link reliability; semantic eval refresh.

### 4.2 Platform/Perf (Priya)
- Warmer rules to 97% coverage; TTL/jitter tuning; autoscaling stability; synthetic checks.

### 4.3 Connectors (Omar)
- Confluence Pages + Linear: scaffolds, mappings, policies, goldens; pagination/backoff; rotation runbooks.

### 4.4 Identity/Gov (Jordan)
- SSO posture panel; IdP metadata checks; audit drill automation; ABAC tests.

### 4.5 Monetization (Sam)
- Rate limit middleware; anomaly detection thresholds; reconciliation tuning; SLA dashboard.

### 4.6 Growth (Sam)
- Templates + onboarding nudges; habit dashboard; event instrumentation.

### 4.7 Prov‑Ledger (Alex)
- Export path p95 ≤ 260 ms profiling; memory caps; partial‑proof UX nits.

---

## 5) Backlog (prioritized)
- **Q1‑A4:** Quick‑peek explainability + a11y.  
- **Q1‑B5:** Warmers 97% + autoscaling stability.  
- **Q1‑C5..C6:** Confluence Pages + Linear certification.  
- **Q1‑D1:** SSO posture checks + audit drill.  
- **Q1‑E2:** Billing rate‑limit + anomaly alerts.  
- **Q1‑F1:** Habit templates + dashboard.

---

## 6) Maestro ChangeSpec (scaffold)
```yaml
# .maestro/changes/20260202-sprint-q1-perf-habit-enterprise.yaml
area: copilot,platform,connectors,identity,monetization,growth,prov-ledger
intent: release
release_tag: v1.2.0-rc3
window:
  start: 2026-02-02
  end:   2026-02-16
objective: >
  Explainability v2.2 quick-peak, preview p95 ≤180ms & cache ≥96%, Confluence Pages + Linear certified,
  SSO posture + audit drill, billing safeguards, habit formation.

owners:
  product: maya.k
  copilot: nina.v
  platform: priy a.s
  connectors: omar.r
  identity: jordan.p
  monetization: sam.d
  growth: sam.d
  prov_ledger: alex.t

kpis:
  - name: preview_latency_p95_ms
    target: '<=180'
  - name: cache_hit_rate
    target: '>=0.96'
  - name: mapping_coverage
    target: '>=0.95'
  - name: sso_green_tenants
    target: '>=0.90'
  - name: reconciliation_delta_pct
    target: '<=0.4'
  - name: habit_7d_rate
    target: '>=0.22'

budget:
  cost_per_req_max_usd: 0.0095
  ci_minutes_cap: 2300
```

---

## 7) Release Gate & Canary Policy
```yaml
# .github/workflows/release-gate-rc3.yml (excerpt)
name: Release Gate (v1.2 RC3)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gh workflow run attest-sbom.yml && gh workflow run attest-provenance.yml && gh workflow run abac-policy.yml
      - run: gh workflow run latency-check.yml
      - run: gh workflow run metering-export.yml && gh workflow run reconcile-billing.yml
      - run: gh workflow run activation-dashboard.yml
```

```yaml
# Argo Rollouts analysis (unchanged thresholds from last tighten)
rollouts.argoproj.io/analysis: |
  metrics:
    - name: error-rate
      threshold: 0.008
    - name: latency-p95
      threshold: 180
    - name: cost-per-req
      threshold: 0.0095
  rollbackOnFailure: true
```

---

## 8) Governance & Compliance (SOC2‑lite v1.4.2)
- **Additions:** SSO posture checks, audit drill evidence, billing anomaly alerts; weekly evidence sync; disclosure coverage check.

```rego
# policy/sso_posture.rego (excerpt)
package sso

default healthy = false

healthy {
  input.idp.metadata_expiry_days >= 15
  input.clock_skew_ms <= 30000
  input.groups_to_roles_coverage >= 0.9
}
```

---

## 9) Runbooks & Demos
- **Demo (≤10m):**  
  1) Quick‑peek explainability; keyboard navigation.  
  2) k6 preview p95 ≤ 180 ms; cache ≥ 96%.  
  3) Confluence Pages + Linear golden tests.  
  4) SSO posture panel; audit drill export (300 ms p95).  
  5) Billing anomaly alert; activation dashboard snapshot.

**Acceptance:** One‑take; `v1.2.0-rc3` Disclosure Pack attached.

---

## 10) Risk Heatmap & Unblocks
| Risk | Prob. | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| Quick‑peek perf regressions | M | M | Nina | Debounce, memoize, async fetch |
| Warmer coverage misses | M | M | Priya | Expand rules; telemetry; long‑tail sampling |
| Confluence/Linear API changes | L | M | Omar | Pin versions; golden tests |
| IdP misconfig noise | M | M | Jordan | Thresholds + overrides; docs |
| Alert fatigue (billing) | L | M | Sam | Agg thresholds; dedupe |

**Unblocks:** Confluence/Linear sandboxes; IdP metadata; k6 env; Stripe sandbox; analytics access.

---

## 11) Calendar & Rituals (America/Denver)
- Daily Standup 09:30 MT.  
- Mid‑sprint Demo **2026‑02‑10**.  
- Release Drill **2026‑02‑15**.  
- Freeze **2026‑02‑15 EOD**.  
- Sprint Demo/Close **2026‑02‑16**.

---

## 12) Appendix: CI hooks & templates (diff‑only)
```yaml
# .github/workflows/sso-audit-drill.yml (new)
name: sso-audit-drill
on: [workflow_dispatch]
jobs:
  drill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/audit/export_sample.js > .evidence/audit/sample.jsonl
```

```javascript
// tools/audit/export_sample.js (stub)
console.log(JSON.stringify({ ts: Date.now(), actor: 'system', action: 'export_sample', ok: true }));
```

```yaml
# .github/ISSUE_TEMPLATE/habit.yml (new)
name: Habit Formation Task
labels: [growth, habit]
body:
  - type: textarea
    id: template
    attributes: { label: Template/Checklist change }
  - type: checkboxes
    id: events
    attributes:
      label: Events instrumented
      options:
        - label: session_start
        - label: export_done
        - label: connector_used
```

**END OF PLAN**

