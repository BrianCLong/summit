# Topicality · Next Sprint Plan — **2025‑10‑27 → 2025‑11‑10**  
**Slug:** `topicality-sprint-2025-10-27-v0-1`  
**Version:** v0.1.0

> Third iteration in the GA track. We convert RC learnings into hardened GA deliverables, expand monetization, and finalize compliance artifacts.

---

## 0) Table of Contents
1. Executive Summary & Goals  
2. RC Retrospective (evidence & deltas)  
3. Objectives → KPIs → Acceptance  
4. Swimlanes & Work Breakdown  
5. Backlog (prioritized)  
6. Maestro ChangeSpec (scaffold)  
7. Release Gate (GA cut) & Canary Policy  
8. Governance & Compliance (SOC2‑lite v1.1)  
9. Runbooks & Demos  
10. Risk Heatmap & Unblocks  
11. Calendar & Rituals  
12. Appendix: Templates & CI hooks (diff‑only)

---

## 1) Executive Summary & Goals
**Why now:** Post‑RC feedback shows three pressure points: (1) partial‑proof verification at scale, (2) Copilot semantic regressions on rare graph shapes, and (3) metering accuracy vs. connector bursts. This sprint lands **GA‑cut** with blast‑radius minimization and final pricing/entitlements wiring.

**Sprint Goal (single sentence):**
> Ship **Topicality GA v1.0**: Prov‑Ledger v1.0 with scalable partial proofs + redaction policies, Copilot v1.2 semantic guardrails + explainability, **11 certified connectors** total, **metering billing‑ready**, and **SOC2‑lite pack v1.1** with internal audit completed.

**Timebox:** 2 weeks (2025‑10‑27 → 2025‑11‑10); **GA tag** on 2025‑11‑08; freeze 2025‑11‑09 EOD.

**Owners:** PM — Maya · Prov‑Ledger — Alex · Copilot — Nina · Connectors — Omar · SRE/Obs — Priya · Governance — Jordan · GTM — Sam.

---

## 2) RC Retrospective (evidence & deltas)
- **Evidence:** `v0.2.0-rc1` Disclosure Pack; latency k6 runs; connector cert CI logs; incident drill notes.  
- **Deltas to carry:**  
  - Prov‑Ledger: chunk upload retry logic; redaction preview UI.  
  - Copilot: 17 failing Q/A semantics (schema ambiguity); cache stampede under load.  
  - Metering: ±2.7% drift during Slack bursts; missing per‑tenant backfill job.  
  - Connectors: Confluence JQL limits; Salesforce token rotation runbook.

---

## 3) Objectives → KPIs → Acceptance
### Objective A — **Prov‑Ledger v1.0 (GA)**
- **KPIs**  
  - Partial‑proof verification p95 **≤ 800 ms** on 10MB export; FN rate **≤ 0.05%**; zero FP.  
- **Acceptance**  
  - Streaming export, Merkle chunk proofs, **redaction policy** hooks + preview UI; `/metrics` includes leaf count & proof timings; CLI supports `--verify-partial`.

### Objective B — **Copilot v1.2 (GA)**
- **KPIs**  
  - Syntactic validity **≥ 98%**; semantic accuracy **≥ 92%** on 300 Q/A; preview p95 **≤ 220 ms**.  
- **Acceptance**  
  - Schema‑aware semantic guard; rationale panel with node/edge diffs; caching with jitter to avoid stampede; safety categories logged.

### Objective C — **Connector Certification (+3 → total 11)**
- **KPIs**  
  - Add **Zendesk, Box, Asana**.  
  - Mapping coverage per connector **≥ 95%**; rate‑limit compliance **100%** in CI.
- **Acceptance**  
  - `mapping.yaml`, `policy.yaml`, `golden/*.json`, fixtures, rotation runbooks; CI `connector-cert` green.

### Objective D — **Metering & Billing Readiness**
- **KPIs**  
  - Per‑tenant metering drift **≤ ±1%**; ingestion lag **< 1 min** p95.  
  - Billing export to Stripe sandbox nightly with reconciliation report.
