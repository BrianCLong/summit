# Topicality · Next Sprint Plan — **2025‑10‑13 → 2025‑10‑27**

**Slug:** `topicality-sprint-2025-10-13-v0-1`  
**Version:** v0.1.0

> Two‑week cadence following 2025‑09‑29 sprint. Focus: GA hardening, customer‑visible reliability, and monetization scaffolds.

---

## 0) Table of Contents

1. Executive Summary & Goals
2. Last Sprint Recap (evidence & deltas)
3. Objectives → KPIs → Acceptance
4. Swimlanes & Work Breakdown
5. Backlog (prioritized)
6. Maestro ChangeSpec (scaffold)
7. Release Gate (GA) & Canary Policy
8. Governance & Compliance (SOC2‑lite pack)
9. Runbooks & Demos
10. Risk Heatmap & Unblocks
11. Calendar & Rituals
12. Appendix: Issue templates & CI hooks

---

## 1) Executive Summary & Goals

**Why now:** With Prov‑Ledger beta + Copilot hardening + 5 certified connectors landing, we now drive toward **GA readiness**: reliability SLOs, error budgets, observability maturity, additional connectors, and **monetization** (plans, usage metering, pricing). All changes stay disclosure‑first with release attestations.

**Sprint Goal (single sentence):**

> Achieve **Release Candidate for GA**: Prov‑Ledger v0.2, Copilot v1.1 with semantic guards + explainability, +3 certified connectors, production SLO dashboards + error budgets, usage metering + pricing gates, and SOC2‑lite governance pack v1.

**Timebox:** 2 weeks (2025‑10‑13 → 2025‑10‑27); demo on 2025‑10‑25; code freeze 2025‑10‑26 EOD.

**Owners (by lane):** PM: Maya K. · Prov‑Ledger: Alex T. · Copilot: Nina V. · Connectors: Omar R. · SRE/Obs: Priya S. · Governance: Jordan P. · GTM: Sam D.

---

## 2) Last Sprint Recap (evidence & deltas)

- **What shipped (target):** Prov‑Ledger export manifest + verifier; Copilot NL→Cypher preview + cost; 5 connector scaffolds; SLO dashboards; release gate workflows; disclosure pack.
- **Evidence to import:** Attachments from `.evidence/releases/v0.1.0-rc2/` (SBOM, SLSA, risk, rollback, decision memo) and CI runs.
- **Delta items to carry:** finalize connector golden tests (2/5 red), fill Copilot 200‑case corpus to 100%, wire cost header across all services.

---

## 3) Objectives → KPIs → Acceptance

### Objective A — **Prov‑Ledger v0.2 (GA‑ready)**

- **KPIs**
  - Manifest verification false‑negative rate ≤ **0.1%** across 10k leaves.
  - Verifier CLI p95 runtime **≤ 1.0 s** on standard export (≤ 10MB).
- **Acceptance**
  - Merkle proof support + chunked manifests; streaming export; backward‑compatible schema; redaction policy hooks.

### Objective B — **Copilot v1.1: Semantic Guards + Explainability**

- **KPIs**
  - Syntactic validity ≥ **97%**; semantic accuracy on eval set ≥ **90%** (task‑specific).
  - Preview p95 **≤ 250 ms**.
- **Acceptance**
  - Pre‑exec semantic checks (schema‑aware); safety categories; rationale/explain view; evaluation harness with golden Q/A pairs.

### Objective C — **Connector Certification (+3)**

- **KPIs**
  - Add **Confluence, Salesforce, Notion** certified.
  - All 8 connectors show **rate‑limit compliance** and **mapping coverage ≥ 95%**.
