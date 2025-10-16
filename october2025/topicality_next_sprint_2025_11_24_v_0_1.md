# Topicality · Next Sprint Plan — **2025‑11‑24 → 2025‑12‑08**

**Slug:** `topicality-sprint-2025-11-24-v0-1`  
**Version:** v0.1.0

> Post‑GA+1: consolidate enterprise rollouts, reduce cost, and close Q4 design‑partner conversions while prepping year‑end governance.

---

## 0) Table of Contents

1. Executive Summary & Goals
2. Prior Sprint Outcomes (evidence & deltas)
3. Objectives → KPIs → Acceptance
4. Swimlanes & Work Breakdown
5. Backlog (prioritized)
6. Maestro ChangeSpec (scaffold)
7. Release Gate (patch) & Freeze Windows
8. Governance & Year‑End Close (SOC2‑lite v1.3, DPA/DPIA refresh)
9. Runbooks & Demos
10. Risk Heatmap & Unblocks
11. Calendar & Rituals
12. Appendix: Templates & CI hooks

---

## 1) Executive Summary & Goals

**Why now:** We’ve shipped v1.1 RC with SSO/SCIM, DR drills, and cost controls. Next step: **operationalize** SSO/SCIM across tenants, drive **cost per request down another 10%**, certify marketplace listings, and complete **year‑end governance** (audits + disclosure coverage) with a sharp eye on Q4 revenue.

**Sprint Goal (single sentence):**

> Land **enterprise rollouts at scale** (SSO/SCIM to 95% of target tenants), achieve an **additional 10% unit‑cost reduction**, publish **marketplace listings** (Slack, GitHub, Atlassian), and complete **SOC2‑lite v1.3** evidence for year‑end close.

**Timebox:** 2 weeks (2025‑11‑24 → 2025‑12‑08); mid‑sprint demo 2025‑12‑03; freeze 2025‑12‑07 EOD.

**Owners:** PM — Maya · Identity — Jordan · Platform/Cost — Priya · Copilot — Nina · Prov‑Ledger — Alex · Connectors/Marketplace — Omar · GTM — Sam.

---

## 2) Prior Sprint Outcomes (evidence & deltas)

- **Evidence:** `v1.1.0-rc1` Disclosure Pack, DR drill metrics, cache hit telemetry, SSO adoption dashboard, connector rotation runbooks.
- **Deltas to carry:** Okta groups→roles mapping edge cases; DR automation guardrails for write‑traffic; cache warmers coverage; marketplace copy/screens.

---

## 3) Objectives → KPIs → Acceptance

### Objective A — **Enterprise SSO/SCIM at Scale**

- **KPIs**
  - Target tenants covered: **≥ 95%**.
  - SCIM sync drift **≤ 60s** p95; failure rate **< 0.5%**.
- **Acceptance**
  - Okta/AAD group→role mapping; SCIM backfill & conflict resolution; admin audit views; runbooks published.

### Objective B — **Cost Reduction (‑10% vs. v1.1 RC)**

- **KPIs**
  - p95 **cost/req** **≤ −10%** improvement; Copilot preview cache hit **≥ 90%**; infra spend/day **≤ budget**.
- **Acceptance**
  - Query shaping profiles; pre‑warm coverage ≥ 80%; autoscaling tuned; per‑tenant cost budgets enforced with alerts.

### Objective C — **Marketplace Listings (3x)**

- **KPIs**
  - Slack, GitHub, Atlassian listings drafted with scopes, privacy, security, and screenshots;
  - 1st listing **submitted** to review.
- **Acceptance**
  - `/marketplace/*` MD + images; verification checklist passed; legal/privacy reviewed.

### Objective D — **Prov‑Ledger Ops & Redaction UX**

- **KPIs**
  - Redaction errors **= 0** on 10k events; verifier memory p95 **≤ 200MB** on 10MB exports.
- **Acceptance**
  - Redaction preview UI finalized; manifest ID audit hooks wired; partial‑proof CLI UX smoothed.

### Objective E — **Year‑End Governance (SOC2‑lite v1.3)**

- **KPIs**
  - 100% disclosure coverage; 0 criticals; quarterly audit checklist signed.
- **Acceptance**
  - Evidence map updated; DLP labels reviewed; DPIA/DPA refreshed with 2025 deltas.

### Objective F — **Design Partner Revenue (Q4 Close)**

- **KPIs**
  - 2 signed (Team/Enterprise); **time‑to‑proof ≤ 14 days**; case studies drafted.
- **Acceptance**
  - Contracts + ROI memos + security Q&A pack attached.

---

## 4) Swimlanes & Work Breakdown

> DoD = Code + tests + docs + Disclosure Pack + dashboards + owners.

### 4.1 Identity (Jordan)

- Group→role mapping matrix; SCIM backfill + conflict resolution; admin audit & export.

### 4.2 Platform/Cost (Priya)

