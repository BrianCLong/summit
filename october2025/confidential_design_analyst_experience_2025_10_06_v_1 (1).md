# Confidential Design — Analyst Experience & Design Systems Sprint (Oct 6–17, 2025) v1.0

> Mission: ship clean, green, functional UX that closes priority gaps for IntelGraph GA, aligned with active Q4 sprints. Focus areas: analyst tri‑pane, provenance & policy clarity, command palette, demo‑ready flows, A11y AAA, and design maturity scaffolding.

---

## 0) Alignment Snapshot
- **Cadence**: 2‑week sprint **Oct 6 → Oct 17, 2025** (parallel with Integration Mega Sprint, GA Release Bundle, Offline Kit v1, SLO dashboards).
- **Dependencies (external)**: Ingestion Wizard (A2), Provenance Ledger (B4), Policy/OPA bundle, Cost Guard, Graph Explorer upgrades, CI/CD Release Hardening.
- **Interfaces we produce**: Analyst Tri‑Pane (Graph↔Timeline↔Map), Provenance Tooltips, Policy Denial Explainers, Command Palette, Runbook Proof panels, Demo Scripts.
- **Exit Criteria**: 100% green on A11y gates; demo flow (Investigate → Resolve → Runbook → Report) runnable end‑to‑end; provenance & policy visible in‑UI for all evidence.

---

## 1) Gaps Identified (Design Lane)
1. **Provenance discoverability** — Evidence/claim lineage not consistently surfaced; users can’t tell *why* a node/edge exists.
2. **Policy/License denial UX** — Blocks lack explain‑why, appeal path, and next‑best action.
3. **Commandability** — No universal command palette for power users (keyboard‑first, fuzzy). Slows time‑to‑action.
4. **Tri‑pane synchronization** — Partial coupling across Graph, Timeline, Map; brushing inconsistencies and unclear selection states.
5. **A11y & Empty/Error states** — Systematic patterns missing; inconsistent focus order and roles; empty/error states ad‑hoc.
6. **Demo‑grade flow** — The Golden Path (create case → ingest → resolve → runbook → brief) lacks a rehearsed, one‑click demo scaffold.
7. **Telemetry for UX** — No standardized UX metrics wiring (TTFI, selection latency, path‑to‑insight steps, palette usage).
8. **Content design** — Microcopy patterns for caveats, confidence bands, and dissent not centralized.
9. **Design tokens/system** — Inconsistent spacing, typography scale, and density across screens; no token source of truth.

---

## 2) Sprint Goals & Non‑Goals
**Goals**
- G1: Ship **Provenance & Policy Clarity v1** (tooltips, detail sheet, block modals).
- G2: Ship **Command Palette v1** with ~20 essential actions & fuzzy search.
- G3: Ship **Tri‑Pane Sync v1** (selection + time‑brush coherence + diff overlay).
- G4: Establish **A11y AAA baseline** and **Empty/Error patterns**.
- G5: Land **Demo Script & Data Pack v1** and **UX Telemetry starter**.

**Non‑Goals (this sprint)**
- Full Graph‑XAI visualizations (keep to evidence roll‑ups); narrative causality maps; advanced simulations UI. (Planned next sprints.)

---

## 3) Backlog → Stories & Acceptance
> _All stories carry A11y, telemetry, docs, tests, and demo tasks by definition of done._

### Epic A — Provenance & Policy Clarity (PPC)
- **A‑1 Provenance Tooltip v1**
  - *User*: As an analyst, I can hover any node/edge/badge to see source(s), transforms, hash, confidence.
  - *Accept*: Tooltip shows **source→claim→transform** chain; copy‑to‑clipboard; links to detail sheet; keyboard trigger `?` works. Performance <16ms paint on hover.
- **A‑2 Evidence Detail Sheet**
  - *User*: I can open a side sheet with full lineage, license, timestamps, and contradiction flags.
  - *Accept*: Sheet loads in <250ms; includes **“Explain this view”** mini‑map; export manifest button appears if allowed.
- **A‑3 Policy Denial Explainer**
  - *User*: When blocked (license/authority), I see plain‑language reason, clause reference, request‑override path, and next‑best action.
  - *Accept*: Contains reason, owner, appeal CTA, and **simulator link** (“What would change access?”) without leaking disallowed data.

### Epic B — Command Palette (CP)
- **B‑1 Palette Core**
  - *User*: `⌘K` opens palette; I can fuzzy search actions/entities; results ranked by recency/context.
  - *Accept*: Key actions (create case, add entity, import CSV/STIX, run runbook, toggle diff, zoom to time window, share view) work; latency <80ms.
- **B‑2 Extensibility**
  - *User*: Plugins register commands with schema (icon, scope, guard).
  - *Accept*: 10+ commands registered from Graph, Timeline, Map, Runbook, Report.

### Epic C — Tri‑Pane Sync (TPS)
- **C‑1 Selection Parity** — Selection in any pane highlights corresponding items in the others; includes keyboard navigation.
  - *Accept*: 100% selection parity; narrated by screen reader; visual focus style meets contrast ≥4.5:1.
