# Sprint Plan — IntelGraph Frontend

**Window:** Mon Sep 15 → Fri Sep 26, 2025 (America/Denver)  
**Sprint Theme:** "Make the graph explain itself"  
**Goal:** Cut analyst **Time‑to‑First‑Insight (TTFI)** and reduce path‑discovery friction by shipping an **Explain‑This‑View panel**, **provenance tooltips**, and **tri‑pane sync + time‑brushing** improvements.

---

## 1) Outcomes & Metrics (Definition of Success)

- **TTFI** on the baseline task (“identify the broker node behind Incident‑42”) improves **≥20%** vs. last sprint.
- **Explain panel usage:** ≥60% of active users trigger it at least once per session; satisfaction ≥4/5 in quick‑poll.
- **Path‑discovery time** (3‑hop neighborhood, 50k nodes) down **≥25%** with synchronized brushing.
- **A11y pass:** Keyboard‑only flows for new features; screen‑reader labels on new UI.
- **Governance guardrails visible:** When a view is blocked by policy/license, a human‑readable reason + appeal path appears.

**North‑Star:** Fewer clicks to understanding; every claim traceable to evidence.

---

## 2) Scope (This Sprint)

### A. Explain‑This‑View Panel (XAI overlay)

A contextual right‑side panel that answers: _“Why am I seeing this subgraph?”_ and _“What changed if I tweak filters?”_

- Shows: path rationales, key features, competing hypotheses links, confidence/assumptions, and diff vs. manual query.
- Inline affordances: “copy rationale to notes,” “open evidence,” “view counterfactual.”

### B. Provenance Tooltips (Claim & Source)

- Hover/Focus tooltips on nodes/edges showing **source → transform chain → license/confidence**; click to open Evidence Drawer.
- Tooltip works in graph, timeline, and map contexts.

### C. Tri‑Pane Sync + Time‑Brushing Upgrade

- Tighten synchronization among **Graph / Timeline / Map**; introduce brushed time‑window with snap presets and keyboard nudges.
- Saved Views remember brushed ranges and filters.

### D. Guardrail Notice Pattern (MVP)

- Non‑blocking toast + inline badge explaining policy/license denials with an **Appeal** affordance (routes to Ombuds queue).

> **Out of Scope (deferred):** Full command palette, undo/redo history for legacy panels, federated search UI, full narrative builder.

---

## 3) Acceptance Criteria (Feature‑Level)

### A. Explain‑This‑View

- **AC‑A1:** For any generated query, the panel renders **path rationale(s)** and **cost/row estimates** within 300ms after result paint.
- **AC‑A2:** Panel links **resolve to citations/evidence**; missing citation blocks the “Insert into Brief” action (guarded copy).
- **AC‑A3:** **Counterfactual preview** toggles and updates the subgraph diff under 800ms for N≤50k nodes neighborhood.
- **AC‑A4:** Keyboard shortcut **?** opens/closes panel; focus order respects ARIA; screen‑reader summarizes rationale headings.

### B. Provenance Tooltips

- **AC‑B1:** Tooltip shows **source id, transform chain, license short‑code, confidence band**.
- **AC‑B2:** **Escape** and **Tab** handling meets WCAG 2.1 AA/AAA expectations; no focus trap.
- **AC‑B3:** Evidence Drawer export bundles include **hash manifest** and transformation steps.

### C. Tri‑Pane Sync + Brushing

