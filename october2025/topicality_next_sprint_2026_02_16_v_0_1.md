# Topicality · Q1 Sprint Plan — **2026‑02‑16 → 2026‑03‑02**

**Slug:** `topicality-sprint-2026-02-16-v0-1`  
**Version:** v0.1.0

> Fourth Q1 sprint. Goal: cut **preview p95 to ≤ 175 ms**, convert RC3 into **v1.2 GA**, expand **enterprise posture remediation**, certify **2 more connectors (SharePoint Online, Airtable)**, and push **habit→expansion** (invites, roles, templates) — all disclosure‑first with canary + rollback.

---

## 0) Table of Contents

1. Executive Summary & Goals
2. Last Sprint Recap (evidence & deltas)
3. Objectives → KPIs → Acceptance
4. Swimlanes & Work Breakdown
5. Backlog (prioritized)
6. Maestro ChangeSpec (scaffold)
7. Release Gate (v1.2 GA cut)
8. Governance & Compliance (SOC2‑lite v1.4.3)
9. Runbooks & Demos
10. Risk Heatmap & Unblocks
11. Calendar & Rituals
12. Appendix: CI hooks & stubs (diff‑only)

---

## 1) Executive Summary & Goals

**Why now:** RC3 landed preview p95 ≤ 180 ms targets and enterprise posture checks. We now close the gap to **≤ 175 ms**, GA the release, add high‑demand connectors, and improve adoption via in‑product templates + multi‑seat flows, while tightening billing & audit.

**Sprint Goal (single sentence):**

> Ship **Topicality v1.2 GA** with **preview p95 ≤ 175 ms**, **cache ≥ 96.5%**, **SharePoint Online + Airtable** certified, **SSO posture remediation wizard** + **audit export retention controls**, and **habit→expansion** features (invites/roles/templates), all with complete Disclosure Packs.

**Timebox:** 2 weeks (**2026‑02‑16 → 2026‑03‑02**); mid‑sprint demo **2026‑02‑24**; freeze **2026‑03‑01 EOD**.

**Owners:** PM — Maya · Copilot — Nina · Platform/Perf — Priya · Connectors — Omar · Identity/Gov — Jordan · Monetization — Sam · Growth — Sam · Prov‑Ledger — Alex.

---

## 2) Last Sprint Recap (evidence & deltas)

- **Evidence:** `v1.2.0-rc3` Disclosure Pack; k6 preview/export runs; cache telemetry; Confluence Pages + Linear cert logs; SSO posture panel; billing anomaly alerts; habit dashboard.
- **Carry‑overs:** Explainability quick‑peek animation perf; Linear rate‑limit edge case; audit sample export pagination; anomaly thresholds tuning.

---

## 3) Objectives → KPIs → Acceptance

### Objective A — **Perf & Explainability (GA)**

- **KPIs**
  - Preview **p95 ≤ 175 ms**; cache hit **≥ 96.5%**; semantic accuracy **≥ 94%**.
- **Acceptance**
  - Quick‑peek animation under 16ms/frame; SSR/CSR hydration stable; visual tests + Storybook demos; no a11y regressions.

### Objective B — **Connectors (+2): SharePoint Online, Airtable**

- **KPIs**
  - Mapping coverage **≥ 95%**; CI rate‑limit compliance **100%**; golden tests **100% pass**.
- **Acceptance**
  - `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixtures; rotation runbooks; pagination/backoff covered.

### Objective C — **Enterprise Posture: SSO Remediation + Audit Retention**

- **KPIs**
  - SSO posture **green** for **≥ 93%** enterprise tenants; audit export p95 **≤ 280 ms**; retention policies applied 100%.
- **Acceptance**
  - **Remediation wizard** (IdP metadata, clock skew, group→role mapping); audit export retention (30/90/365 days) + access controls; ABAC tests green.

### Objective D — **Habit → Expansion (Growth)**

- **KPIs**
  - 30‑day expansion: **≥ 18%** of active workspaces add ≥ 2 seats; template usage in first week **≥ 40%** of new workspaces.
- **Acceptance**
  - Invite flow (email + SSO); role assignment UI; template gallery (R2, RCA, triage) + analytics.

### Objective E — **Monetization & Billing**

- **KPIs**
  - Reconciliation deltas **≤ 0.3%**; anomaly MTTA **≤ 10 min**; rate‑limit violations **= 0**.
- **Acceptance**
  - Diff thresholds tuned; tenant‑level rate limits enforced; credit issuance ABAC audits attached.

### Objective F — **Prov‑Ledger Ops**

- **KPIs**
  - Export path p95 **≤ 250 ms**; verifier memory p95 **≤ 170 MB**.
- **Acceptance**
  - Streaming back‑pressure tuned; partial‑proof UX polish; metrics panels finalized.

---

## 4) Swimlanes & Work Breakdown

> DoD = Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Copilot (Nina)

- Quick‑peek perf & a11y polish; SSR/CSR hydration fixes; semantic eval updates.

### 4.2 Platform/Perf (Priya)

- Warmer rules to 96.5% hit; TTL/jitter fine‑tune; autoscaling HPA stability; preview/export synthetic checks green.

### 4.3 Connectors (Omar)

- SharePoint Online + Airtable: scaffolds, mappings, policies, goldens; rotation runbooks; backoff/pagination.

### 4.4 Identity/Gov (Jordan)

- SSO remediation wizard; audit export retention (30/90/365); ABAC tests; policy docs.

### 4.5 Monetization (Sam)

- Reconciliation thresholds; anomaly alert tuning; credit ABAC audit; SLA dashboard.

### 4.6 Growth (Sam)

- Invite/role flows; template gallery & analytics; onboarding nudges.

### 4.7 Prov‑Ledger (Alex)

- Export p95 ≤ 250 ms; memory caps; metrics panels; partial‑proof UX.

---

## 5) Backlog (prioritized)

- **Q1‑A5:** Quick‑peek perf + hydration fixes.
- **Q1‑B7..B8:** SharePoint + Airtable certification.
- **Q1‑C2:** SSO remediation wizard + audit retention.
- **Q1‑D2:** Invites/roles + template gallery.
- **Q1‑E3:** Billing thresholds + alerts.
- **Q1‑F2:** Export perf + metrics.

---

## 6) Maestro ChangeSpec (scaffold)

```yaml
# .maestro/changes/20260216-sprint-q1-ga-cut.yaml
area: copilot,platform,connectors,identity,monetization,growth,prov-ledger
intent: release
release_tag: v1.2.0
window:
  start: 2026-02-16
  end: 2026-03-02
