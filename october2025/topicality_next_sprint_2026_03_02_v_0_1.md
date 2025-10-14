# Topicality · Q1 Sprint Plan — **2026‑03‑02 → 2026‑03‑16**  
**Slug:** `topicality-sprint-2026-03-02-v0-1`  
**Version:** v0.1.0  

> Fifth Q1 sprint. Post‑GA stabilization + growth push. Objectives: harden v1.2 GA in the wild, push preview latency to **≤ 170 ms p95**, expand connectors (**Teams + Monday.com**), land **enterprise posture auto‑remediation**, and grow **habit→expansion** with templates and collaboration invites — all with disclosure‑first gates.

---

## 0) Table of Contents
1. Executive Summary & Goals  
2. Last Sprint Recap (evidence & deltas)  
3. Objectives → KPIs → Acceptance  
4. Swimlanes & Work Breakdown  
5. Backlog (prioritized)  
6. Maestro ChangeSpec (scaffold)  
7. Release Gate (v1.2.1) & Freeze Windows  
8. Governance & Compliance (SOC2‑lite v1.4.4)  
9. Runbooks & Demos  
10. Risk Heatmap & Unblocks  
11. Calendar & Rituals  
12. Appendix: CI hooks & stubs (diff‑only)

---

## 1) Executive Summary & Goals
**Why now:** v1.2 GA introduced explainability quick‑peek, SSO remediation, and new connectors. Next, we 1) shave another 5 ms off preview p95, 2) broaden enterprise posture to **auto‑remediate** common IdP issues, 3) add **Teams + Monday.com** connectors, and 4) increase multi‑seat usage and in‑product template adoption.

**Sprint Goal (single sentence):**
> Ship **v1.2.1** with **preview p95 ≤ 170 ms**, **cache ≥ 97%**, **Teams + Monday.com** certified, **auto‑remediation** for SSO posture (clock skew/metadata refresh/groups→roles), and **habit→expansion uplift** (≥ 20% 30‑day expansion), with complete Disclosure Packs.

**Timebox:** 2 weeks (**2026‑03‑02 → 2026‑03‑16**); mid‑sprint demo **2026‑03‑10**; freeze **2026‑03‑15 EOD**.

**Owners:** PM — Maya · Copilot — Nina · Platform/Perf — Priya · Connectors — Omar · Identity/Gov — Jordan · Monetization — Sam · Growth — Sam · Prov‑Ledger — Alex.

---

## 2) Last Sprint Recap (evidence & deltas)
- **Evidence:** `v1.2.0` Disclosure Pack; k6 runs (preview/export); cache telemetry; SharePoint + Airtable cert logs; SSO wizard; audit retention; invites/roles and templates usage; billing anomaly alerts.  
- **Carry‑overs:** Airtable rate‑limit spikes; SharePoint throttling windows; hydration flash on quick‑peek; audit pagination path for 365‑day exports.

---

## 3) Objectives → KPIs → Acceptance
### Objective A — **Perf & Explainability**
- **KPIs**  
  - Preview **p95 ≤ 170 ms**; cache hit **≥ 97%**; semantic accuracy **≥ 94%**.  
- **Acceptance**  
  - Quick‑peek hydration flicker removed; SSR/CSR path consistent; visual + keyboard tests green.

### Objective B — **Connectors (+2): Microsoft Teams, Monday.com**
- **KPIs**  
  - Mapping coverage **≥ 95%**; CI rate‑limit compliance **100%**; golden tests pass.  
- **Acceptance**  
  - `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixtures; rotation runbooks; pagination/backoff; webhook handlers (if applicable).

### Objective C — **Enterprise Posture: Auto‑Remediation**
- **KPIs**  
  - **Auto‑fix** success for ≥ **70%** posture issues detected; SSO posture **green** for **≥ 95%** tenants.  
- **Acceptance**  
  - Remediation jobs: 1) fetch/refresh IdP metadata, 2) clock‑skew advisor, 3) missing group→role mappings wizard step; ABAC tests; audit trail.

### Objective D — **Habit → Expansion (Growth)**
- **KPIs**  
  - 30‑day expansion **≥ 20%** of active workspaces (≥2 seats added); template usage week‑1 **≥ 45%**.  
- **Acceptance**  
  - Template gallery refinements; quick‑start flows; invite link with roles; activation/expansion dashboards.

### Objective E — **Billing & Ops**
- **KPIs**  
  - Reconciliation deltas **≤ 0.3%**; anomaly MTTA **≤ 10 min**; zero rate‑limit violations.  
- **Acceptance**  
  - Threshold tuning; anomaly aggregation/dedupe; SLA dashboard.

### Objective F — **Prov‑Ledger Ops**
- **KPIs**  
  - Export p95 **≤ 245 ms**; verifier memory p95 **≤ 165 MB**.  
- **Acceptance**  
  - Back‑pressure tuning; partial‑proof UX polish; metrics panels finalized.

---

## 4) Swimlanes & Work Breakdown
> DoD = Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Copilot (Nina)
- Hydration flicker fix; quick‑peek polish; semantic eval maintenance; Storybook updates.

### 4.2 Platform/Perf (Priya)
- Increase warmer coverage; TTL/jitter tuning; HPA stability; long‑tail prompt sampling; synthetic checks.

### 4.3 Connectors (Omar)
- Teams + Monday.com scaffolds, mappings, policies, goldens; webhooks; rotation runbooks.

### 4.4 Identity/Gov (Jordan)
- Auto‑remediation jobs + audit; ABAC tests; posture dashboard updates.

### 4.5 Monetization (Sam)
- Anomaly aggregation/dedupe; thresholds; SLA dashboard.

### 4.6 Growth (Sam)
- Template UX refinements; invite link with roles; dashboards.

### 4.7 Prov‑Ledger (Alex)
- Export perf + memory caps; partial‑proof UX; metrics.

---

## 5) Backlog (prioritized)
- **Q1‑A6:** Preview ≤ 170 ms + quick‑peek polish.  
- **Q1‑B9..B10:** Teams + Monday.com certification.  
- **Q1‑C3:** SSO auto‑remediation jobs.  
- **Q1‑D3:** Template & invite improvements + dashboards.  
- **Q1‑E4:** Billing thresholds + SLA dashboard.  
- **Q1‑F3:** Export perf + metrics.

---

## 6) Maestro ChangeSpec (scaffold)
```yaml
# .maestro/changes/20260302-sprint-q1-stabilize-scale.yaml
area: copilot,platform,connectors,identity,monetization,growth,prov-ledger
intent: release
release_tag: v1.2.1
window:
  start: 2026-03-02
  end:   2026-03-16
