# Confidential Design — Analyst Experience & Design Systems Sprint (Oct 20–31, 2025) v2.0

> Mission: advance analyst velocity & trust with **Explainability UX**, **Policy Simulator**, and **Offline Demo Kit** while hardening performance and documentation. Ship clean, green, functional features that extend the prior sprint (Oct 6–17) and integrate with Integration Mega Sprint, OPA/Policy, Provenance Ledger, and SLO dashboards.

---

## 0) Alignment Snapshot

- **Cadence**: 2‑week sprint **Mon Oct 20 → Fri Oct 31, 2025**.
- **Dependencies**: Provenance Ledger v2 fields (transform descriptors), OPA reasoner events for simulation, Ingestion Wizard A2.1 (seed packs), CI Hardening (axe/pa11y in PR), SLO Dashboards v0.3, Offline Sync agent.
- **Interfaces we produce**: XAI Explainability panels (roll‑ups + counterfactuals), Policy Simulator modal & diff ribbon, Offline Demo Kit v1, Command Palette v1.1 (bulk ops + recents), Runbook Composer v0.9, Reporting Templates v0.5.
- **Exit Criteria**: 100% green accessibility checks; Policy Simulator yields clear, non‑leaky guidance; Explainability panels measurable uplift in task confidence; demo kit runs air‑gapped.

---

## 1) Gaps Progressing From Prior Sprint

1. **Explainability visuals** beyond provenance: missing model‑driven rationale and alternative hypothesis preview.
2. **Policy “what‑if”** is absent; users can’t test “with authority X” without leaving context.
3. **Offline demo** still manual; needs one‑click seed + reset + talk track.
4. **Palette discoverability** for new users; need learnability hints + recents.
5. **Runbook authoring** lacks reusable steps and approvals.
6. **Perf** on tri‑pane brushing under heavy graphs (>50k nodes) not fully budgeted.

---

## 2) Sprint Goals & Non‑Goals

**Goals**

- G1: **Explainability UX v1**: evidence roll‑ups + concise model rationale + counterfactual preview.
- G2: **Policy Simulator v1**: safe, local “what‑if” with diff overlay; never reveals blocked content.
- G3: **Offline Demo Kit v1**: air‑gapped seed, reset, scripts, and visuals.
- G4: **Command Palette v1.1**: recents, bulk selection ops, and contextual suggestions.
- G5: **Runbook Composer v0.9**: blocks, variables, approvals, and exportable templates.
- G6: **Perf & A11y hardening**: p95 brush <50ms on 50k nodes; axe/pa11y zero criticals.

**Non‑Goals (this sprint)**

- Full causal graph narratives and simulation sandbox UI; internationalization full sweep (we’ll prep copy IDs).

---

## 3) Epics, Stories & Acceptance Criteria

> DoD for every story: tests, docs/MDX, telemetry hooks, a11y checks, demo coverage.

### Epic X — Explainability UX (XAI‑UX)

- **X‑1 Evidence Roll‑Up Cards**
  - _User_: See succinct “Why it’s here” with top sources, transform, and confidence sparkline.
  - _Accept_: Card loads <120ms; includes toggle to expand to full detail sheet; keyboard accessible.
- **X‑2 Rationale Panel**
  - _User_: Read model’s concise rationale (plain language) with caveats and dissent link.
  - _Accept_: 3‑sentence cap; caveats summarized; no model jargon; copy deck approved.
- **X‑3 Counterfactual Preview**
  - _User_: View “If we remove evidence Y / add authority Z” expected change badges.
  - _Accept_: Shows non‑leaky diffs; logs simulation event; never exposes blocked payloads.

### Epic P — Policy Simulator (POL‑SIM)

- **P‑1 What‑If Modal**
  - _User_: Open from block modal or toolbar; choose authority/license delta; see preview.
  - _Accept_: Debounced <80ms recompute; shows changed counts + sample placeholders; appeal CTA.
- **P‑2 Diff Ribbon**
  - _User_: Toggle global **“Policy Diff”** to see added/removed/obscured elements overlay.
  - _Accept_: Legend, keyboard toggle (`d`), downloadable policy diff manifest.

### Epic O — Offline Demo Kit (ODK)

- **O‑1 Seed & Reset CLI**
  - _User_: Run `odk seed` to load fixtures; `odk reset` to clean.
  - _Accept_: Idempotent; completes <30s locally; produces demo case + assets.
