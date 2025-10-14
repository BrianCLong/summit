# Topicality · Next Sprint Plan — **2025‑11‑10 → 2025‑11‑24**  
**Slug:** `topicality-sprint-2025-11-10-v0-1`  
**Version:** v0.1.0

> Post‑GA cadence. Focus shifts to **adoption, enterprise readiness, reliability, and cost**. We turn v1.0 momentum into repeatable wins and predictable operations.

---

## 0) Table of Contents
1. Executive Summary & Goals  
2. GA Outcomes & Gaps (evidence)  
3. Objectives → KPIs → Acceptance  
4. Swimlanes & Work Breakdown  
5. Backlog (prioritized)  
6. Maestro ChangeSpec (scaffold)  
7. Release Gate (minor) & Freeze Windows  
8. Governance & Compliance (SOC2‑lite v1.2 + DPA/DPIA)  
9. Runbooks & Demos  
10. Risk Heatmap & Unblocks  
11. Calendar & Rituals  
12. Appendix: Templates & CI hooks

---

## 1) Executive Summary & Goals
**Why now:** GA v1.0 shipped with provable provenance, Copilot guardrails, connectors, SLOs, and SOC2‑lite pack. Next, we must **convert design partners**, **harden enterprise features** (SSO/SAML/SCIM, audit logs, data residency), **improve reliability** (multi‑region failover), and **reduce cost** while maintaining velocity.

**Sprint Goal (single sentence):**
> Drive **design‑partner conversion** (≥2 to paid), land **enterprise access & audit** (SAML + SCIM + exportable audit logs), implement **active‑passive multi‑region DR** with RTO≤15m/RPO≤5m drills, and cut **unit cost ≥15%** without SLO regressions.

**Timebox:** 2 weeks (2025‑11‑10 → 2025‑11‑24); mid‑sprint demo 2025‑11‑18; freeze 2025‑11‑23 EOD.

**Owners:** PM — Maya · Identity/Enterprise — Jordan · Platform/DR — Priya · Copilot — Nina · Prov‑Ledger — Alex · Connectors — Omar · GTM — Sam.

---

## 2) GA Outcomes & Gaps (evidence)
- **Evidence to import:** `v1.0.0` Disclosure Pack, burn‑rate dashboards, canary/rollback logs, Stripe sandbox reconciliation reports.  
- **Gaps:**  
  - SSO/SCIM not production‑grade; audit export lacks filters.  
  - Single‑region primary; DR runbook incomplete; no automated failover tests.  
  - Cost spikes on Copilot preview cache misses.  
  - Connector rotation runbooks missing Box/Asana.

---

## 3) Objectives → KPIs → Acceptance
### Objective A — **Enterprise Access & Audit (SAML/SCIM/Audit)**
- **KPIs**  
  - SSO adoption ≥ **80%** of enterprise tenants; SCIM provision latency p95 **≤ 60s**.  
  - Audit export filter latency p95 **≤ 300ms**; coverage of authz, data access, admin actions **100%**.
- **Acceptance**  
  - SAML (Okta, Azure AD) + SCIM v2 endpoints; Just‑in‑Time (JIT) + deprovisioning; exportable audit logs (JSONL) with time/tenant filters; ABAC tests.

### Objective B — **Reliability & DR (Multi‑Region)**
- **KPIs**  
  - RTO **≤ 15m**, RPO **≤ 5m** verified in drill; availability **≥ 99.9%**.  
  - Error budget policy enforced across regions.
- **Acceptance**  
  - Active‑passive topology; replicated storage; automated failover (Argo/Rollouts + DNS); scheduled DR drills; runbooks updated.

### Objective C — **Cost Efficiency (‑15% unit cost)**
- **KPIs**  
  - p95 **cost/req** reduced ≥ **15%** vs. v1.0 baseline; Copilot preview cache hit‑rate **≥ 85%**.  
- **Acceptance**  
  - Caching tier + pre‑warmers; query shaping; autoscaling right‑sizing; per‑tenant budget headers enforced.

### Objective D — **Design Partner Conversion (≥2 deals)**
- **KPIs**  
  - 2 signed (Team/Enterprise); **time‑to‑proof ≤ 14 days** documented; case studies drafted.  
- **Acceptance**  
  - ROI memo per partner; deployment notes; security review Q&A pack.

### Objective E — **Connector Hygiene & Marketplace**
- **KPIs**  
  - Rotation runbooks for Box/Asana; 0 failing golden tests.  
  - Draft marketplace listings (Slack, GitHub, Atlassian) prepared.
- **Acceptance**  
  - `RUNBOOK_rotation.md` present; listings MD with scopes, screenshots, policies.

---

## 4) Swimlanes & Work Breakdown
> DoD = Code + tests + docs + Disclosure Pack + dashboards + owners.

### 4.1 Identity/Enterprise (Jordan)
- SAML (Okta/AAD) + SCIM v2 CRUD + JIT.  
- Audit log export API with filters; ABAC policy tests.  
- Admin UI for SSO/SCIM status & role mapping.

### 4.2 Platform/DR (Priya)
- Dual‑region infra (active‑passive); state replication; failover automation.  
- DR drill (scripted); burn‑down metrics; incident post‑mortem template.

### 4.3 Copilot (Nina)
- Preview cache layer (LRU + TTL + jitter); warmers; query shaping.  
- Add low‑cost path fallback; telemetry on misses.

### 4.4 Prov‑Ledger (Alex)
- Audit hooks to include manifest IDs in access logs.  
- Streaming verifier perf profiling; memory caps.

### 4.5 Connectors (Omar)
- Rotation runbooks (Box/Asana); golden tests stabilization; marketplace copy.  
- Backoff policies unified.

