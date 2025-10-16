# Topicality · Q1 Sprint Plan — **2026‑03‑16 → 2026‑03‑30**

**Slug:** `topicality-sprint-2026-03-16-v0-1`  
**Version:** v0.1.0

> Sixth Q1 sprint. Theme: **stabilize v1.2.1 in prod**, push **preview p95 to ≤ 165 ms**, finish **enterprise auto‑remediation v1**, add **2 connectors (Notion DB, ClickUp)**, close **expansion → retention** loop, and prep **Q2 roadmap & OKRs** — all disclosure‑first with canary + rollback.

---

## 0) Table of Contents

1. Executive Summary & Goals
2. Last Sprint Recap (evidence & deltas)
3. Objectives → KPIs → Acceptance
4. Swimlanes & Work Breakdown
5. Backlog (prioritized)
6. Maestro ChangeSpec (scaffold)
7. Release Gate (v1.2.2) & Freeze Windows
8. Governance & Compliance (SOC2‑lite v1.4.5)
9. Runbooks & Demos
10. Risk Heatmap & Unblocks
11. Calendar & Rituals
12. Appendix: CI hooks & stubs (diff‑only)

---

## 1) Executive Summary & Goals

**Why now:** v1.2.1 shipped posture auto‑remediation and new connectors. We’re seeing long‑tail prompt misses, a few IdP metadata drifts, and request bursts from marketplace installs. This sprint: lower p95 to **≤ 165 ms**, finish remediation coverage, certify **Notion DB + ClickUp**, and drive **retention** with templates and collaboration.

**Sprint Goal (single sentence):**

> Ship **v1.2.2** with **preview p95 ≤ 165 ms**, **cache ≥ 97.5%**, **Notion DB + ClickUp** certified, **auto‑remediation v1** (coverage ≥ 85%), and **retention uplift** (day‑30 retention ≥ 55% of activated workspaces), with complete Disclosure Packs.

**Timebox:** 2 weeks (**2026‑03‑16 → 2026‑03‑30**); mid‑sprint demo **2026‑03‑24**; freeze **2026‑03‑29 EOD**.

**Owners:** PM — Maya · Copilot — Nina · Platform/Perf — Priya · Connectors — Omar · Identity/Gov — Jordan · Monetization — Sam · Growth — Sam · Prov‑Ledger — Alex.

---

## 2) Last Sprint Recap (evidence & deltas)

- **Evidence:** `v1.2.1` Disclosure Pack; k6 runs; cache telemetry; Teams + Monday.com cert logs; posture auto‑remediation jobs; expansion dashboards.
- **Carry‑overs:** Teams webhook retries; Monday.com schema variance; quick‑peek hydration on old browsers; audit export pagination for large tenants.

---

## 3) Objectives → KPIs → Acceptance

### Objective A — **Perf & Explainability**

- **KPIs**
  - Preview **p95 ≤ 165 ms**; cache hit **≥ 97.5%**; semantic accuracy **≥ 94%**.
- **Acceptance**
  - Long‑tail prompt warmer rules; hydration fixes on legacy browsers; visual + keyboard tests green.

### Objective B — **Connector Certification (+2): Notion DB, ClickUp**

- **KPIs**
  - Mapping coverage **≥ 95%**; CI rate‑limit/webhook compliance **100%**; goldens pass.
- **Acceptance**
  - `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixtures; rotation runbooks; pagination/backoff; webhook handlers.

### Objective C — **Enterprise Posture: Auto‑Remediation v1 (85% coverage)**

- **KPIs**
  - Auto‑fix success **≥ 85%** of detected posture issues; posture **green** **≥ 96%** tenants.
- **Acceptance**
  - Jobs: metadata refresh, clock‑skew advisor, group→role map sync, SAML binding switch hints; audit trail + ABAC tests.

### Objective D — **Retention Uplift (Growth)**

- **KPIs**
  - Day‑30 retention **≥ 55%** of activated workspaces; template usage week‑1 **≥ 50%**; multi‑seat invites **≥ 25%**.
- **Acceptance**
  - Template gallery variants; invite link with roles; weekly nudges; retention dashboard with cohort view.

### Objective E — **Billing & Ops**

- **KPIs**
  - Reconciliation deltas **≤ 0.3%**; anomaly MTTA **≤ 10 min**; zero rate‑limit violations.
- **Acceptance**
  - Threshold tuning; anomaly aggregation/dedupe; SLA dashboard.

### Objective F — **Prov‑Ledger Ops**

- **KPIs**
  - Export p95 **≤ 240 ms**; verifier memory p95 **≤ 160 MB**.
- **Acceptance**
  - Back‑pressure tuning; partial‑proof UX; metrics.

---

## 4) Swimlanes & Work Breakdown

> DoD = Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Copilot (Nina)

- Long‑tail warmers; hydration fix for legacy browsers; Storybook + visual tests.

### 4.2 Platform/Perf (Priya)

- Warmer coverage to 97.5%; TTL/jitter tuning; HPA stability; synthetic checks.

### 4.3 Connectors (Omar)

- Notion DB + ClickUp: scaffolds, mappings, policies, goldens; webhooks; rotation runbooks.

### 4.4 Identity/Gov (Jordan)

- Auto‑remediation jobs + audit; ABAC tests; posture dashboard; SAML binding hints.

### 4.5 Monetization (Sam)

- Anomaly aggregation/dedupe; thresholds; SLA dashboard.

### 4.6 Growth (Sam)

- Templates + invite link with roles; retention dashboard; cohort analysis.

### 4.7 Prov‑Ledger (Alex)

- Export perf + memory caps; partial‑proof UX; metrics.

---

## 5) Backlog (prioritized)

- **Q1‑A7:** Preview ≤ 165 ms + hydration fixes.
- **Q1‑B11..B12:** Notion DB + ClickUp certification.
- **Q1‑C4:** Auto‑remediation v1 coverage 85%.
- **Q1‑D4:** Retention flows + dashboard.
- **Q1‑E5:** Billing thresholds + SLA dashboard.
- **Q1‑F4:** Export perf + metrics.

---

## 6) Maestro ChangeSpec (scaffold)

```yaml
# .maestro/changes/20260316-sprint-q1-perf-retention.yaml
area: copilot,platform,connectors,identity,monetization,growth,prov-ledger
intent: release
release_tag: v1.2.2
window:
  start: 2026-03-16
  end: 2026-03-30
