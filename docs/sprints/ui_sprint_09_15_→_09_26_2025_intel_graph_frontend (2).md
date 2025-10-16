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

---

## 21) Owners & Due Dates (committed)

| Key    | Title                         | Assignee | Due (YYYY‑MM‑DD) |
| ------ | ----------------------------- | -------- | ---------------- |
| UX‑101 | Explain Panel IA & Content    | Nick     | 2025‑09‑17       |
| UX‑102 | Provenance Tooltip Spec       | Nick     | 2025‑09‑17       |
| UX‑103 | Tri‑Pane Brush Interactions   | Nick     | 2025‑09‑17       |
| UX‑104 | Guardrail Notice Pattern      | Kare     | 2025‑09‑16       |
| UX‑105 | A11y Annotations              | Kare     | 2025‑09‑18       |
| FE‑201 | Explain Panel Shell           | Alex     | 2025‑09‑17       |
| FE‑202 | Rationale Renderer + Diff     | Priya    | 2025‑09‑22       |
| FE‑203 | Evidence Drawer Integration   | Alex     | 2025‑09‑19       |
| FE‑204 | Tri‑Pane Time‑Brush Refactor  | Priya    | 2025‑09‑22       |
| FE‑205 | Keyboard Nudges + Saved Views | Alex     | 2025‑09‑23       |
| FE‑206 | Provenance Tooltip Component  | Priya    | 2025‑09‑18       |
| FE‑207 | Guardrail Notice Component    | Alex     | 2025‑09‑22       |
| FE‑208 | Telemetry & Perf Timers       | Priya    | 2025‑09‑24       |
| BE‑301 | /xai/rationale Endpoint       | Samir    | 2025‑09‑17       |
| BE‑302 | /evidence/bundle Manifest     | Samir    | 2025‑09‑19       |
| BE‑303 | Policy Reasoner Message API   | Samir    | 2025‑09‑18       |
| QA‑401 | Test Plan & Fixtures          | Jamie    | 2025‑09‑17       |
| R‑402  | Usability Sessions ×5         | Jamie    | 2025‑09‑24       |

### 21.1) Updated CSV (with DueDate)

```
Team,Key,Title,Estimate,Assignee,Labels,DependsOn,DueDate,Description
Design,UX-101,Explain Panel IA & Content,3,Nick,"design;xai;a11y",,2025-09-17,IA + content model for rationales/assumptions/counterfactuals.
Design,UX-102,Provenance Tooltip Spec,2,Nick,"design;provenance;a11y",,2025-09-17,Tooltip states + keyboard flows + Evidence header.
Design,UX-103,Tri-Pane Brush Interactions,2,Nick,"design;timeline;perf",,2025-09-17,Brush handles,snap,cheatsheet.
Design,UX-104,Guardrail Notice Pattern,1,Kare,"design;governance",,2025-09-16,Toast + badge + appeal modal.
Design,UX-105,A11y Annotations,1,Kare,"design;a11y",,2025-09-18,ARIA roles/names, focus order, reduced motion.
Frontend,FE-201,Explain Panel Shell,5,Alex,"frontend;xai;a11y",UX-101,2025-09-17,Lazy route,state,hotkey,analytics.
Frontend,FE-202,Rationale Renderer + Diff,5,Priya,"frontend;xai;evidence",FE-201,2025-09-22,Blocks,diff,citation gating.
Frontend,FE-203,Evidence Drawer Integration,3,Alex,"frontend;provenance",UX-102,2025-09-19,Drawer + bundle + copy snippet.
Frontend,FE-204,Tri-Pane Brush Refactor,5,Priya,"frontend;timeline;perf",UX-103,2025-09-22,Shared store,sync,feature flag.
Frontend,FE-205,Keyboard Nudges + Saved Views,3,Alex,"frontend;timeline;persistence",FE-204,2025-09-23,Nudges,[,],Alt,Shift; saved views.
Frontend,FE-206,Provenance Tooltip Component,2,Priya,"frontend;provenance;a11y",UX-102,2025-09-18,Adapters + focus mgmt.
Frontend,FE-207,Guardrail Notice Component,2,Alex,"frontend;governance",UX-104,2025-09-22,Toast + inline badge + Ombuds link.
Frontend,FE-208,Telemetry & Perf Timers,2,Priya,"frontend;perf;analytics",FE-204,2025-09-24,Timers + dashboard wiring.
Backend,BE-301,/xai/rationale Endpoint,3,Samir,"backend;xai",,2025-09-17,Rationales + cost; typed errors.
Backend,BE-302,/evidence/bundle Manifest,2,Samir,"backend;provenance;security",,2025-09-19,Hashes + transform chain; signed bundle.
Backend,BE-303,Policy Reasoner API,2,Samir,"backend;governance;i18n",,2025-09-18,Reason text + policy id + appeal path.
QA/UXR,QA-401,Test Plan & Fixtures,2,Jamie,"qa;a11y;perf",,2025-09-17,Baseline/post tasks; perf harness.
QA/UXR,R-402,Usability Sessions x5,3,Jamie,"research;uxr",QA-401,2025-09-24,SUS + timing + report.
```

