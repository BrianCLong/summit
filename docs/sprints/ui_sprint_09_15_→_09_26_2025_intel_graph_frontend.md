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