- **O‑2 Talk‑Track Slides & Cues**
  - _User_: Presenter notes with timestamped cues synced to UI steps.
  - _Accept_: 5‑min and 12‑min scripts; PDF + markdown available.

### Epic C — Command Palette 1.1 (CP‑11)

- **C‑1 Recents & Hints**
  - _User_: Palette shows last 10 actions; hint row for novices.
  - _Accept_: Pinned actions configurable; telemetry on usage; `⌘K` help overlay.
- **C‑2 Bulk Ops**
  - _User_: Execute “add tag”, “group”, “export manifest (allowed)”, “send to runbook” on multi‑select.
  - _Accept_: Applies to >1k selections without jank; progress toast; undo within 10s.

### Epic R — Runbook Composer (RBC)

- **R‑1 Block Library & Variables**
  - _User_: Drag blocks (ingest/normalize/label/export) with `${vars}`; preview resolves values.
  - _Accept_: Schema‑checked; export/import JSON works; approvals optional.
- **R‑2 Approvals & History**
  - _User_: Request approval; see version history; revert.
  - _Accept_: Activity log with time, actor, diff; status chips (draft, pending, approved).

### Epic H — Hardening (HARD)

- **H‑1 Perf Budgeting**
  - _User_: Smooth tri‑pane interactions at 50k nodes.
  - _Accept_: p95 brush <50ms; selection parity events <80ms; no GC thrash spikes.
- **H‑2 A11y & States**
  - _User_: Consistent empty/error states; screen reader parity.
  - _Accept_: 0 criticals; new patterns for simulator/what‑if.

---

## 4) Deliverables (Artifacts)

- **Explainability Components**: `EvidenceRollupCard`, `RationalePanel`, `CounterfactualStrip`.
- **Policy Simulator UI**: `WhatIfModal`, `PolicyDiffRibbon`, `PolicyDiffLegend`.
- **Offline Demo Kit**: CLI (`odk`), seed pack, reset script, presenter notes.
- **Palette v1.1**: recents/hints, bulk ops, undo.
- **Runbook Composer v0.9**: block library JSON schema + UI.
- **Docs**: MDX stories, copy deck, a11y notes, perf budgets, demo scripts.

---

## 5) Work Plan (Day‑by‑Day)

- **D1–2**: X‑1 Roll‑Up Card POC; P‑1 Modal skeleton; O‑1 CLI scaffolding; perf probes.
- **D3–4**: X‑2 Rationale + copy; C‑1 Recents/Hints; RBC variables; A11y pass.
- **D5**: X‑3 Counterfactual preview; P‑2 Diff Ribbon; O‑2 talk tracks.
- **D6–7**: Bulk ops + undo; approvals & history; perf budgets + flamegraphs; states library.
- **D8–9**: Stabilize; write docs/MDX; demo rehearsals; SLO dashboards wired.
- **D10**: Stakeholder review; release; retro.

---

## 6) Definition of Done (DoD)

- Unit/integration tests; Axe/Pa11y **0 criticals**; telemetry emitting; docs complete; demo kits reproducible; performance budgets met.

---

## 7) Interfaces & Contracts

- **Explainability Contracts**

```ts
export interface EvidenceRollup {
  id: string;
  topSources: Array<{ name: string; weight: number }>;
  transform: string;
  confidence: number;
  dissent?: number;
}
export interface Rationale {
  id: string;
  plain: string;
  caveats: string[];
}
export interface Counterfactual {
  policyDelta?: string[];
  evidenceDelta?: string[];
  impact: { added: number; removed: number; changed: number };
}
```

- **Policy Simulator Contracts**

```ts
export interface PolicyInput {
  current: string[];
  proposed: string[];
}
export interface PolicyDiff {
  addedIds: string[];
  removedIds: string[];
  obscuredIds: string[];
  counts: { added: number; removed: number; obscured: number };
}
```

- **Runbook Schema (extract)**

```json
{
  "$schema": "https://example/runbook.schema.json",
  "version": "0.9",
  "vars": { "region": { "type": "string" }, "caseId": { "type": "string" } },
  "blocks": [
    { "type": "ingest", "src": "csv", "path": "./seed.csv" },
    { "type": "normalize" },
    { "type": "label", "key": "risk", "value": "${region}" }
  ]
}
```

---