---

## 22) Storybook Scaffolds (CSF3) + Component Stubs

> Tech: React + TypeScript + Tailwind + shadcn/ui + framer‑motion. Accessible, keyboard‑first, minimal.

### 22.1) `<ExplainPanel/>`

```tsx
// src/components/ExplainPanel.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

export type Rationale = {
  id: string;
  title: string;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  assumptions?: string[];
  citations?: Array<{ id: string; label: string }>;
};

export interface ExplainPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rationales: Rationale[];
  onCopy?: (r: Rationale) => void;
  counterfactualEnabled?: boolean;
  onToggleCounterfactual?: (v: boolean) => void;
}

export default function ExplainPanel({
  isOpen,
  onClose,
  rationales,
  onCopy,
  counterfactualEnabled,
  onToggleCounterfactual,
}: ExplainPanelProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '?') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          role="complementary"
          aria-label="Explain this view"
          initial={{ x: 480, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed right-0 top-0 h-dvh w-[420px] bg-white dark:bg-neutral-900 shadow-2xl border-l z-50 grid grid-rows-[auto,1fr]"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              <span className="font-medium">Explain this view</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close explain panel"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="p-4">
            <div className="space-y-3">
              {rationales.map((r) => (
                <Card key={r.id} className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{r.title}</span>
                      <Badge
                        variant={
                          r.confidence === 'high'
                            ? 'default'
                            : r.confidence === 'medium'
                              ? 'secondary'
                              : 'outline'
                        }
                        aria-label={`confidence ${r.confidence}`}
                      >
                        {r.confidence}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-2">{r.summary}</p>
                    {r.assumptions?.length ? (
                      <ul className="list-disc ml-5 mb-2">
                        {r.assumptions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    ) : null}
                    {!!r.citations?.length && (
                      <div
                        className="flex flex-wrap gap-2"
                        aria-label="citations"
                      >
                        {r.citations.map((c) => (
                          <Badge key={c.id} variant="outline">
                            {c.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCopy?.(r)}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy to notes
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          counterfactualEnabled ? 'default' : 'secondary'
                        }
                        onClick={() =>
                          onToggleCounterfactual?.(!counterfactualEnabled)
                        }
                      >
                        Counterfactual
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
```

```tsx
// src/components/ExplainPanel.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import ExplainPanel, { Rationale } from './ExplainPanel';

const meta: Meta<typeof ExplainPanel> = {
  title: 'IntelGraph/ExplainPanel',
  component: ExplainPanel,
  args: {
    isOpen: true,
    rationales: [
      {
        id: 'r1',
        title: 'Shortest paths emphasize broker node',
        summary:
          'Paths weighted by betweenness centrality highlight Broker‑42 as a cut vertex.',
        confidence: 'high',
        assumptions: ['Weights derived from last 24h edges'],
        citations: [{ id: 'c1', label: 'EVID‑128' }],
      },
      {
        id: 'r2',
        title: 'Counterfactual removes vendor edges',
        summary:
          'Removing vendor edges isolates two communities; suspect link disappears.',
        confidence: 'medium',
      },
    ] satisfies Rationale[],
  },
};
export default meta;
export const Default: StoryObj<typeof ExplainPanel> = {};
```

### 22.2) `<ProvenanceTooltip/>`