### 4.6 GTM (Sam)
- Conversion playbooks; ROI memos; pricing one‑pager; security Q&A pack.

---

## 5) Backlog (prioritized)
- **ENT‑A1:** SAML (Okta/AAD) + SCIM v2 endpoints.  
- **ENT‑A2:** Audit export filters + coverage.  
- **REL‑B1:** Active‑passive DR automation + drill.  
- **CST‑C1:** Copilot cache + pre‑warmers; right‑size autoscaling.  
- **GTM‑D1:** 2 design‑partner conversions + case studies.  
- **CON‑E1:** Box/Asana rotation runbooks; marketplace drafts.

---

## 6) Maestro ChangeSpec (scaffold)
```yaml
# .maestro/changes/20251110-sprint-enterprise-dr-cost.yaml
area: enterprise,platform,copilot,connectors,gtm
intent: release
release_tag: v1.1.0-rc1
window:
  start: 2025-11-10
  end:   2025-11-24
objective: >
  Enterprise SSO/SCIM + audit, multi-region DR with RTO/RPO targets, 15% cost reduction,
  design-partner conversion, connector hygiene & marketplace drafts.

owners:
  product: maya.k
  identity: jordan.p
  platform: priy a.s
  copilot: nina.v
  connectors: omar.r
  gtm: sam.d

kpis:
  - name: sso_adoption
    target: '>=0.80'
  - name: scim_latency_p95_s
    target: '<=60'
  - name: rto_minutes
    target: '<=15'
  - name: rpo_minutes
    target: '<=5'
  - name: cost_per_req_delta
    target: '<=-0.15'
  - name: cache_hit_rate
    target: '>=0.85'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2200

work_items:
  - epic: Enterprise Access & Audit
    stories: [SAML Okta/AAD, SCIM v2 CRUD + JIT, Audit export filters]
  - epic: Reliability & DR
    stories: [Active-passive setup, Replication, Automated failover, DR drill]
  - epic: Cost Efficiency
    stories: [Preview cache, pre-warmers, autoscaling]
  - epic: GTM Conversion
    stories: [ROI memos, security Q&A, case studies]
  - epic: Connector Hygiene
    stories: [Rotation runbooks, golden test stabilization, marketplace drafts]

artifacts:
  - type: disclosure_pack
    path: .evidence/releases/${release_tag}/
  - type: dashboards
    path: observability/dashboards/
```

---

## 7) Release Gate (minor) & Freeze Windows
```yaml
# .github/workflows/release-gate-minor.yml (excerpt)
name: Release Gate (v1.1 RC)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Policy & Security Gates
        run: |
          gh workflow run attest-sbom.yml
          gh workflow run attest-provenance.yml
          gh workflow run abac-policy.yml
      - name: DR Drill (staging)
        run: gh workflow run dr-drill.yml
```

Freeze windows:
```yaml
freeze_windows:
  - { start: '2025-11-23T00:00:00Z', end: '2025-11-24T23:59:00Z', reason: 'pre-release freeze' }
```

---

## 8) Governance & Compliance (SOC2‑lite v1.2 + DPA/DPIA)
- **SOC2‑lite v1.2:** Incorporate DR evidence, access reviews, SSO/SCIM controls, audit export samples.  
- **DPA/DPIA Templates:** data inventory, lawful basis, residency, DLP labels.  
- **ABAC:** plan entitlements + SSO state awareness (`sso_enabled`, `scim_enforced`).

```rego
# policy/entitlements_sso.rego (excerpt)
package entitlements

allow_feature if {
  input.plan in {"team","enterprise"}
  input.tenant.sso_enabled == true
}
```

---

## 9) Runbooks & Demos
- **DR Drill (staging):** force failover; measure RTO/RPO; capture screenshots; attach to Disclosure Pack.  
- **Enterprise Demo:** SAML login, SCIM provision, role mapping, audit export with filters; Copilot preview cost savings with cache hit telemetry.

**Demo acceptance:** One‑take < 10 min; logs + metrics captured; Disclosure Pack `v1.1.0-rc1` complete.

---

## 10) Risk Heatmap & Unblocks
| Risk | Prob. | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| SAML misconfig in IdP | M | M | Jordan | Provide IdP guides + test metadata |
| Replication lag >RPO | M | H | Priya | Tune WAL/streaming; synthetic writes + alert |
| Cache stampede | L | M | Nina | Jitter + backoff + warmers |
| Cost savings hurt SLO | L | H | Priya | Guardrails + rollbacks |
| Conversion stalls | M | M | Sam | ROI memos, clear pilot→paid path |

**Unblocks:** Okta/AAD sandboxes; secondary region budget; synthetic traffic env; partner security contacts.

---

## 11) Calendar & Rituals (America/Denver)
- Daily standup 09:30 MT.  
- DR design review 2025‑11‑12.  
- Mid‑sprint demo 2025‑11‑18.  
- Freeze 2025‑11‑23 EOD.  
- Sprint demo/close 2025‑11‑24.

---

## 12) Appendix: Templates & CI hooks
```yaml
# .github/workflows/dr-drill.yml (stub)
name: dr-drill
on: [workflow_dispatch]
jobs:
  drill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger failover (staging)
        run: bash scripts/dr/failover.sh
      - name: Validate recovery metrics
        run: node tools/dr/validate.js --rto 15 --rpo 5
```

```markdown
# governance/dpa_template.md (new)
## Processing Activities
## Data Categories & Sensitivity
## Lawful Basis
## Transfers & Residency
## Security Measures & DLP
```

```javascript
// tools/dr/validate.js (stub)
console.log(JSON.stringify({ rto_minutes: 12, rpo_minutes: 3, ok: true }));
```

**END OF PLAN**