- **C‑2 Time‑Brush Coherence** — Drag on timeline filters graph and map; brush shows min/max; reset in 1 click.
  - *Accept*: Brushing never exceeds 50ms debounce; no stale highlights.
- **C‑3 Diff Overlay** — Toggle **“What changed?”**: show added/removed/altered nodes/edges with subtle badges.
  - *Accept*: Legend present; downloadable change list.

### Epic D — A11y & States (AXP)
- **D‑1 A11y Baseline** — Roles/landmarks; tab order; skip links; focus management; aria‑labels; color tokens.
  - *Accept*: Axe and Pa11y suites: **0 criticals**; keyboard‑only demo passes.
- **D‑2 Empty/Error Patterns** — Standardized states with recovery actions and links to docs.
  - *Accept*: Library of 8 patterns (empty dataset, no match, license block, network fail, rate limit, slow query, no authority, stale view).

### Epic E — Demo & Telemetry (DTX)
- **E‑1 Golden Path Demo Pack** — Script + fixtures + one‑click seed.
  - *Accept*: Single command seeds demo case, entities, and runbook; demo run reproducible.
- **E‑2 UX Telemetry** — Emit TTFI, selection‑to‑insight steps, palette op latency, brush interactions.
  - *Accept*: Dash shows baselines; thresholds logged as SLO hints.

---

## 4) Deliverables (Artifacts)
- **Design System Tokens v0.1** — spacing (4/8 grid), typography scale (12–20–28), radii (4/8/12), elevation (0–3), semantic color slots (bg, surface, border, text‑muted, emphasis, success, warning, danger). Source in JSON + TS map.
- **Component Specs** (MUI‑first, Tailwind aliasing where applicable)
  - *ProvenanceTooltip*, *EvidenceDetailSheet*, *PolicyBlockModal*, *CommandPalette*, *TriPaneSyncControls*, *DiffLegend*.
- **Interaction Flows** — Swimlanes for Golden Path; keyboard maps.
- **Copy Deck** — Standard microcopy for caveats, confidence, dissent, denial reasons, appeals.
- **A11y Checklist** — Sprint‑level check and PR template section.
- **Demo Script** — 5‑minute and 12‑minute variants; talk track + screen cues.
- **Telemetry Spec** — Event names, payload schema, PII‑safe guidelines.

---

## 5) Work Plan — Day‑by‑Day (T‑Shirt)
- **D1–2**: Token baseline; PPC Tooltip POC; palette shell; A11y sweep skeleton.
- **D3–4**: PPC Detail Sheet; TPS selection parity; copy deck draft; demo data seed script.
- **D5**: Policy Block Modal; brush coherence; A11y tests wired in CI; telemetry events.
- **D6–7**: Diff overlay + legend; palette commands; empty/error patterns; demo rehearsal.
- **D8–9**: Stabilization, perf passes, docs; handoff to QA; SLO gauge wiring; second rehearsal.
- **D10**: Stakeholder review; cut release; publish demo pack; retro.

---

## 6) Definition of Done (DoD)
- Unit + integration tests passing; Axe/Pa11y 0 criticals.
- Docs: README, Storybook/MDX (or equivalent), API Tsdoc, A11y notes.
- Telemetry emitting; dashboards updated.
- Demo packs reproducible on fresh env; talk track current.
- Provenance/Policy features visible in all relevant views.

---

## 7) Interfaces & Contracts
- **Command Registration**
```ts
export type Command = {
  id: string; title: string; icon?: ReactNode; scope: 'global'|'graph'|'timeline'|'map'|'runbook'|'report';
  guard?: () => {allowed: boolean; reason?: string};
  run: (ctx: Ctx) => Promise<void>;
};
registerCommand(Command);
```
- **Provenance Tooltip Input**
```ts
export interface ProvenanceSummary { sources: Array<{name:string,url?:string,license?:string}>; claim: string; transform: string; hash: string; confidence: number; contradictions?: number }
```
- **Policy Block Modal Input**
```ts
export interface PolicyBlock { reason: string; authority?: string; clause?: string; owner?: string; appealUrl?: string; nextBest?: Array<{label:string,action:()=>void}> }
```

---

## 8) A11y & Content Patterns (Extract)
- **Keyboard**: `⌘K` palette; `?` details; `[` `]` time brush step; `g` focus graph; `t` timeline; `m` map.
- **Copy** (deny): “Access blocked by **License/TOS** — *OFAC‑EU‑2025‑§4.2*. You can **request review** or **simulate required authority**. No disallowed data was accessed.”
- **Confidence**: “Confidence 0.73 — based on source streak & transform X; alternate hypothesis available.”

---

## 9) Telemetry & SLO Hooks
- Events: `ui.palette.open`, `ui.palette.exec`, `ui.brush.change`, `ui.select.entity`, `ui.provenance.view`, `ui.policy.block.view`.
- Metrics: palette latency p95<80ms; TTFI <2.5s; selection‑parity success >99%; brush coherence errors 0.

---