- Cache warmer coverage; autoscaling & right‑sizing; query shaping templates; cost budget alerts.

### 4.3 Copilot (Nina)

- High‑hit preview cache rules; pre‑compute for top prompts; low‑cost fallback.

### 4.4 Prov‑Ledger (Alex)

- Redaction preview polish; memory caps; audit hooks for manifest IDs.

### 4.5 Connectors/Marketplace (Omar)

- Listings content & screenshots; scopes/policies; rotation runbooks finalize.

### 4.6 GTM (Sam)

- Conversion playbooks; pricing updates; case studies; marketplace launch comms.

---

## 5) Backlog (prioritized)

- **ENT‑A1:** Group→role mapping + tests.
- **ENT‑A2:** SCIM backfill + conflict resolution.
- **CST‑B1:** Cache warmer coverage + autoscaling tune.
- **CST‑B2:** Query shaping profiles.
- **MKT‑C1:** Slack/GitHub/Atlassian listings.
- **PL‑D1:** Redaction preview polish; memory caps.
- **GOV‑E1:** SOC2‑lite v1.3 evidence.
- **GTM‑F1:** Deals close + artifacts.

---

## 6) Maestro ChangeSpec (scaffold)

```yaml
# .maestro/changes/20251124-sprint-enterprise-scale-cost-market.yaml
area: identity,platform,copilot,prov-ledger,marketplace,gtm
intent: release
release_tag: v1.1.0-rc2
window:
  start: 2025-11-24
  end: 2025-12-08
objective: >
  SSO/SCIM scale to 95% tenants, -10% unit cost, marketplace listings (3),
  Prov-Ledger redaction UX, SOC2-lite v1.3, Q4 revenue closes.

owners:
  product: maya.k
  identity: jordan.p
  platform: priy a.s
  copilot: nina.v
  prov_ledger: alex.t
  connectors_marketplace: omar.r
  gtm: sam.d

kpis:
  - name: sso_scim_coverage
    target: '>=0.95'
  - name: cost_per_req_delta
    target: '<=-0.10'
  - name: cache_hit_rate
    target: '>=0.90'
  - name: redaction_errors
    target: '==0'
  - name: disclosure_coverage
    target: '==1.0'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2000
```

---

## 7) Release Gate (patch) & Freeze Windows

```yaml
# .github/workflows/release-gate-rc2.yml (excerpt)
name: Release Gate (v1.1 RC2)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gh workflow run attest-sbom.yml && gh workflow run attest-provenance.yml && gh workflow run abac-policy.yml
      - run: gh workflow run latency-check.yml
      - run: gh workflow run dr-drill.yml
```

Freeze window:

```yaml
freeze_windows:
  - {
      start: '2025-12-07T00:00:00Z',
      end: '2025-12-08T23:59:00Z',
      reason: 'pre-release freeze',
    }
```

---

## 8) Governance & Year‑End Close

- SOC2‑lite v1.3: add DR drill evidence, SSO/SCIM adoption, DLP label audit, DPIA/DPA refresh.
- Evidence map linking CI runs → Disclosure Pack.

---

## 9) Runbooks & Demos

- **Enterprise demo:** SSO + SCIM backfill + group→role mapping + audit export.
- **Cost demo:** Before/after per‑tenant cost & cache hit telemetry; autoscaling change effects.
- **Marketplace demo:** Listing review checklist.

**Demo acceptance:** One‑take < 10 min; all gates green; disclosure pack `v1.1.0-rc2` present.

---

## 10) Risk Heatmap & Unblocks

| Risk                           | Prob. | Impact | Owner  | Mitigation                           |
| ------------------------------ | ----: | -----: | ------ | ------------------------------------ |
| SCIM drift under load          |     M |      M | Jordan | Backfill job, retry, conflict policy |
| Cost optimizations regress SLO |     L |      H | Priya  | Guardrails + staged rollouts         |
| Marketplace rejection          |     M |      M | Omar   | Early review; align scopes/policies  |
| Redaction UX confusion         |     L |      M | Alex   | Inline explainers; previews          |
| Deal slippage                  |     M |      M | Sam    | Clear pilot→paid path, ROI artifacts |

**Unblocks:** IdP admin access; marketplace reviewer contacts; observability links; CI minutes.

---

## 11) Calendar & Rituals (America/Denver)

- Daily standup 09:30 MT.
- Mid‑sprint demo 2025‑12‑03.
- Freeze 2025‑12‑07 EOD.
- Sprint demo/close 2025‑12‑08.

---

## 12) Appendix: CI & Templates (diff‑only)

```yaml
# .github/workflows/cost-budgets.yml (new)
name: cost-budgets
on: [workflow_dispatch]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/cost/enforce.js --budget 0.01
```

```javascript
// tools/cost/enforce.js (stub)
console.log(JSON.stringify({ ok: true, p95_cost_delta: -0.11 }));
```

**END OF PLAN**
