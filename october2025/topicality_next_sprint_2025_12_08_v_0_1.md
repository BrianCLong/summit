# Topicality · Next Sprint Plan — **2025‑12‑08 → 2025‑12‑22**

**Slug:** `topicality-sprint-2025-12-08-v0-1`  
**Version:** v0.1.0

> EOY close‑out + Q1 kickoff readiness. We lock in reliability, cost, enterprise rollouts, marketplace submissions, and governance; then package metrics & plans for January execution.

---

## 0) Table of Contents

1. Executive Summary & Goals
2. Prior Sprint Summary (evidence & deltas)
3. Objectives → KPIs → Acceptance
4. Swimlanes & Work Breakdown
5. Backlog (prioritized)
6. Maestro ChangeSpec (scaffold)
7. Release Gate & Holiday Freeze Policy
8. Governance & EOY Close (SOC2‑lite v1.3.1 + DPA/DPIA refresh)
9. Runbooks & Demos
10. Risk Heatmap & Unblocks
11. Calendar & Rituals
12. Appendix: EOY Packs (CEO Dispatch, Board One‑Pager, Metrics Pack)

---

## 1) Executive Summary & Goals

**Why now:** Final sprint before the holiday freeze. We must finalize enterprise features, submit marketplace listings, reduce unit cost another 5–8%, and ship EOY governance + planning artifacts. Everything disclosure‑first with canaryable releases.

**Sprint Goal (single sentence):**

> Deliver **EOY reliability/cost hardening**, **enterprise SSO/SCIM at ≥95% coverage**, **marketplace submissions (≥2 submitted)**, and a **complete EOY disclosure + planning pack** (CEO Dispatch, Board One‑Pager, Q1 OKRs/Plan) ready for Jan 2026 execution.

**Timebox:** 2 weeks (2025‑12‑08 → 2025‑12‑22); demos 2025‑12‑19; code freeze **2025‑12‑21 EOD**; holiday freeze starts **2025‑12‑23**.

**Owners:** PM — Maya · Identity — Jordan · Platform/Cost — Priya · Copilot — Nina · Prov‑Ledger — Alex · Connectors/Marketplace — Omar · GTM/Finance — Sam · Governance — Jordan.

---

## 2) Prior Sprint Summary (evidence & deltas)

- **Evidence:** `v1.1.0-rc2` Disclosure Pack; SSO/SCIM adoption dashboards; cost budgets CI run; marketplace drafts; redaction UX polish PRs.
- **Carry‑over:** AAD group→role edge cases; autoscaling target tracking; Atlassian listing screenshots; DPIA refresh items.

---

## 3) Objectives → KPIs → Acceptance

### Objective A — **Enterprise SSO/SCIM ≥95% Coverage**

- **KPIs**
  - Tenant coverage **≥ 0.95**; SCIM p95 sync latency **≤ 45s**; failure rate **< 0.3%**.
- **Acceptance**
  - Okta/AAD mapping matrix shipped; SCIM conflict resolution/backfill jobs; admin audit views; ABAC tests green.

### Objective B — **Reliability & Cost (‑5–8% unit cost)**

- **KPIs**
  - p95 cost/req **≤ −0.05** delta vs. 2025‑11‑24 baseline; preview cache hit **≥ 92%**; availability **≥ 99.9%**.
- **Acceptance**
  - Cache warmer coverage ≥ 90% of top prompts; query shaping profiles live; autoscaling tuned; per‑tenant budget alerts.

### Objective C — **Marketplace Submissions (≥2)**

- **KPIs**
  - **Slack** + **GitHub** listings submitted; **Atlassian** draft complete; 0 policy blockers.
- **Acceptance**
  - `/marketplace/*` MD + images + scopes + privacy/security; reviewer checklists satisfied.

### Objective D — **Prov‑Ledger Ops & Redaction UX**

- **KPIs**
  - Redaction errors **= 0** on 10k events; verifier memory p95 **≤ 180MB** on 10MB exports.
- **Acceptance**
  - Redaction preview finalized; manifest ID audit hooks landed; partial‑proof CLI UX complete.

### Objective E — **EOY Governance & Planning Pack**

- **KPIs**
  - 100% disclosure coverage; 0 critical policy violations; EOY packs delivered (CEO Dispatch, Board One‑Pager, Metrics Pack, Q1 OKRs).
- **Acceptance**
  - Evidence map updated; DLP label review; DPIA/DPA refreshed; Q1 plan links to ChangeSpecs.

---

## 4) Swimlanes & Work Breakdown

> **DoD:** Code + tests + docs + Disclosure Pack + dashboards + owners.