objective: >
  v1.2.2: preview p95 ≤165ms, cache ≥97.5%, Notion DB + ClickUp certified, posture auto-remediation v1,
  retention uplift with templates + invites.

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
    target: '<=165'
  - name: cache_hit_rate
    target: '>=0.975'
  - name: mapping_coverage
    target: '>=0.95'
  - name: sso_green_tenants
    target: '>=0.96'
  - name: export_latency_p95_ms
    target: '<=240'

budget:
  cost_per_req_max_usd: 0.0095
  ci_minutes_cap: 2400
```

---

## 7) Release Gate (v1.2.2) & Freeze Windows

```yaml
# .github/workflows/release-gate-v1-2-2.yml (excerpt)
name: Release Gate (v1.2.2)
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
  - {
      start: '2026-03-29T00:00:00Z',
      end: '2026-03-30T23:59:00Z',
      reason: 'pre-release freeze',
    }
```

---

## 8) Governance & Compliance (SOC2‑lite v1.4.5)

- Add auto‑remediation v1 evidence; retention cohorts; disclosure coverage check.

```rego
# policy/remediation_coverage.rego (excerpt)
package sso

covered {
  input.coverage_ratio >= 0.85
}
```

---

## 9) Runbooks & Demos

- **Demo (≤10m):**
  1. Preview p95 ≤ 165 ms; cache ≥ 97.5%.
  2. Notion DB + ClickUp golden tests & webhooks.
  3. Auto‑remediation coverage report (≥85%).
  4. Export p95 ≤ 240 ms; metrics panel.
  5. Retention dashboard (cohorts; template + invite usage).

**Acceptance:** One‑take; Disclosure Pack `v1.2.2` attached.

---

## 10) Risk Heatmap & Unblocks

| Risk                       | Prob. | Impact | Owner  | Mitigation                                    |
| -------------------------- | ----: | -----: | ------ | --------------------------------------------- |
| ≤165 ms p95 stretch        |     M |      H | Priya  | Long‑tail warmers; autoscaling; jitter tuning |
| Notion/ClickUp API changes |     M |      M | Omar   | Pin versions; goldens; backoff                |
| Auto‑remediation safety    |     L |      M | Jordan | Dry‑run mode; audit trail                     |
| Retention cohort noise     |     M |      M | Sam    | Cohort normalization; thresholds              |
| Billing noise              |     L |      M | Sam    | Dedupe; thresholds                            |

**Unblocks:** Notion/ClickUp tokens; IdP admin access; k6 env; Stripe sandbox; Grafana.

---

## 11) Calendar & Rituals (America/Denver)

- Daily Standup 09:30 MT.
- Mid‑sprint Demo **2026‑03‑24**.
- Release Drill **2026‑03‑29**.
- Freeze **2026‑03‑29 EOD**.
- Sprint Demo/Close **2026‑03‑30**.

---

## 12) Appendix: CI hooks & stubs (diff‑only)

```yaml
# .github/workflows/notion-clickup-cert.yml (new)
name: connector-cert-notion-clickup
on: [workflow_dispatch]
jobs:
  cert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make connector-cert-notion connector-cert-clickup
```

```javascript
// tools/perf/longtail_sampler.js (stub)
console.log(JSON.stringify({ warmed_prompts: 312, coverage: 0.978 }));
```

**END OF PLAN**