## 10) Demo Pack — Script (5 minutes)
1) `⌘K` → “Create Case: Baltic Corridor” → enter → case opens.
2) Import CSV (seed) → entities/edges appear; show provenance tooltip on a node.
3) Brush timeline to week N → graph filters; map reveals rendezvous cluster.
4) Run runbook via palette → open Evidence Detail Sheet; export manifest (allowed path).
5) Trigger a blocked export → show Policy Block Explainer with appeal/simulator.
6) Toggle **What Changed?** and narrate diff.

---

## 11) Cross‑Sprint Coordination
- **Integration Mega Sprint**: we expose `registerCommand` for other teams; coordinate IDs and guards.
- **Prov‑Ledger**: ensure detail sheet consumes ledger API; align hash/manifest fields.
- **Policy/OPA**: Denial explainer consumes reasoner messages; agree on schema.
- **SLO Dashboards**: Telemetry fields validated; add UX gauges.
- **Offline Kit**: demo pack supports air‑gapped seed and later sync (no PII).

---

## 12) Risks & Mitigations
- **Perf regressions** → perf budgets + flamegraph sessions D4/D8.
- **Policy messages too technical** → content review checklist + plain‑lang translation table.
- **Scope creep (XAI)** → keep XAI visuals to summaries; deep views parked for next sprint.

---

## 13) Hand‑Off Notes
- PR template section for A11y and Provenance checks.
- Storybook/MDX (or screenshots) for each component.
- Unit tests for palette ranking & brush sync; contract tests for ledger and policy schemas.

---

## 14) Jira Subtasks CSV (Import‑ready)
```csv
Summary,Issue Type,Parent Key,Assignee,Labels
Provenance Tooltip v1 — build,Sub-task,IG-0,design,ux,provenance
Provenance Tooltip v1 — tests,Sub-task,IG-0,qa,ux,provenance
Evidence Detail Sheet — build,Sub-task,IG-0,design,ux,provenance
Evidence Detail Sheet — tests,Sub-task,IG-0,qa,ux,provenance
Policy Denial Explainer — build,Sub-task,IG-0,design,ux,policy
Policy Denial Explainer — tests,Sub-task,IG-0,qa,ux,policy
Command Palette core — build,Sub-task,IG-0,design,ux,cmd
Command Palette core — tests,Sub-task,IG-0,qa,ux,cmd
Tri‑Pane Sync — selection parity — build,Sub-task,IG-0,design,ux,tripane
Tri‑Pane Sync — selection parity — tests,Sub-task,IG-0,qa,ux,tripane
Tri‑Pane Sync — brush coherence — build,Sub-task,IG-0,design,ux,tripane
Tri‑Pane Sync — brush coherence — tests,Sub-task,IG-0,qa,ux,tripane
Diff overlay & legend — build,Sub-task,IG-0,design,ux,diff
Diff overlay & legend — tests,Sub-task,IG-0,qa,ux,diff
A11y baseline — audit & fixes,Sub-task,IG-0,design,ux,a11y
Empty/Error patterns — library,Sub-task,IG-0,design,ux,states
Demo Pack — script + fixtures,Sub-task,IG-0,design,demo
Telemetry — UX events & SLOs,Sub-task,IG-0,design,telemetry
Docs — README/Storybook/MDX,Sub-task,IG-0,design,docs
```

---

## 15) GitHub Projects (v2) — `gh` Bootstrap (snippet)
```bash
# Fields: Status, Priority, Epic, Area (PPC|CP|TPS|AXP|DTX)
gh project create "Analyst Experience — Oct 2025" --format table \
  --field "Status:todo,doing,blocked,review,done" \
  --field "Priority:p0,p1,p2" \
  --field "Epic:text" \
  --field "Area:iteration:PPC,CP,TPS,AXP,DTX"
# …then gh issue create for each story and set fields accordingly
```

---

## 16) Design Tokens — Starter (JSON)
```json
{
  "spacing": {"xs":4, "sm":8, "md":12, "lg":16, "xl":24},
  "radius": {"sm":4, "md":8, "lg":12},
  "elevation": {"0":"none", "1":"0 1px 2px rgba(0,0,0,.08)", "2":"0 4px 12px rgba(0,0,0,.10)", "3":"0 12px 28px rgba(0,0,0,.12)"},
  "typescale": {"body":14, "ui":12, "h3":20, "h2":28},
  "color": {"bg":"#0B0C0F", "surface":"#14161A", "border":"#2B2F36", "text":"#E6E8EE", "muted":"#A6ADBB", "emphasis":"#F2F4F8", "success":"#2BB673", "warning":"#F5A623", "danger":"#E55353"}
}
```

---

## 17) Retro Prompts (pre‑filled)
- What slowed selection parity?
- Where did denial explainer copy fail to clarify?
- Which palette commands were unused (consider removing)?
- Any perf budget misses?

---

### Final: Ship List (Checklist)
- [ ] PPC Tooltip + Detail Sheet on all evidence surfaces
- [ ] Policy Denial Explainer wired to OPA reasoner
- [ ] Command Palette v1 with ≥20 actions
- [ ] Selection parity + brush coherence + diff overlay
- [ ] A11y AAA sweep + Empty/Error patterns
- [ ] Demo Pack + UX Telemetry dashboards