objective: >
  v1.2.1: preview p95 ≤170ms, cache ≥97%, Teams + Monday.com certified, posture auto-remediation,
  habit→expansion uplift, export perf improvements.

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
    target: '<=170'
  - name: cache_hit_rate
    target: '>=0.97'
  - name: mapping_coverage
    target: '>=0.95'
  - name: sso_green_tenants
    target: '>=0.95'
  - name: reconciliation_delta_pct
    target: '<=0.3'
  - name: export_latency_p95_ms
    target: '<=245'

budget:
  cost_per_req_max_usd: 0.0095
  ci_minutes_cap: 2300
```

---

## 7) Release Gate (v1.2.1) & Freeze Windows
```yaml
# .github/workflows/release-gate-v1-2-1.yml (excerpt)
name: Release Gate (v1.2.1)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gh workflow run attest-sbom.yml && gh workflow run attest-provenance.yml && gh workflow run abac-policy.yml
      - run: gh workflow run latency-check.yml
      - run: gh workflow run metering-export.yml && gh workflow run reconcile-billing.yml
      - run: gh workflow run sso-audit-drill.yml
```

Freeze window:
```yaml
freeze_windows:
  - { start: '2026-03-15T00:00:00Z', end: '2026-03-16T23:59:00Z', reason: 'pre-release freeze' }
```

---

## 8) Governance & Compliance (SOC2‑lite v1.4.4)
- Add posture auto‑remediation evidence; anomaly aggregation records; disclosure coverage check.

```rego
# policy/posture_auto_remediate.rego (excerpt)
package sso

allow_autofix[issue] {
  issue := input.issue
  issue in {"metadata_refresh","clock_skew","group_role_map"}
}
```

---

## 9) Runbooks & Demos
- **Demo (≤10m):**  
  1) Preview p95 ≤ 170 ms; cache ≥ 97%.  
  2) Teams + Monday.com golden tests & webhooks.  
  3) Auto‑remediation applied; posture turns green.  
  4) Export p95 ≤ 245 ms; metrics panel.  
  5) Expansion dashboard: invites/roles + template usage.

**Acceptance:** One‑take; Disclosure Pack `v1.2.1` attached.

---

## 10) Risk Heatmap & Unblocks
| Risk | Prob. | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| 170 ms p95 stretch target | M | H | Priya | Warmers, autoscaling, jitter tuning |
| Teams API throttling | M | M | Omar | Backoff; app permissions; goldens |
| Monday.com schema variance | M | M | Omar | Mapping tool; fixtures |
| Auto‑remediation false positives | L | M | Jordan | Dry‑run mode; audit trail |
| Expansion adoption stalls | M | M | Sam | Templates + invite nudges; case studies |

**Unblocks:** Teams app registration; Monday.com API token; IdP admin access; k6 env; Stripe sandbox; Grafana.

---

## 11) Calendar & Rituals (America/Denver)
- Daily Standup 09:30 MT.  
- Mid‑sprint Demo **2026‑03‑10**.  
- Release Drill **2026‑03‑15**.  
- Freeze **2026‑03‑15 EOD**.  
- Sprint Demo/Close **2026‑03‑16**.

---

## 12) Appendix: CI hooks & stubs (diff‑only)
```yaml
# .github/workflows/teams-monday-cert.yml (new)
name: connector-cert-teams-monday
on: [workflow_dispatch]
jobs:
  cert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make connector-cert-teams connector-cert-monday
```

```javascript
// tools/posture/autofix.js (stub)
console.log(JSON.stringify({ fixed: ["metadata_refresh"], skipped: ["clock_skew"], ok: true }));
```

**END OF PLAN**