## 8) Telemetry & SLOs

- **Events**: `ui.xai.rollup.view`, `ui.xai.rationale.view`, `ui.xai.counterfactual.preview`, `ui.policy.sim.open`, `ui.policy.sim.apply`, `ui.palette.bulk.exec`, `ui.runbook.approval.request`.
- **Targets**: brush p95<50ms @50k; palette exec p95<80ms; simulator preview p95<100ms; TTFI<2.3s.

---

## 9) Copy Deck Snippets

- **Rationale intro**: “Here’s why this item appears. It reflects the strongest available evidence and transformations. Consider alternate explanations below.”
- **Simulator banner**: “You’re previewing policy changes. The preview does **not** display restricted content; it estimates impact only.”

---

## 10) Jira Subtasks CSV (Import‑ready)

```csv
Summary,Issue Type,Parent Key,Assignee,Labels
XAI Roll‑Up Card — build,Sub-task,IG-1,design,ux,xai
XAI Roll‑Up Card — tests,Sub-task,IG-1,qa,ux,xai
Rationale Panel — build,Sub-task,IG-1,design,ux,xai
Rationale Panel — copy & tests,Sub-task,IG-1,qa,ux,xai
Counterfactual Preview — build,Sub-task,IG-1,design,ux,xai
Counterfactual Preview — tests,Sub-task,IG-1,qa,ux,xai
Policy What‑If Modal — build,Sub-task,IG-1,design,ux,policy
Policy What‑If Modal — tests,Sub-task,IG-1,qa,ux,policy
Policy Diff Ribbon — build,Sub-task,IG-1,design,ux,policy
Policy Diff Ribbon — tests,Sub-task,IG-1,qa,ux,policy
Offline Demo Kit CLI — build,Sub-task,IG-1,design,demo
Offline Demo Kit — talk tracks,Sub-task,IG-1,design,demo
Command Palette 1.1 — recents & hints,Sub-task,IG-1,design,ux,cmd
Command Palette 1.1 — bulk ops & undo,Sub-task,IG-1,design,ux,cmd
Runbook Composer — variables & blocks,Sub-task,IG-1,design,ux,runbook
Runbook Composer — approvals & history,Sub-task,IG-1,design,ux,runbook
Hardening — perf budgets 50k,Sub-task,IG-1,design,perf
A11y — states & simulator parity,Sub-task,IG-1,design,ux,a11y
Docs & MDX — all components,Sub-task,IG-1,design,docs
Demo Rehearsals — dry runs,Sub-task,IG-1,design,demo
```

---

## 11) GitHub Projects (v2) Bootstrap Snippet

```bash
# Add new fields for XAI and Offline areas
gh project field-create "Analyst Experience — Oct 2025" --name Area --data-type SINGLE_SELECT --options XAI,POL-SIM,ODK,CP,RBC,HARD
# Create issues from CSV above, then set Area + Status programmatically
```

---

## 12) Design Tokens v0.2 (delta)

```json
{
  "typescale": { "body": 14, "ui": 12, "h3": 20, "h2": 28, "mono": 13 },
  "motion": { "fast": 120, "base": 180, "slow": 240 },
  "opacity": { "muted": 0.72, "disabled": 0.44 }
}
```

---

## 13) Demo Scripts (updated)

- **5‑minute**: `⌘K` → case → roll‑up → rationale → policy what‑if → diff ribbon → bulk tag → export allowed manifest → runbook approval.
- **12‑minute**: Adds counterfactuals walkthrough and offline reset.

---

## 14) Risks & Mitigations

- **Policy simulation misread** → strong non‑leak banners + sample placeholders; copy reviewed.
- **Perf regressions** → budgets + flamegraph D6; freezing gate on p95.
- **Runbook scope creep** → v0.9 only (approvals/history), integrations pushed to next.

---

## 15) Handoff & Review

- Storybook links/screens; API Tsdoc; copy deck; perf report; a11y report; demo pack zip; retro template.

---

### Final Ship List

- [ ] Explainability UX v1 (roll‑ups, rationale, counterfactuals)
- [ ] Policy Simulator v1 + Diff Ribbon
- [ ] Offline Demo Kit v1
- [ ] Command Palette v1.1 (recents, bulk, undo)
- [ ] Runbook Composer v0.9 (vars, approvals, history)
- [ ] Perf & A11y hardening complete