objective: >
  v1.2 GA: preview p95 ≤175ms, cache ≥96.5%, SharePoint Online + Airtable certified,
  SSO remediation + audit retention, habit→expansion flows.

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
    target: '<=175'
  - name: cache_hit_rate
    target: '>=0.965'
  - name: mapping_coverage
    target: '>=0.95'
  - name: sso_green_tenants
    target: '>=0.93'
  - name: reconciliation_delta_pct
    target: '<=0.3'
  - name: export_latency_p95_ms
    target: '<=250'
```

---

## 7) Release Gate (v1.2 GA cut)

```yaml
# .github/workflows/release-gate-v1-2.yml (excerpt)
name: Release Gate (v1.2 GA)
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

---

## 8) Governance & Compliance (SOC2‑lite v1.4.3)

- Add SSO remediation evidence; audit retention policy; billing anomaly alert records; disclosure coverage check.

```rego
# policy/audit_retention.rego (excerpt)
package audit

allow_export if {
  input.user.role in {"admin","auditor"}
  input.export.days in {30,90,365}
}
```

---

## 9) Runbooks & Demos

- **Demo (≤10m):**
  1. Quick‑peek perf: p95 ≤ 175 ms; cache ≥ 96.5%.
  2. SharePoint + Airtable golden tests.
  3. SSO remediation wizard fixes IdP metadata + group mappings.
  4. Audit export with 90‑day retention & ABAC enforcement.
  5. Billing reconciliation + anomaly alert; invites/roles + template usage dashboard.

**Acceptance:** One‑take; Disclosure Pack `v1.2.0` attached.

---

## 10) Risk Heatmap & Unblocks

| Risk                          | Prob. | Impact | Owner  | Mitigation                                  |
| ----------------------------- | ----: | -----: | ------ | ------------------------------------------- |
| Hitting ≤175 ms p95           |     M |      H | Priya  | Warmers, TTL/jitter, autoscaling guardrails |
| SharePoint API quota          |     M |      M | Omar   | Backoff, app‑only auth, goldens             |
| Airtable schema variance      |     M |      M | Omar   | Mapping coverage tool, fixtures             |
| Remediation wizard complexity |     M |      M | Jordan | Scope minimal viable path; track funnel     |
| Alert fatigue (billing)       |     L |      M | Sam    | Aggregation + dedupe                        |

**Unblocks:** SharePoint app registration + creds; Airtable API keys; IdP admin access; k6 env; Stripe sandbox; Grafana access.

---

## 11) Calendar & Rituals (America/Denver)

- Daily Standup 09:30 MT.
- Mid‑sprint Demo **2026‑02‑24**.
- Release Drill **2026‑03‑01**.
- Freeze **2026‑03‑01 EOD**.
- Sprint Demo/Close **2026‑03‑02**.

---

## 12) Appendix: CI hooks & stubs (diff‑only)

```yaml
# .github/workflows/sharepoint-airtable-cert.yml (new)
name: connector-cert-spo-airtable
on: [workflow_dispatch]
jobs:
  cert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make connector-cert-sharepoint connector-cert-airtable
```

```javascript
// tools/connectors/mapping_coverage.js (stub)
console.log(
  JSON.stringify({
    connector: process.argv[2] || 'sharepoint',
    coverage: 0.96,
  }),
);
```

**END OF PLAN**