- **Acceptance**
  - Each has `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixture data, and CI `connector-cert` status green.

### Objective D — **SLOs, Error Budgets & Incident Flow**

- **KPIs**
  - Service availability ≥ **99.9%**; p95 latency ≤ **300 ms**; change failure rate ≤ **15%**.
  - MTTR ≤ **30 min** (staging drills).
- **Acceptance**
  - Grafana dashboards with burn‑rate panels; alert rules; incident issue template + post‑mortem automation.

### Objective E — **Usage Metering + Pricing Gates**

- **KPIs**
  - Accurate **per‑tenant** request metering (±1%); cost/req attribution.
  - 3 pricing plans with policy enforcement (Free/Team/Enterprise).
- **Acceptance**
  - Middleware & cron exporters; plan entitlements in ABAC; Stripe sandbox integration (tokenized only).

### Objective F — **SOC2‑lite Governance Pack v1**

- **KPIs**
  - Disclosure pack adoption: **100%** releases; 0 critical policy violations.
- **Acceptance**
  - Policy bundle + evidence map + quarterly internal audit checklist.

---

## 4) Swimlanes & Work Breakdown

> DoD = Code + tests + docs + **Disclosure Pack** + dashboards + owners.

### 4.1 Prov‑Ledger (Alex)

- Merkle proof structure (`schemas/manifest.hash-tree.schema.json` v0.2).
- Chunked/streaming export; verifier supports partial proofs.
- Redaction hooks (field‑level policy); health/metrics hardened.

### 4.2 Copilot (Nina)

- Semantic validator (schema‑aware) + risk classifier.
- Explainability panel (diff + rationale).
- Eval harness with 300 Q/A; semantic accuracy metric; caching for preview speed.

### 4.3 Connectors (Omar)

- Confluence, Salesforce, Notion scaffolds + golden tests.
- Rate‑limit backoff strategy unified; mapping coverage reports.

### 4.4 SRE/Observability (Priya)

- Burn‑rate SLOs + alert rules; synthetic checks.
- Incident runbook + post‑mortem template; k6 perf jobs for p95.
- Error budget tracking per service.

### 4.5 Governance (Jordan)

- SOC2‑lite pack (policies + attest workflow updates).
- ABAC entitlements for pricing plans; DLP redaction policy labels.

### 4.6 GTM (Sam)

- Pricing tiers (Free/Team/Enterprise) one‑pager + calculator.
- Design‑partner ROI sheet; 2 customer demos scheduled.

---

## 5) Backlog (prioritized)

- **GA‑A1:** Merkle proofs + streaming export.
- **GA‑A2:** Verifier partial‑proof validation + perf.
- **GA‑B1:** Semantic validator + rationale UI.
- **GA‑B2:** Eval harness + metrics; preview caching.
- **GA‑C1..C3:** Confluence/Salesforce/Notion certification.
- **GA‑D1:** Burn‑rate SLO dashboards + alerts.
- **GA‑D2:** Incident/post‑mortem automation.
- **GA‑E1:** Usage metering + exporters.
- **GA‑E2:** ABAC entitlements + Stripe sandbox.
- **GA‑F1:** SOC2‑lite pack v1 + quarterly checklist.

---

## 6) Maestro ChangeSpec (scaffold)

```yaml
# .maestro/changes/20251013-sprint-ga-rc.yaml
area: multi
intent: release
release_tag: v0.2.0-rc1
window:
  start: 2025-10-13
  end: 2025-10-27
objective: >
  GA readiness: Prov-Ledger v0.2, Copilot v1.1 (semantic guards + explainability), +3 connectors,
  SLO/error budgets, usage metering + pricing, SOC2-lite pack v1.

owners:
  product: maya.k
  prov_ledger: alex.t
  copilot: nina.v
  connectors: omar.r
  ops: priya.s
  governance: jordan.p
  gtm: sam.d

kpis:
  - name: manifest_fnr
    target: '<=0.001'
  - name: copilot_semantic_accuracy
    target: '>=0.90'
  - name: preview_latency_p95_ms
    target: '<=250'
  - name: availability
    target: '>=0.999'
  - name: metering_accuracy
    target: '>=0.99'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2500

work_items:
  - epic: Prov-Ledger v0.2 (GA)
    stories:
      - Merkle proofs + chunked export
      - Verifier partial-proofs + perf
      - Redaction policy hooks

  - epic: Copilot v1.1
    stories:
      - Semantic validator + safety
      - Explainability UI
      - Eval harness (300 Q/A)

  - epic: Connectors +3
    stories:
      - Confluence/Salesforce/Notion certification

  - epic: SRE
    stories:
      - Burn-rate SLOs + alerts
      - Incident automation + post-mortems

  - epic: Monetization
    stories:
      - Usage metering + exporters
      - Plan entitlements + Stripe sandbox

  - epic: Governance
    stories:
      - SOC2-lite pack v1