- **Acceptance**  
  - Double‑entry (server + exporter), hourly backfill, reconciliation job, plan enforcement in ABAC; dashboards for usage & cost attribution.

### Objective E — **SRE SLOs & Post‑mortems**
- **KPIs**  
  - Availability **≥ 99.9%**; change failure rate **≤ 10%**; MTTR **≤ 20 min** (staging drills).  
- **Acceptance**  
  - Burn‑rate alerts, incident template, auto‑labelled follow‑ups with owners & due dates.

### Objective F — **SOC2‑lite v1.1 + Internal Audit**
- **KPIs**  
  - 100% release Disclosure Pack coverage; 0 critical policy violations; audit checklist complete with evidence links.
- **Acceptance**  
  - Updated policy bundle; audit log index; DLP watermark/redaction defaults enabled.

---

## 4) Swimlanes & Work Breakdown
> DoD = Code + tests + docs + Disclosure Pack + dashboards + owners.

### 4.1 Prov‑Ledger (Alex)
- Merkle partial‑proof API + CLI `--verify-partial`.  
- Streaming/chunk retries (idempotent) and metrics.  
- Redaction preview UI component; policy errata tests.  

### 4.2 Copilot (Nina)
- Schema‑aware semantic guard; rationale/trace capture.  
- Cache layer with jitter + TTL per graph shape.  
- Expand 300 Q/A set to cover rare graph motifs; semantic tests.

### 4.3 Connectors (Omar)
- Zendesk/Box/Asana: scaffolds, mappings, policies, goldens.  
- Auth rotation runbooks; unified backoff; mapping coverage tool.

### 4.4 SRE/Observability (Priya)
- Burn‑rate alerts → Pager; synthetic checks; post‑mortem automation.  
- Perf: preview path p95 ≤ 220 ms via profiling & cache warmers.

### 4.5 Governance (Jordan)
- SOC2‑lite update; DLP redaction labels default‑on.  
- Audit index with evidence paths; quarterly checklist run.

### 4.6 GTM/Pricing (Sam)
- Pricing calculator v0.2; usage dashboards; Stripe sandbox nightly export + reconciliation.

---

## 5) Backlog (prioritized)
- **GA‑A1:** Partial‑proof API + CLI.  
- **GA‑A2:** Chunk retry metrics + SLO.  
- **GA‑A3:** Redaction preview UI.  
- **GA‑B1:** Semantic guard + diff rationale.  
- **GA‑B2:** Cache jitter + preview perf.  
- **GA‑C1..C3:** Zendesk/Box/Asana certification.  
- **GA‑D1:** Double‑entry metering + backfill.  
- **GA‑D2:** Stripe export + reconciliation.  
- **GA‑E1:** Burn‑rate alerts + incident automation.  
- **GA‑F1:** SOC2‑lite v1.1 + audit.

---

## 6) Maestro ChangeSpec (scaffold)
```yaml
# .maestro/changes/20251027-sprint-ga-v1.yaml
area: multi
intent: release
release_tag: v1.0.0
window:
  start: 2025-10-27
  end:   2025-11-10
objective: >
  GA v1.0: Prov-Ledger v1.0 with partial proofs & redaction, Copilot v1.2, +3 connectors (11 total),
  metering+billing readiness, SRE SLOs, SOC2-lite v1.1.

owners:
  product: maya.k
  prov_ledger: alex.t
  copilot: nina.v
  connectors: omar.r
  ops: priya.s
  governance: jordan.p
  gtm: sam.d

kpis:
  - name: partial_proof_p95_ms
    target: '<=800'
  - name: semantic_accuracy
    target: '>=0.92'
  - name: preview_latency_p95_ms
    target: '<=220'
  - name: metering_accuracy
    target: '>=0.99'
  - name: availability
    target: '>=0.999'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2800

work_items:
  - epic: Prov-Ledger v1.0
    stories:
      - Partial proofs + CLI
      - Streaming retries + metrics
      - Redaction preview

  - epic: Copilot v1.2
    stories:
      - Semantic guard + rationale
      - Cache jitter + perf

  - epic: Connectors (+3)
    stories:
      - Zendesk, Box, Asana certification

  - epic: Monetization
    stories:
      - Double-entry metering + backfill
      - Stripe export + reconciliation

  - epic: SRE
    stories:
      - Burn-rate alerts + incident automation

  - epic: Governance
    stories:
      - SOC2-lite v1.1 + audit

artifacts:
  - type: disclosure_pack
    path: .evidence/releases/${release_tag}/
  - type: dashboards
    path: observability/dashboards/
  - type: connectors
    path: connectors/*/
```