### 4.1 Identity (Jordan)

- Group→role mapping matrix final; SCIM backfill & conflict policies; admin audit view polish; ABAC tests.

### 4.2 Platform/Cost (Priya)

- Cache warmers + TTL/jitter tuning; query shaping profiles; autoscaling right‑size; per‑tenant budget alerting.

### 4.3 Copilot (Nina)

- High‑hit preview caching rules; low‑cost fallback path; miss telemetry + cold‑start warmers.

### 4.4 Prov‑Ledger (Alex)

- Redaction preview UI finalize; verifier memory caps; metrics panels (leaf count/proof timing).

### 4.5 Connectors/Marketplace (Omar)

- Slack/GitHub submissions; Atlassian draft + screenshots; rotation runbooks close‑out.

### 4.6 GTM/Finance (Sam)

- Conversion close (≥2); pricing page updates; revenue roll‑up; case studies; Q1 pipeline.

### 4.7 Governance (Jordan)

- SOC2‑lite v1.3.1 updates; DPIA/DPA refresh; evidence map linking CI → Disclosure Pack; freeze policy doc.

---

## 5) Backlog (prioritized)

- **ENT‑A1:** Group→role matrix + tests.
- **ENT‑A2:** SCIM backfill + conflict resolution.
- **CST‑B1:** Cache warmers coverage 90% + autoscaling tune.
- **CST‑B2:** Query shaping profiles + budget alerts.
- **MKT‑C1:** Slack + GitHub submission; Atlassian draft.
- **PL‑D1:** Redaction UX finalize; verifier memory caps.
- **GOV‑E1:** EOY packs + DPIA/DPA refresh.

---

## 6) Maestro ChangeSpec (scaffold)

```yaml
# .maestro/changes/20251208-sprint-eoy-close-q1-kickoff.yaml
area: identity,platform,copilot,prov-ledger,marketplace,gtm,governance
intent: release
release_tag: v1.1.0
window:
  start: 2025-12-08
  end: 2025-12-22
objective: >
  EOY reliability & cost hardening, SSO/SCIM ≥95% coverage, marketplace submissions (≥2),
  EOY governance + Q1 planning packs.

owners:
  product: maya.k
  identity: jordan.p
  platform: priy a.s
  copilot: nina.v
  prov_ledger: alex.t
  connectors_marketplace: omar.r
  gtm_finance: sam.d
  governance: jordan.p

kpis:
  - name: sso_scim_coverage
    target: '>=0.95'
  - name: cost_per_req_delta
    target: '<=-0.05'
  - name: cache_hit_rate
    target: '>=0.92'
  - name: redaction_errors
    target: '==0'
  - name: disclosure_coverage
    target: '==1.0'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2000

freeze_windows:
  - {
      start: '2025-12-23T00:00:00Z',
      end: '2026-01-02T23:59:00Z',
      reason: 'Holiday code freeze (hotfix only)',
    }
```

---

## 7) Release Gate & Holiday Freeze Policy

```yaml
# .github/workflows/release-gate-eoy.yml (excerpt)
name: Release Gate (EOY)
on: [workflow_dispatch]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gh workflow run attest-sbom.yml && gh workflow run attest-provenance.yml && gh workflow run abac-policy.yml
      - run: gh workflow run latency-check.yml && gh workflow run cost-budgets.yml
      - name: Enforce freeze policy
        run: node tools/policy/freeze_check.js
```

**Freeze policy:**

- **2025‑12‑23 → 2026‑01‑02**: hotfix‑only. Requires PM + SRE approval + incident link; auto‑rollback enforced.

---

## 8) Governance & EOY Close

- SOC2‑lite **v1.3.1** updates (SSO/SCIM evidence, DR drills, DLP labels); DPIA/DPA refresh; Evidence Map linking all artifacts under `.evidence/releases/v1.1.0/`.

---

## 9) Runbooks & Demos

- **Enterprise demo:** SSO + SCIM conflict resolution + admin audit views.
- **Cost demo:** Cache warmers coverage + autoscaling effects; before/after cost.
- **Marketplace demo:** Slack/GitHub submission checklists.
- **EOY demo:** Walkthrough of disclosure & planning packs.

**Demo acceptance:** One‑take ≤ 10 min; all gates green; Disclosure Pack `v1.1.0` complete.

---

## 10) Risk Heatmap & Unblocks