artifacts:
  - type: disclosure_pack
    path: .evidence/releases/${release_tag}/
  - type: dashboards
    path: observability/dashboards/
  - type: connectors
    path: connectors/*/
```

---

## 7) Release Gate (GA) & Canary Policy

```yaml
# .github/workflows/release-gate-ga.yml (excerpt)
name: Release Gate (GA RC)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run SBOM+SLSA+ABAC gates
        run: |
          gh workflow run attest-sbom.yml
          gh workflow run attest-provenance.yml
          gh workflow run abac-policy.yml
      - name: Enforce SLO budgets (synthetic)
        run: gh workflow run latency-check.yml
```

```yaml
# Canary thresholds (unchanged); add burn-rate alerts
rollouts.argoproj.io/analysis: |
  metrics:
    - name: error-rate
      threshold: 0.01
    - name: latency-p95
      threshold: 300
    - name: cost-per-req
      threshold: 0.01
  alerts:
    - name: slo-burn
      condition: burn_rate>2 over 1h
  rollbackOnFailure: true
```

---

## 8) Governance & Compliance (SOC2‑lite)

- **Policy bundle:** update ABAC with plan entitlements (`free`, `team`, `enterprise`).
- **Evidence map:** link CI artifacts → disclosure pack paths; quarterly checklist template.

```rego
# policy/entitlements.rego (excerpt)
package entitlements

plan_allow[feature] {
  feature := input.plan
  feature in {"free","team","enterprise"}
}
```

---

## 9) Runbooks & Demos

- **Demo:**
  1. Copilot explainability view (rationale + diff).
  2. Streaming export with Merkle proof; verify partial.
  3. Connector run (Salesforce) with golden tests.
  4. SLO burn‑rate alert; incident automation.
  5. Usage metering dashboard; plan gate via ABAC.

**Demo acceptance:** 8‑minute one‑take; all checks green; disclosure pack attached to `v0.2.0-rc1`.

---

## 10) Risk Heatmap & Unblocks

| Risk                    | Prob. | Impact | Owner  | Mitigation                                 |
| ----------------------- | ----: | -----: | ------ | ------------------------------------------ |
| Merkle proof edge cases |     M |      H | Alex   | Property tests + fuzzing; partial proofs   |
| Semantic accuracy <90%  |     M |      H | Nina   | Expand eval set; add schema hints; caching |
| Connector auth limits   |     M |      M | Omar   | Sandboxes; backoff; rate policies          |
| Metering accuracy drift |     M |      M | Priya  | Double‑entry (server + exporter); audits   |
| Policy regressions      |     L |      M | Jordan | Shadow mode, CI policy tests               |

**Unblocks:** sandbox creds for Salesforce/Confluence/Notion; Grafana access; Stripe test keys; CI minutes top‑up.

---

## 11) Calendar & Rituals (America/Denver)

- Daily Standup 09:30 MT.
- Spike Review 2025‑10‑16.
- Mid‑sprint Demo 2025‑10‑20.
- Release Drill 2025‑10‑25.
- Freeze 2025‑10‑26 EOD.
- Sprint Demo 2025‑10‑25 (partners) / 2025‑10‑27 (internal close).

---

## 12) Appendix: Templates (diffs only)

```yaml
# .github/ISSUE_TEMPLATE/incident.yml
name: Incident
labels: [incident]
body:
  - type: input
    id: sev
    attributes: { label: Severity (SEV1-4) }
  - type: textarea
    id: timeline
    attributes: { label: Timeline }
  - type: textarea
    id: impact
    attributes: { label: Impact & Blast Radius }
  - type: textarea
    id: actions
    attributes: { label: Actions Taken }
  - type: textarea
    id: followups
    attributes: { label: Follow-ups }
```

```yaml
# .github/workflows/metering-export.yml (stub)
name: metering-export
on: [schedule]
schedule:
  - cron: '0 * * * *'
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Export usage
        run: node tools/metering/export.js > .evidence/metering/usage-${{ github.run_id }}.json
```

**END OF PLAN**