---

## 7) Release Gate (GA cut) & Canary Policy
```yaml
# .github/workflows/release-gate-ga-cut.yml
name: Release Gate (GA v1.0)
on:
  workflow_dispatch: {}
  push:
    tags: ['v1.*']
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SBOM + SLSA + ABAC
        run: |
          gh workflow run attest-sbom.yml
          gh workflow run attest-provenance.yml
          gh workflow run abac-policy.yml
      - name: Latency + Burn-rate checks
        run: |
          gh workflow run latency-check.yml
          gh workflow run slo-burnrate.yml
      - name: Metering reconciliation (dry-run)
        run: gh workflow run metering-export.yml
```

```yaml
# Argo Rollouts annotations (unchanged + stricter latency)
rollouts.argoproj.io/analysis: |
  metrics:
    - name: error-rate
      threshold: 0.01
    - name: latency-p95
      threshold: 220
    - name: cost-per-req
      threshold: 0.01
  rollbackOnFailure: true
```

---

## 8) Governance & Compliance (SOC2‑lite v1.1)
- **Updates**: Default‑on DLP redactions; export watermarks; quarterly audit checklist executed; evidence mapped to Disclosure Pack.  
- **Policy add‑on:** pricing entitlements + data residency labels.

```rego
# policy/redaction.rego (excerpt)
package dlp

should_redact[field] {
  field := input.field
  field in {"email_body","access_token","ssn"}
}
```

---

## 9) Runbooks & Demos
- **Demo (8 min):**  
  1) Streaming export → partial proof verify.  
  2) Copilot explainability + semantic guard catch & fix.  
  3) Zendesk connector golden test pass.  
  4) Metering export + Stripe reconciliation report.  
  5) Burn‑rate alert → incident auto‑issue.

**Acceptance:** All green; Disclosure Pack for `v1.0.0` complete.

---

## 10) Risk Heatmap & Unblocks
| Risk | Prob. | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| Partial‑proof corner cases | M | H | Alex | Fuzz tests; property checks; fixtures |
| Semantic drift on new schemas | M | H | Nina | Expand eval; schema hints; caching |
| Connector auth/rate limits | M | M | Omar | Backoff; sandbox creds; retries |
| Metering reconciliation fails | L | H | Priya | Double‑entry; backfill; dry‑run exports |
| Policy regressions | L | M | Jordan | CI policy suite; shadow mode |

**Unblocks needed:** Zendesk/Box/Asana sandbox creds; Stripe test keys; Grafana alert channels; CI minutes bump.

---

## 11) Calendar & Rituals (America/Denver)
- Daily Standup 09:30 MT.  
- Spike Review: 2025‑10‑30.  
- Mid‑sprint Demo: 2025‑11‑03.  
- GA Dry‑run: 2025‑11‑07.  
- GA Tag: 2025‑11‑08.  
- Freeze: 2025‑11‑09 EOD.  
- Sprint Demo/Close: 2025‑11‑10.

---

## 12) Appendix: Templates & CI (diff‑only)
```yaml
# .github/workflows/slo-burnrate.yml (new)
name: slo-burnrate
on: [workflow_dispatch]
jobs:
  burn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Evaluate burn-rate
        run: node tools/observability/burnrate.js
```

```javascript
// tools/observability/burnrate.js (stub)
console.log(JSON.stringify({ ok: true, burn_rate: 0.8 }));
```

```markdown
# runbooks/postmortem_template.md (new)
## Summary
## Impact
## Timeline
## Root Cause
## Corrective Actions
## Lessons Learned
```

**END OF PLAN**