| Risk                          | Prob. | Impact | Owner  | Mitigation                          |
| ----------------------------- | ----: | -----: | ------ | ----------------------------------- |
| IdP group mapping edge cases  |     M |      M | Jordan | Mapping tests + admin UI explainers |
| Cost regressions under load   |     L |      H | Priya  | Guardrails + staged rollout         |
| Marketplace submission delays |     M |      M | Omar   | Pre‑review with guidelines          |
| EOY freeze hotfix risk        |     L |      M | Priya  | Strict approval + auto‑rollback     |
| Governance gaps               |     L |      H | Jordan | Evidence map checklist + audits     |

**Unblocks:** IdP admin access; marketplace reviewer contacts; Grafana links; CI minutes; legal sign‑offs.

---

## 11) Calendar & Rituals (America/Denver)

- Daily standup 09:30 MT.
- Mid‑sprint demos 2025‑12‑19.
- Freeze start 2025‑12‑23.
- Sprint demo/close 2025‑12‑22.

---

## 12) Appendix: EOY Packs (outlines)

```markdown
# CEO Daily Dispatch (EOY)

- Yesterday results, today plan, blockers, risk heat
- Cash runway & pipeline delta
- Top 5 priorities w/ owner & proof-by-date
```

```markdown
# Board One-Pager (EOY)

- Strategy & focus areas
- Traction & unit economics
- Runway & asks
- Risks & mitigations
- Disclosure links
```

## Template: Build-System Memo

Use this when the user is asking to improve this GPT, the prompts, workflows, IntelGraph, Maestro, or governance pack.

1. Title: `Build-System Memo — <Area> — <YYYY-MM-DD>`

### 1. Context
- What we’re trying to improve (e.g., routing, prompts, tools, disclosure pack).
- Current failure modes or pain (hallucinations, verbosity, missing provenance, etc.).

### 2. Objectives
- 2–4 bullets with **clear outcomes** (e.g., “reduce average answer length by 30% while keeping all required sections”).

### 3. Current Behavior Snapshot
- Brief description of how things work **today**.
- Example(s) of current output or flow (can be summarized/hypothetical).

### 4. Proposed Changes
Table:

| Change | Type (prompt/tool/process) | Description | Risks | Reversible? |
|-------|----------------------------|-------------|-------|-------------|
| 1     | prompt                     | ...         | ...   | Yes/No      |

### 5. 2-Week Value Slice
- What we can change **now** with smallest blast radius:
  - Slice 1: (e.g., tighten templates, add routing rule).
  - Slice 2: (e.g., add provenance block enforcement).
  - Slice 3: (e.g., better default KPIs in Dispatch).

For each slice, specify:
- Owner (even if hypothetical, like “LLM / Human-CEO”).
- Proof-of-success signal.

### 6. Tooling & Artifacts
- How IntelGraph should be used (e.g., Decision nodes, policy labels).
- How Maestro should be used (plans → runs → artifacts).
- Any new artifacts: templates, policies, SBOM/SLSA hooks.

### 7. Risks & Safeguards
- Top risks (e.g., increased complexity, user confusion, policy drift).
- Safeguards (e.g., feature flags, canary usage, manual review).

### 8. Provenance & Assumptions
(Use the standard **Provenance Block** format.)

# ---------- Interaction Rules ----------

1. Decision-First
   - Always start answers with the main decision/recommendation or selected template:  
     `Mode: <canonical_output_type>` on the first line.

2. No Fake Tools
   - You MAY refer to IntelGraph/Maestro conceptually (Decision:<id>, MaestroRun:<id>),  
     but MUST NOT claim you actually executed code, ran pipelines, or wrote to real systems.

3. Templates Are Mandatory
   - For any of the canonical outputs, follow the template headings exactly.
   - Do not invent new major sections; only add minor sub-bullets if needed.

4. Brevity & Skimmability
   - Prefer bullets, tables, and short paragraphs.
   - Avoid story-telling, analogies, or motivational language unless explicitly requested.

5. Provenance Block
   - Any answer longer than 2 paragraphs must end with the **Provenance & Assumptions** block.

6. Ambiguity Handling
   - If the user’s ask is ambiguous, choose the **smallest reversible step** and state your assumption in the Provenance block.

7. No Hidden Work
   - You cannot perform background tasks. All work must be visible in the current response.

If you want to keep going after this, the next logical “next” would be a small Release Gate / Canary template wired to Maestro-style runs.

```markdown
# Metrics Pack (EOY)

- OKR progress & KPIs
- SLOs & error budgets
- Reliability & cost
- Design partner ROI
- Governance coverage
```

```markdown
# Q1 2026 OKRs (draft)

- Product: Copilot explainability v2; latency p95 ≤ 200ms
- Business: 6 design partners; payback ≤ 12m; GM ≥ 70%
- Governance: 100% disclosure packs; policy violation rate zero criticals
```

**END OF PLAN**