```tsx
// src/components/ProvenanceTooltip.tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { ReactNode } from 'react';

export interface ProvenanceTooltipProps {
  children: ReactNode;
  sourceId: string;
  transformChain: string[];
  licenseCode: string;
  confidence: 'low' | 'medium' | 'high';
}

export default function ProvenanceTooltip({
  children,
  sourceId,
  transformChain,
  licenseCode,
  confidence,
}: ProvenanceTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 focus:outline-none focus:ring rounded-md"
            tabIndex={0}
          >
            {children}
            <Info className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-3 text-xs">
          <div className="font-medium mb-1">Provenance</div>
          <div className="grid gap-1">
            <div>
              <span className="opacity-70">Source:</span> {sourceId}
            </div>
            <div>
              <span className="opacity-70">Transform:</span>{' '}
              {transformChain.join(' → ')}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{licenseCode}</Badge>
              <Badge
                variant={
                  confidence === 'high'
                    ? 'default'
                    : confidence === 'medium'
                      ? 'secondary'
                      : 'outline'
                }
                aria-label={`confidence ${confidence}`}
              >
                {confidence}
              </Badge>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

```tsx
// src/components/ProvenanceTooltip.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import ProvenanceTooltip from './ProvenanceTooltip';

const meta: Meta<typeof ProvenanceTooltip> = {
  title: 'IntelGraph/ProvenanceTooltip',
  component: ProvenanceTooltip,
  args: {
    sourceId: 'SRC‑A12',
    transformChain: ['normalize', 'geocode', 'join: vendors'],
    licenseCode: 'CC‑BY‑SA',
    confidence: 'medium',
  },
};
export default meta;
export const Default: StoryObj<typeof ProvenanceTooltip> = {
  render: (args) => (
    <ProvenanceTooltip {...args}>
      <button className="px-2 py-1 rounded-md border">Hover me</button>
    </ProvenanceTooltip>
  ),
};
```

### 22.3) `<TimeBrush/>`

```tsx
// src/components/TimeBrush.tsx
import { useRef, useState, useEffect } from 'react';

export interface TimeBrushProps {
  start: number; // epoch ms
  end: number; // epoch ms
  value: [number, number];
  onChange: (next: [number, number]) => void;
  onNudge?: (deltaMs: number) => void;
}