- **AC‑C1:** Dragging the timeline brush **re‑filters** map markers and graph nodes in ≤250ms at p95 on reference dataset.
- **AC‑C2:** **[ and ]** nudge window by 5m; **Alt+[/**Alt+]** by 1h; **Shift+[/**Shift+]\*\* by 1d.
- **AC‑C3:** Saved View persists **time window, filters, layout, and pinboard state**.

### D. Guardrail Notice Pattern

- **AC‑D1:** When policy denies a field/export, user sees **plain‑English reason** + **Appeal** link; event logged in immutable audit.
- **AC‑D2:** Notices appear in graph/timeline/map consistently; includes **policy id** and **legal basis** label.

---

## 4) Work Breakdown (Tickets & Estimates)

> **Scale:** 1 point ≈ ½ day. Owners may adjust in kickoff.

### Design (Figma + Specs)

- **UX‑101 (3 pts):** Explain Panel IA + content model (rationales, assumptions, CH links, confidence, diffs).
- **UX‑102 (2 pts):** Tooltip system spec (states, delays, truncation, keyboard flows) + Evidence Drawer header.
- **UX‑103 (2 pts):** Tri‑pane brush micro‑interactions + keyboard nudge cheatsheet.
- **UX‑104 (1 pt):** Guardrail notice pattern: toast + inline badge + appeal modal.
- **UX‑105 (1 pt):** A11y annotations (ARIA roles, names, relationships) for new components.

### Frontend Engineering (React+TS+Tailwind)

- **FE‑201 (5 pts):** Explain Panel shell (lazy route, state, analytics hooks).
- **FE‑202 (5 pts):** Path rationale renderer + diff view.
- **FE‑203 (3 pts):** Evidence Drawer integration + copy‑to‑notes with provenance snippet.
- **FE‑204 (5 pts):** Tri‑pane time‑brush refactor (shared store + selectors); perf pass.
- **FE‑205 (3 pts):** Keyboard nudges + Saved Views persistence.
- **FE‑206 (2 pts):** Tooltip component (graph/timeline/map adapters) with focus management.
- **FE‑207 (2 pts):** Guardrail notice component + Ombuds route.
- **FE‑208 (2 pts):** Telemetry: p95 timings, brush latency, panel open rate.

### Backend/API

- **BE‑301 (3 pts):** `/xai/rationale` endpoint: path rationales + cost estimates.
- **BE‑302 (2 pts):** `/evidence/bundle` manifest: hashes + transform chain.
- **BE‑303 (2 pts):** Policy reasoner message API (policy id, legal basis, appeal path).

### QA / Research

- **QA‑401 (2 pts):** Test plan & fixtures (baseline + post‑ship TTFI study).
- **R‑402 (3 pts):** 5 quick‑turn usability sessions (CTI Analyst, DFIR Lead, Policy Advisor personas) with SUS + task timing.

---

## 5) Milestones & Ceremonies (America/Denver)

- **Mon Sep 15, 10:00** — Sprint Planning + estimates lock.
- **Wed Sep 17, 15:00** — Design review (UX‑101..105 sign‑off).
- **Tue Sep 23, 11:00** — Mid‑sprint demo (A/B/C vertical slices ➜ internal users).
- **Fri Sep 26, 14:00** — Sprint review + retro; metrics readout; next‑sprint pre‑groom.
- **Daily:** Stand‑up 10:15 (15 min), async notes in #intelgraph‑frontend.

---

## 6) Dependencies & Risks

**Dependencies:**

- Prov‑Ledger service for evidence manifests; Policy Reasoner for guardrail text; Graph query service cost estimator.

**Risks & Mitigation:**

- _Perf regression on brush sync_ → feature flag + query budgeter; create frozen sampling mode for heavy subgraphs.
- _Citations missing for certain nodes_ → block export actions; show missing‑evidence banner with add‑evidence CTA.
- _Tooltip overcrowding_ → progressive disclosure; “More…” opens drawer.

---

## 7) Governance, Privacy & A11y

- **Reason‑for‑access prompts** logged when opening evidence bundles.
- **License/TOS** badges surfaced in tooltips; appeal path documented.
- **WCAG 2.1**: Focus order, ARIA labels, color‑independent cues, motion‑reduction preference respected.

---

## 8) Analytics & Telemetry

- Events: `explain.open`, `explain.copy`, `brush.move`, `guardrail.view`, `evidence.open`, `savedView.save`.
- Timers: `brush_to_paint_ms`, `explain_render_ms`, `p95_latency_ms`.
- Goals dashboard: TTFI delta, path‑discovery time delta, explain usage, guardrail appeal rate.

---

## 9) Deliverables / Artifacts

- Figma files: Explain Panel, Tooltip spec, Brush interactions, Guardrail patterns.
- React components: `<ExplainPanel/>`, `<ProvenanceTooltip/>`, `<TimeBrush/>`, `<GuardrailNotice/>`.
- API contracts: `/xai/rationale`, `/evidence/bundle`, `/policy/reason` (OpenAPI snippets).
- Test materials: baseline vs. post‑ship tasks; SUS survey; screen‑reader scripts.
- Demo script for review: "Walk an analyst from raw subgraph → confidence & evidence → shareable brief."

---

## 10) Team & RACI (example names)

- **PM (A/R):** Coordinator
- **Design (R):** Nick (lead), Support: Kare
- **Frontend (R):** Alex, Priya
- **Backend (R):** Samir
- **QA/UXR (R):** Jamie
- **Ombuds/Policy (C):** Dana
- **SRE/Perf (C):** Lee
- **Stakeholders (I):** Discovery Leads, Testing & Iteration Leaders

---

## 11) Exit Criteria (DoD)

- All ACs met; p95 perf within targets; a11y checks pass; audit events verified; docs updated; demo recorded; retro actions logged.

---

### Appendix — Keyboard Map (New)

- **?** Toggle Explain Panel
- **[ / ]** Nudge brush −/+
- **Alt+[ / Alt+]** Nudge by 1h; **Shift+[ / Shift+]** by 1d
- **Esc** Close tooltip/drawer; **Enter** follow primary action in focused panel

---

## 12) Ticket Pack — Jira/Linear‑ready (copy‑paste)

> Each ticket includes: Title · Summary · Acceptance Criteria · Subtasks · Estimate · Owner · Labels · Dependencies · DoD

### Design

**UX‑101 — Explain Panel IA & Content Model (3 pts)**  
**Summary:** Information architecture for Explain‑This‑View; content schema for rationales, assumptions, counterfactuals, confidence bands, diffs.  
**AC:** IA reviewed; content types & states documented; empty/error/loading states covered; a11y annotations started.  
**Subtasks:** Frame map; Schema doc; Error + empty; A11y notes.  
**Owner:** Nick · **Labels:** design, xai, a11y

**UX‑102 — Provenance Tooltip Spec (2 pts)**  
**AC:** Hover/focus delays, truncation rules, keyboard flow, evidence header spec.  
**Owner:** Nick · **Labels:** design, provenance, a11y

**UX‑103 — Tri‑Pane Brush Interactions (2 pts)**  
**AC:** Brush handles, snap presets, keyboard nudge cheatsheet.  
**Owner:** Nick · **Labels:** design, timeline, perf

**UX‑104 — Guardrail Notice Pattern (1 pt)**  
**AC:** Toast + inline badge + appeal modal; copy variants drafted.  
**Owner:** Kare · **Labels:** design, governance

**UX‑105 — A11y Annotations (1 pt)**  
**AC:** ARIA roles/names; focus order; reduced‑motion variants.  
**Owner:** Kare · **Labels:** design, a11y

### Frontend Engineering

**FE‑201 — Explain Panel Shell (5 pts)**  
**Summary:** Lazy route, panel state, analytics hooks, hotkey `?`.  
**AC:** Opens in ≤150ms after command; state persisted per view; telemetry `explain.open` fires; focus trap compliant.  
**Subtasks:** Route + context; Hotkey + focus; Analytics; Unit tests.  
**Owner:** Alex · **Labels:** frontend, xai, a11y

**FE‑202 — Rationale Renderer + Diff (5 pts)**  
**AC:** Renders rationale blocks, assumptions, confidence; diff badges for counterfactual; copy‑to‑notes gated on citations.  
**Owner:** Priya · **Labels:** frontend, xai, evidence

**FE‑203 — Evidence Drawer Integration (3 pts)**  
**AC:** Opens via tooltip & panel; export bundle includes hash manifest; copy snippet includes provenance chain.  
**Owner:** Alex · **Labels:** frontend, provenance

**FE‑204 — Tri‑Pane Time‑Brush Refactor (5 pts)**  
**AC:** Shared store/selectors; p95 brush→paint ≤250ms; sync filters across graph/map/timeline; feature flag.  
**Owner:** Priya · **Labels:** frontend, timeline, perf

**FE‑205 — Keyboard Nudges + Saved Views (3 pts)**  
**AC:** `[ / ]`, `Alt+`, `Shift+` behaviors; Saved View captures time window, filters, layout, pinboard.  
**Owner:** Alex · **Labels:** frontend, timeline, persistence

**FE‑206 — Provenance Tooltip Component (2 pts)**  
**AC:** Works in graph/timeline/map; hover/focus/press states; escape & tab behavior; composable slot for license badge.  
**Owner:** Priya · **Labels:** frontend, provenance, a11y

**FE‑207 — Guardrail Notice Component (2 pts)**  
**AC:** Toast + inline; displays policy id & legal basis; Ombuds route link.  
**Owner:** Alex · **Labels:** frontend, governance

**FE‑208 — Telemetry & Perf Timers (2 pts)**  
**AC:** `brush_to_paint_ms`, `explain_render_ms`, `p95_latency_ms`; dashboard wiring; sampling guard.  
**Owner:** Priya · **Labels:** frontend, perf, analytics

### Backend/API

**BE‑301 — `/xai/rationale` Endpoint (3 pts)**  
**AC:** Accepts query spec; returns rationales + cost estimates; 95p ≤200ms for baseline payload; errors typed.  
**Owner:** Samir · **Labels:** backend, xai

**BE‑302 — `/evidence/bundle` Manifest (2 pts)**  
**AC:** Hashes + transform chain; signed bundle; pagination for >50 items.  
**Owner:** Samir · **Labels:** backend, provenance, security

**BE‑303 — Policy Reasoner Message API (2 pts)**  
**AC:** Reason text, policy id, legal basis, appeal path; localized strings support.  
**Owner:** Samir · **Labels:** backend, governance, i18n

### QA / Research

**QA‑401 — Test Plan & Fixtures (2 pts)**  
**AC:** Baseline vs post‑ship tasks; fixture datasets; WCAG checks list; perf harness for brush.  
**Owner:** Jamie · **Labels:** qa, a11y, perf

**R‑402 — Usability Sessions ×5 (3 pts)**  
**AC:** Recruit CTI/DFIR/Policy personas; SUS + task timing; insight report; top‑5 fixes.  
**Owner:** Jamie · **Labels:** research, uxr

---

## 13) CSV — Quick Import (Linear/Jira)

> Columns: Team,Key,Title,Estimate,Assignee,Labels,DependsOn,Description

```
Design,UX-101,Explain Panel IA & Content,3,Nick,"design;xai;a11y",,IA + content model for rationales/assumptions/counterfactuals.
Design,UX-102,Provenance Tooltip Spec,2,Nick,"design;provenance;a11y",,Tooltip states + keyboard flows + Evidence header.
Design,UX-103,Tri-Pane Brush Interactions,2,Nick,"design;timeline;perf",,Brush handles,snap,cheatsheet.
Design,UX-104,Guardrail Notice Pattern,1,Kare,"design;governance",,Toast + badge + appeal modal.
Design,UX-105,A11y Annotations,1,Kare,"design;a11y",,ARIA roles/names, focus order, reduced motion.
Frontend,FE-201,Explain Panel Shell,5,Alex,"frontend;xai;a11y",UX-101,Lazy route,state,hotkey,analytics.
Frontend,FE-202,Rationale Renderer + Diff,5,Priya,"frontend;xai;evidence",FE-201,Blocks,diff,citation gating.
Frontend,FE-203,Evidence Drawer Integration,3,Alex,"frontend;provenance",UX-102,Drawer + bundle + copy snippet.
Frontend,FE-204,Tri-Pane Brush Refactor,5,Priya,"frontend;timeline;perf",UX-103,Shared store,sync,feature flag.
Frontend,FE-205,Keyboard Nudges + Saved Views,3,Alex,"frontend;timeline;persistence",FE-204,Nudges,[,],Alt,Shift; saved views.
Frontend,FE-206,Provenance Tooltip Component,2,Priya,"frontend;provenance;a11y",UX-102,Adapters + focus mgmt.
Frontend,FE-207,Guardrail Notice Component,2,Alex,"frontend;governance",UX-104,Toast + inline badge + Ombuds link.
Frontend,FE-208,Telemetry & Perf Timers,2,Priya,"frontend;perf;analytics",FE-204,Timers + dashboard wiring.
Backend,BE-301,/xai/rationale Endpoint,3,Samir,"backend;xai",,Rationales + cost; typed errors.
Backend,BE-302,/evidence/bundle Manifest,2,Samir,"backend;provenance;security",,Hashes + transform chain; signed bundle.
Backend,BE-303,Policy Reasoner API,2,Samir,"backend;governance;i18n",,Reason text + policy id + appeal path.
QA/UXR,QA-401,Test Plan & Fixtures,2,Jamie,"qa;a11y;perf",,Baseline/post tasks; perf harness.
QA/UXR,R-402,Usability Sessions x5,3,Jamie,"research;uxr",QA-401,SUS + timing + report.
```

---

## 14) Figma Checklist (ship‑ready)

- Cover frames with sprint code & status (🟢 Ready / 🟡 WIP / 🔴 Blocked).
- Component library updates: `<ExplainPanel/>`, `<ProvenanceTooltip/>`, `<TimeBrush/>`, `<GuardrailNotice/>` with properties for states.
- Design tokens: spacing, radii (2xl), type scale, z‑index for overlays; reduced‑motion variants.
- Prototypes: keyboard flows (`?`, `[`, `]`, `Esc`, `Enter`), screen‑reader outlines.
- Redlines: padding, hit‑targets (≥44px), focus order.
- Annotations: empty/loading/error states; policy copy variants; i18n string lengths.
- Export: PNG slices for dev; Figma links attached to tickets.

---

## 15) OpenAPI Stubs (reference)

```yaml
openapi: 3.0.3
info: { title: IntelGraph Sprint APIs, version: 0.1.0 }
paths:
  /xai/rationale:
    post:
      summary: Generate rationales for a query result
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                querySpec: { type: object }
                counterfactual: { type: object }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  rationales: { type: array, items: { type: object } }
                  costEstimate: { type: object }
        '400': { description: Bad Request }
  /evidence/bundle:
    get:
      summary: Get evidence bundle for a node/edge
      parameters:
        - in: query
          name: id
          required: true
          schema: { type: string }
      responses:
        '200': { description: OK }
  /policy/reason:
    post:
      summary: Explain a guardrail decision
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                policyId: { type: string }
                context: { type: object }
      responses:
        '200': { description: OK }
```

---

## 16) Test Plan (condensed)

- **Perf:** Brush→paint p95 ≤250ms; Explain render ≤300ms post‑paint; Evidence open ≤500ms p95.
- **A11y:** Keyboard‑only task pass; NVDA/VO label audit; reduced‑motion behaviors verified; color‑independent cues.
- **Usability:** 5 sessions × 45min; task: “Find broker node for Incident‑42 & justify with evidence.” Targets: TTFI −20%, SUS ≥80.
- **Regression:** Map/graph selection sync; Saved Views persistence; tooltip dismissal.

---

## 17) Capacity & Load

- **Points per role:** Design 9 / FE 27 / BE 7 / QA/UXR 5 → **Total 48 pts** (1 pt ≈ 0.5 day).
- **Nominal capacity (10 workdays):** Nick 20, Kare 20, Alex 20, Priya 20, Samir 20, Jamie 20 → ample headroom.
- **Plan:** Keep ~30–40% buffer for polish, perf tuning, and findings from R‑402.

**Stretch (non‑blocking, pick up after mid‑sprint demo if green):**

- **FE‑209 (3 pts):** Command Palette skeleton (open/close, command registry; no destructive actions).
- **FE‑210 (2 pts):** Undo/Redo instrumentation scaffold for new panels.

---

## 18) Day‑by‑Day Cadence (America/Denver)

- **Mon 09/15:** Kickoff; FE‑201/BE‑301 start; UX‑101/102 in progress; QA‑401 scaffolding.
- **Tue 09/16:** FE‑204 scaffolding; FE‑206 spike; BE‑302 sketch; copy review for guardrails.
- **Wed 09/17:** Design review; FE‑202 start; BE‑303 stub; Perf harness ready.
- **Thu 09/18:** Integrate FE‑203; first end‑to‑end of tooltip→drawer.
- **Fri 09/19:** Perf pass on brush; save/load views; A11y audit pass‑1.
- **Mon 09/22:** R‑402 sessions 1–2; fix round.
- **Tue 09/23:** Mid‑sprint demo; decide on Stretch pick‑ups.
- **Wed 09/24:** R‑402 sessions 3–5; polish Explain copy; telemetry wiring.
- **Thu 09/25:** Final a11y/perf sweep; audit log verification.
- **Fri 09/26:** Review + retro; docs & demo recording.

---

## 19) Demo Script (review day)

1. Open incident Saved View → brush to affected window → watch graph/map sync (timer overlay shows ≤250ms).
2. Hover node → provenance tooltip → open Evidence Drawer → export bundle (hash manifest shown).
3. Toggle Explain panel → copy rationale to notes → flip counterfactual toggle → observe diff chips.
4. Trigger guardrail on restricted field → notice appears → follow Appeal link.
5. Wrap with metrics dashboard: TTFI delta, usage, perf.

---

## 20) Retro Prompts

- Where did Explain panel create/close the loop fastest?
- Was provenance understandable without training? What copy confused?
- Which perf targets were closest to redline?
- What to automate before next sprint (fixtures, lint rules, storybook a11y)?