export default function TimeBrush({
  start,
  end,
  value,
  onChange,
  onNudge,
}: TimeBrushProps) {
  const [v, setV] = useState<[number, number]>(value);
  const width = 600;
  const pxPerMs = width / (end - start);

  useEffect(() => setV(value), [value]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '[') onNudge?.(-5 * 60 * 1000);
      if (e.key === ']') onNudge?.(5 * 60 * 1000);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNudge]);

  function clamp(ms: number) {
    return Math.min(end, Math.max(start, ms));
  }
  function moveHandle(which: 0 | 1, clientX: number) {
    const rect = (
      document.getElementById('brush-track') as HTMLDivElement
    )?.getBoundingClientRect();
    if (!rect) return;
    const ms = clamp(start + (clientX - rect.left) / pxPerMs);
    const next: [number, number] = which === 0 ? [ms, v[1]] : [v[0], ms];
    const sorted: [number, number] =
      next[0] <= next[1] ? next : [next[1], next[0]];
    setV(sorted);
    onChange(sorted);
  }

  return (
    <div className="inline-block">
      <div
        id="brush-track"
        className="relative h-10 w-[600px] bg-neutral-100 rounded-xl"
        aria-label="time brush"
      >
        {/* selection */}
        <div
          className="absolute top-0 h-10 bg-neutral-200 rounded-xl"
          style={{
            left: (v[0] - start) * pxPerMs,
            width: (v[1] - v[0]) * pxPerMs,
          }}
        />
        {/* handles */}
        {[0, 1].map((i) => (
          <div
            key={i}
            role="slider"
            aria-valuemin={start}
            aria-valuemax={end}
            aria-valuenow={v[i as 0 | 1]}
            tabIndex={0}
            className="absolute top-0 h-10 w-3 -ml-1.5 bg-white border rounded-md shadow cursor-col-resize"
            style={{ left: (v[i as 0 | 1] - start) * pxPerMs }}
            onMouseDown={(e) => {
              const onMove = (ev: MouseEvent) =>
                moveHandle(i as 0 | 1, ev.clientX);
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/components/TimeBrush.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import TimeBrush from './TimeBrush';

const now = Date.now();
const start = now - 6 * 60 * 60 * 1000;
const end = now;

const meta: Meta<typeof TimeBrush> = {
  title: 'IntelGraph/TimeBrush',
  component: TimeBrush,
  args: { start, end, value: [start + 60 * 60 * 1000, end - 60 * 60 * 1000] },
};
export default meta;
export const Default: StoryObj<typeof TimeBrush> = {
  render: (args) => (
    <TimeBrush {...args} onChange={() => {}} onNudge={() => {}} />
  ),
};
```

### 22.4) `<GuardrailNotice/>`

```tsx
// src/components/GuardrailNotice.tsx
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface GuardrailNoticeProps {
  variant?: 'toast' | 'inline';
  policyId: string;
  legalBasis: string;
  reason: string;
  onAppeal: () => void;
}

export default function GuardrailNotice({
  variant = 'inline',
  policyId,
  legalBasis,
  reason,
  onAppeal,
}: GuardrailNoticeProps) {
  const body = (
    <div className="flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 mt-0.5" aria-hidden />
      <div className="text-sm">
        <div className="font-medium">Action limited by policy</div>
        <div className="opacity-80">{reason}</div>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline">{policyId}</Badge>
          <Badge variant="secondary">{legalBasis}</Badge>
          <Button size="sm" onClick={onAppeal}>
            Appeal
          </Button>
        </div>
      </div>
    </div>
  );
  return variant === 'toast' ? (
    <div
      role="status"
      className="fixed bottom-4 right-4 max-w-sm p-3 rounded-xl shadow-lg bg-white border"
    >
      {body}
    </div>
  ) : (
    <div
      role="note"
      className="w-full p-3 rounded-xl border bg-amber-50 text-amber-950"
    >
      {body}
    </div>
  );
}
```

```tsx
// src/components/GuardrailNotice.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import GuardrailNotice from './GuardrailNotice';

const meta: Meta<typeof GuardrailNotice> = {
  title: 'IntelGraph/GuardrailNotice',
  component: GuardrailNotice,
  args: {
    policyId: 'POL‑R‑17',
    legalBasis: 'License EULA §4b',
    reason:
      'Export of full text from Source‑X is restricted in this workspace.',
  },
};
export default meta;
export const Inline: StoryObj<typeof GuardrailNotice> = {
  args: { variant: 'inline', onAppeal: () => {} },
};
export const Toast: StoryObj<typeof GuardrailNotice> = {
  args: { variant: 'toast', onAppeal: () => {} },
};
```

---

## 23) Testing Scaffolds (Vitest + RTL)

```tsx
// src/components/ExplainPanel.test.tsx
import { render, screen } from '@testing-library/react';
import ExplainPanel from './ExplainPanel';

test('renders rationale titles and confidence badges', () => {
  render(
    <ExplainPanel
      isOpen
      rationales={[{ id: '1', title: 'T', summary: 'S', confidence: 'high' }]}
      onClose={() => {}}
    />,
  );
  expect(screen.getByText('T')).toBeInTheDocument();
  expect(screen.getByLabelText(/confidence high/i)).toBeInTheDocument();
});
```

```tsx
// src/components/ProvenanceTooltip.test.tsx
import { render, screen } from '@testing-library/react';
import ProvenanceTooltip from './ProvenanceTooltip';

test('has focusable trigger', () => {
  render(
    <ProvenanceTooltip
      sourceId="S"
      transformChain={['a', 'b']}
      licenseCode="L"
      confidence="low"
    >
      <span>trigger</span>
    </ProvenanceTooltip>,
  );
  expect(screen.getByText('trigger').closest('span')).toHaveAttribute(
    'tabindex',
    '0',
  );
});
```

```tsx
// src/components/TimeBrush.test.tsx
import { render } from '@testing-library/react';
import TimeBrush from './TimeBrush';

test('renders selection area', () => {
  const now = Date.now();
  const start = now - 3600000;
  const end = now;
  const { container } = render(
    <TimeBrush
      start={start}
      end={end}
      value={[start + 600000, end - 600000]}
      onChange={() => {}}
    />,
  );
  expect(container.querySelector('#brush-track')).toBeTruthy();
});
```

```tsx
// src/components/GuardrailNotice.test.tsx
import { render, screen } from '@testing-library/react';
import GuardrailNotice from './GuardrailNotice';

test('renders policy info', () => {
  render(
    <GuardrailNotice
      policyId="P1"
      legalBasis="LAB"
      reason="Nope"
      onAppeal={() => {}}
    />,
  );
  expect(screen.getByText('P1')).toBeInTheDocument();
  expect(screen.getByText('LAB')).toBeInTheDocument();
});
```

---

## 24) Storybook Setup Notes

- Add stories to `src/components/*/*.stories.tsx`; CSF3 format used.
- If using shadcn/ui, ensure its provider styles are loaded in `.storybook/preview.tsx` (Tailwind CSS in preview head).
- Keyboard map: `?` toggled in app layer; stories simulate `isOpen` prop directly.
- Accessibility: run `@storybook/addon-a11y`; verify focus rings, ARIA labels, and Esc/Tab behavior.
