# IntelGraph — Front‑End Rebuild & Maturity Spec

**Version:** 1.0 (Aug 24, 2025)
**Audience:** Front‑end engineers, design systems, QA, SRE, Product, Security & Governance
**Authoring GPT:** Confidential Design

---

## 0) Purpose & Scope

This specification defines the architectural blueprint, UX interaction model, component inventory, data contracts, accessibility, security surfaces, testing strategy, and delivery milestones required to **completely rebuild** the IntelGraph web client and then **extend, expand, refine, and mature** it along the roadmap. It covers all experience areas required for the Core GA and provides stubs/specs for post‑GA growth.

**In scope:** Analyst web application (desktop‑first, responsive), modular tri‑pane exploration (graph/timeline/map), ingest/ER workflows, AI copilot, collaboration/reporting, admin studio, offline/edge kit UI, observability hooks, A11y AAA, i18n/l10n.
**Out of scope (this doc):** Backend algorithms, services/IaC details, mobile native apps (web mobile responsiveness is included).

---

## 1) Product Goals & Non‑Functional Requirements

- **Primary goal:** Reduce time‑to‑first‑insight and produce verifiable, ethically‑bounded intelligence outputs with provenance and governance visible by default.
- **Experience pillars:**
  1. **Evidence‑first UX** — provenance tooltips, XAI overlays, and explain‑this‑view panels.
  2. **Keyboard‑first** — command palette, full shortcut coverage, consistent focus management.
  3. **Tri‑pane mastery** — synchronized brushing across Graph, Timeline, and Map.
  4. **Reliability** — offline/edge kit behaviors, conflict resolution, and signed sync logs.
  5. **Governance** — policy banners, reason‑for‑access prompts, warrant/authority binding surfaces.
- **Performance Targets (client‑perceived):** p95 interactions for common graph pivots < 1.5s for 3‑hop, 50k node neighborhoods; TTFI < 3.5s on mid‑tier analyst hardware; cold start < 5s on 3G fallback; memory ceiling < 800MB for large sessions.
- **Availability:** Offline‑capable subsets (Case Workroom, tri‑pane on cached subgraph, drafts) with CRDT conflict UI.
- **Security & Privacy:** ABAC/RBAC visualization, data minimization indicators, redaction overlays, export manifests, dual‑control delete UX.
- **Accessibility:** WCAG 2.2 AAA target; motion‑reduction, high‑contrast, screen reader support; complete keyboard paths.
- **Internationalization:** ICU message catalogs, RTL, locale date/units; user language packs.

---

## 2) Technical Architecture

### 2.1 Stack

- **Framework:** React 18 + TypeScript 5
- **Styling:** Tailwind CSS + CSS variables for theming; shadcn/ui components; lucide icons
- **State:** Zustand for app/session state; React Query for data lifecycle; XState for complex flows (ER, Ingest, Export, Copilot)
- **Data:** GraphQL (Apollo Client, persisted queries), WebSockets for live topics; gRPC‑web or SSE for stream events when needed
- **Routing:** TanStack Router (file‑based or route config) with guarded routes per tenant/case/compartment
- **Maps:** Mapbox GL (ESRI layer adapter supported)
- **Graph:** Cytoscape.js + custom WebGL renderers (D3/visx utilities for measures); virtualized panes
- **Timeline:** visx‑based zoomable time series & event ribbons
- **Workers:** Web Workers for layout, pathfinding previews, heavy transforms; WASM hooks for metrics
- **Offline:** Service Worker (Workbox), IndexedDB (Dexie) for caches, CRDT (Automerge‑style) for notes/annotations
- **Build:** Vite + SWC; source‑maps gated per env; bundle analyzer and code‑split boundaries
- **Quality:** ESLint, TypeScript strict, Prettier, Storybook, Chromatic/Reg‑suites, Playwright E2E

### 2.2 App Shell & Layout

- **Top bar:** global search, command palette trigger, case selector, user/tenant menu, environment badge, network/offline indicator
- **Left rail:** Primary nav (Home, Cases, Graph, Timeline, Map, Ingest, ER, Copilot, Reports, Admin)
- **Content:** **Tri‑pane** workspace with resizable panels; presets (Graph‑lead / Timeline‑lead / Map‑lead)
- **Right rail (context):** Explain‑this‑view, XAI panel, Provenance & Policy panel, Activity/Comments
- **Status bar:** status toasts, background job progress, step‑up auth prompts, policy banners

### 2.3 Routing & Auth Guards

- `/login` (OIDC), `/cases/:id` (compartment scoping), `/workspaces/tri`, `/ingest/wizard`, `/er`, `/copilot`, `/reports`, `/admin`.
  Route guards inspect tenant, case, compartment, and ABAC attributes; unauthorized routes render a policy denial with appeal link.

---

## 3) Information Architecture (IA)

- **Home:** Assigned tasks, watchlists, saved views, SLA timers, recent case activity, cost/SLO tiles.
- **Cases:** Case spaces with roles, checklists, legal holds, watchlists. Dual‑control actions visible.
- **Graph Explorer:** Pivot, expand/contract, filters, saved pinboards, layout presets, shortest/K‑paths, community metrics.
- **Timeline:** Layered events, intervals, evidence ribbons; brush sync with graph and map.
- **Map:** Base layers, corridors, geofences, colocation windows, convoy/rendezvous cues.
- **Ingest Wizard:** Connectors catalog, schema mapping, PII classification, DPIA checks, license rules.
- **Entity Resolution:** Candidate sets, scorecards, adjudication queue, reversible merge/split.
- **AI Copilot:** NL→Cypher preview, sandbox execution, GraphRAG, narrative builder, guardrail reasoning.
- **COA Planner & Simulation:** DAG editor, dependencies, Monte Carlo runs, sensitivity sliders.
- **Reports Studio:** Timelines, map/graph figures, caption assistant, one‑click PDF/HTML with redaction.
- **Admin Studio:** Schema registry, connector health, retries/backfills, feature flags, audit search.

---

## 4) Global Interaction Patterns

- **Command Palette:** `⌘/Ctrl+K` everywhere; actions, entities, saved views, help topics.
- **Keyboard Map:** Consistent shortcuts (`G T` to focus Timeline, `G G` Graph, `G M` Map; `[`/`]` for time window; `.` to expand selection; `/` filter)
- **Selection Model:** Single/multi‑select entities/edges; selection propagates across panes.`
- **Brush Sync:** Shared time window drives Graph/Map fade (confidence opacity) and event filtering.
- **Explain‑This‑View:** Contextual help explains current metrics, filters, and model rationales.
- **Provenance Tooltips:** Hover on nodes/edges/evidence shows sources, transforms, license, confidence.
- **Policy Banners:** On load and before sensitive actions, show legal basis, minimization, retention.
- **Undo/Redo & Diffs:** Local model keeps operation log for visual diffs; per‑case history rendered.
- **Dark/Light & High‑Contrast:** Theme switch with remembers; reduced‑motion option respected.

---

## 5) Component Inventory (Selected)

> **Notation:** `Props<T>` are TypeScript interfaces. All components are design‑system first and a11y‑compliant.

### 5.1 Workspace Core

- **`TriPaneLayout`**
  Props: `{ left: ReactNode; center: ReactNode; right: ReactNode; resizable?: boolean; preset?: 'graph'|'timeline'|'map' }`
- **`SyncBrush`**
  Props: `{ start: Date; end: Date; onChange:(win)=>void; onFreeze?():void }`
  Behavior: Emits shared window to subscribed panes; shows source of authority (timeline/map).
- **`EvidenceRibbon`**
  Props: `{ items: EvidenceItem[]; groupBy?: 'source'|'claim'|'type'; onOpen(item) }`
- **`ExplainPanel`**
  Props: `{ context: ViewContext; xai?: XAIExplanation; }`

### 5.2 Graph Suite

- **`GraphView`** (Cytoscape WebGL)
  Props: `{ graph: GraphData; selection: Selection; layout:'fcose'|'dagre'|...; metrics?: Metrics; filters?: FilterSet; onSelect, onExpand }`
- **`PathFinder`**
  Props: `{ source: NodeId; target: NodeId; policy?: PolicyMask; mode:'shortest'|'kshortest'|'constrained'; onResult }`
- **`CommunityPanel`**
  Props: `{ method:'louvain'|'leiden'|...; onRun; onExplain }` (renders bridge/broker detection and explanations)
- **`PatternMiner`**
  Props: `{ templates: PatternTemplate[]; params: Record<string,any>; onDetect }`

### 5.3 Timeline & Map

- **`TimelineView`**
  Props: `{ events: TimedEvent[]; ranges: Interval[]; zoom: TimeZoom; onBrush }`
- **`MapView`** (Mapbox GL + ESRI adapter)
  Props: `{ layers: MapLayer[]; geofences?: Polygon[]; routes?: Route[]; colocation?: Window[]; onBrush }`

### 5.4 Ingest & ETL

- **`ConnectorCatalog`**
  Props: `{ connectors: ConnectorMeta[]; onConfigure(connectorId) }`
- **`SchemaMapper`**
  Props: `{ sample: SampleSet; suggestions: Mapping[]; piiFlags: Flag[]; onApprove(mapping) }`
- **`DPIAChecklist`**
  Props: `{ rules: DPIRule[]; onComplete(results) }`
- **`LicenseRulePanel`**
  Props: `{ source: DataSource; violations: LicenseViolation[]; onAppeal() }`

### 5.5 Entity Resolution (ER)

- **`ERQueue`**
  Props: `{ candidates: MergeCandidate[]; policyMask: PolicyMask; onAdjudicate(action) }`
- **`ERScorecard`**
  Props: `{ features: FeatureVector; decision?: 'merge'|'split'|'hold'; onExplain }`

### 5.6 AI Copilot

- **`NLQueryConsole`**
  Props: `{ prompt: string; onGenerate(); generatedCypher?: string; cost?: CostEstimate; onRunSandbox(); onCommit() }`
- **`GraphRAGViewer`**
  Props: `{ citations: Citation[]; paths: PathRationale[]; redaction: RedactionState }`
- **`NarrativeBuilder`**
  Props: `{ timeline: Event[]; figures: FigureSpec[]; style:'guarded'|'brief'; onExport('pdf'|'html') }`
- **`GuardrailModal`**
  Props: `{ reason: PolicyReason; appealPath?: string; onContactOmbuds }`

### 5.7 Collaboration & Reporting

- **`CaseSpace`**
  Props: `{ roles: Role[]; tasks: Task[]; sla: SLAConf; watchlists: Watch[]; fourEyes: boolean }`
- **`ReportStudio`**
  Props: `{ sections: ReportSection[]; assets: FigureSpec[]; redactionMap: RedactionMap; onBundle() }`
- **`DisclosurePackager`**
  Props: `{ evidence: Evidence[]; manifest: Manifest; onExport() }`
- **`CommentThread`**
  Props: `{ entityId?: string; immutable: true; legalHold?: boolean }`

### 5.8 Admin & Ops

- **`SchemaRegistryView`**, **`ConnectorHealth`**, **`JobControl`**, **`FeatureFlags`**, **`AuditSearch`**, **`SLODash`**, **`CostGuardPanel`**, **`OfflineSyncLogs`**

---

## 6) Data Contracts (GraphQL, client‑side)

> **Goal:** Predictable, backpressure‑aware queries, with cost estimates and field‑level authz.

- **Persisted Queries:** All heavy queries are persisted with server‑side cost limits and depth caps; client includes a cost hint and UI falls back to partial results with “show more” affordances.
- **Authz Annotations:** Response envelopes include `policy: { legalBasis, purpose, sensitivity, retention }` used to render banners and block unsafe downstream actions.
- **Common Types:** `Entity`, `Edge`, `Claim`, `License`, `Authority`, `Evidence`, `Narrative`, `Runbook`, `Case`.
- **Subgraph Result:** `{ nodes: Entity[]; edges: Edge[]; provenance: Claim[]; stats: Metrics }`
- **NL→Cypher:** Copilot endpoint returns `{ cypher, confidence, estRows, estCost }`; sandbox mutations are separate and marked **non‑exportable**.

---

## 7) Critical Flows (State Machines)

### 7.1 NL Query → Cypher Preview → Sandbox → Commit

- **States:** `Idle → Generating → Preview (with diff vs. manual) → SandboxRunning → Review → Commit | Abort`.
- **Transitions:** Policy denial at generate/run/commit shows GuardrailModal; user can appeal (ombuds link).
- **UX:** Show cost & row estimates before execution; provide undo for committed queries.

### 7.2 Ingest Wizard

- **Steps:** Pick connector → Configure auth/limits → Sample & map → PII flags → DPIA checklist → License rules → Confirm & run.
- **Guards:** License/PII violations block; appeal path available; provenance chain starts here.

### 7.3 Entity Resolution Adjudication

- **Queue:** Sorted by risk & impact; batch actions allowed with review.
- **Decision panel:** Scorecard with features; merge/split reversible; confidence decay shown.

### 7.4 Disclosure Packager (Export)

- **Flow:** Select evidence → Auto‑assemble manifest → Policy/license check → Redaction map → Export → Verify locally.
- **Dual‑control:** Second approver required for sensitive packs; tamper‑evident hash displayed.

### 7.5 Offline/Edge Session

- **Entry:** Network loss or user‑selected “Offline Case” mode.
- **Capabilities:** Local tri‑pane on cached subgraph, notes/pins, report drafts.
- **Re‑sync:** Conflict UI: side‑by‑side diffs for annotations/pins; signed sync logs; operator approvals.

---

## 8) Accessibility (WCAG 2.2 AAA)

- **Keyboard:** All actions via shortcuts; roving tabindex for graph selections; skip‑to‑panel links.
- **Screen Readers:** ARIA roles/labels for graph nodes/edges (“Node: Org ACME, degree 12, selected”).
- **Contrast & Motion:** High‑contrast theme passes AAA; prefers‑reduced‑motion respected; zoom levels persistent.
- **Error Semantics:** Policy denials and guardrails announced with role=alert and have help/appeal links.

---

## 9) Design System & Theming

- **Tokens:** Color (light/dark/high‑contrast), spacing, radius, elevation, motion curves, z‑index, shadows.
- **Components:** Buttons, Inputs, Selects, Breadcrumbs, Tabs, Dialogs, Banner, Toast, Tooltip, DataTable, Pill/Tag, Stepper, Toolbar, Splitter, Empty States, Skeletons.
- **Graph Styles:** Edge types styled by relationship and policy; confidence drives opacity; provenance badges as glyphs; time fades outside brush.

---

## 10) Telemetry & Observability Hooks

- **Client events:** `graph.pivot`, `timeline.brush`, `map.colocation.view`, `copilot.generate`, `er.merge`, `ingest.start/finish`, `export.bundle`, `policy.denied`.
- **Metrics:** TTFI, panel render time, layout calc time, brush sync latency, error rates, denial counts, offline duration.
- **Traces:** Correlate UI events with backend spans via trace IDs; redaction of sensitive payloads at source.

---

## 11) Error, Empty, and Edge States

- **Policy Denial:** Show banner + actionable reason; link to ombuds/appeal; provide simulation mode.
- **No Data / Not Authorized:** Differentiate “no results” from “not permitted”.
- **Degraded Mode:** Slow query killer: offer down‑sampled subgraph, frozen layouts, and async completion toast.
- **Poisoned/Noisy Source:** Telemetry sanity warnings; quarantine badges; learn‑more link.

---

## 12) Security, Privacy, Governance Surfaces

- **Reason‑for‑Access prompts** before sensitive views; audit trail visible.
- **Warrant/Authority chips** on queries; badges on entities with special handling; retention & license labels.
- **Minimization & Redaction:** PII, selectors, and sensitive attributes masked unless purpose allows; export wizard redaction maps are mandatory.
- **Dual‑Control Workflows:** Deletes and sensitive exports require a second reviewer.

---

## 13) Testing Strategy

- **Unit:** Components (Storybook stories + Jest/RTL), state machines, hooks.
- **Contract:** GraphQL schemas (codegen + mock servers); persisted queries validated.
- **E2E:** Playwright flows for Ingest→ER→Runbook→Report; screenshot diffs for tri‑pane.
- **Load/Soak:** Large subgraph rendering, pathfinding previews; worker load; memory leaks.
- **A11y:** axe‑core automated scans + manual audits (SR/keyboard/contrast).

---

## 14) Performance Plan

- **Code‑split** by route & pane; prefetch saved views; image/asset budgets.
- **Workers/WASM** for layouts & metrics; **virtualization** for lists and node labels; **offscreen canvas** where supported.
- **Caching:** React Query with staleness windows; IndexedDB for subgraphs & tiles; eviction policies.
- **Graceful Downsizing:** Switch to simplified styles for dense graphs; progressive disclosure for heavy metrics.

---

## 15) Internationalization & Localization

- ICU messages; pluralization; date/number formats; locale time zones; RTL flipping for panels; localized keyboard hints.

---

## 16) Feature Flags & Config

- **Flags:** CopilotAlpha, PredictiveSuiteAlpha, ProvLedgerBeta, OfflineKitV1, FederatedSearchAlpha, WarGamedDashboard.
- **Remote config:** Poll at session start; changes require hard reload with warning.

---

## 17) Delivery Milestones (Front‑End)

**Near‑Term (Q3–Q4 2025)**

- Tri‑pane workspace with command palette, explain panel, provenance tooltips, dark/light.
- Ingest Wizard v1 (10+ connectors UI), ER queue/scorecards, Copilot (NL→Cypher preview + sandbox), Report Studio.
- Admin Studio MVP (schema registry, connector health, job control), SLO dashboards & cost guard UIs.
- Offline Kit v1 (local tri‑pane on cached subgraph, drafts, sync logs).

**Mid‑Term (Q1–Q2 2026)**

- Graph‑XAI overlays across anomalies/ER/forecasts; fairness/robustness views.
- DFIR adapters, JanusGraph toggle, DP export helpers, blockchain anchoring UI.
- Runbooks library UIs (≥25), SIEM bridges surfaces, federated search prototype.

**Longer‑Term (H2 2026 → 2027)**

- Federated multi‑graph search UX, cross‑tenant hashed deconfliction surfaces.
- Advanced simulations (network interdiction, multi‑actor narratives), War‑Gamed Decision Dashboard.
- Crisis cell live ops with COA comparison & diplomatic off‑ramps.

---

## 18) Acceptance Criteria (Front‑End)

- **Tri‑pane:** Synchronized brush across all panes; task time reduction verified vs baseline; saved views persist.
- **Copilot:** ≥95% generated Cypher syntactic validity on test prompts; rollback/undo supported; guardrail reasons human‑readable.
- **Ingest & ER:** Map CSV/JSON→entities in ≤10 minutes; PII flags visible; ER merges reproducible; override logs present.
- **Exports:** Disclosure bundles include manifest with hashes and transformation chains; local verification tool passes.
- **Gov/Policy:** All blocked actions provide a readable reason and appeal path; policy simulation view accessible.
- **A11y:** Keyboard paths, contrast, SR tests pass; motion‑reduction supported; high‑contrast theme complete.

---

## 19) Risks & Mitigations

- **Graph scale → perf cliffs:** Use WebGL + virtualization, progressive rendering, path previews in worker.
- **Policy complexity → user confusion:** Dedicated panel with plain‑language explanations; simulations.
- **Offline divergence:** CRDT merge UI with clear attribution and approvals; robust signed logs.
- **License/TOS conflicts:** License Rule Panel with pre‑flight blockers and appeal flow.

---

## 20) Open Questions

1. Graph rendering library final pick (Cytoscape vs custom WebGL) — PoC both.
2. Vector tiles for map data at scale — evaluate caching strategy and retention labels.
3. Persisted query catalog ownership — Product vs. Platform team.
4. Copilot temperature/config exposure for analysts — how much control in UI?

---

## 21) Handoff Artifacts

- Figma library (tokens, components, templates, flows).
- Storybook with states/edge cases; accessibility annotations.
- Contract tests and mock servers for GraphQL.
- Seed datasets and saved views for demos/regression.

---

### Appendix A — Page/Route Specs (Condensed)

- **/workspaces/tri** — Default tri‑pane; panels toggled; presets; saved views; explain panel.
- **/ingest/wizard** — Connector pick → config → mapping → DPIA → license → confirm; progress and resumable jobs.
- **/er** — Queue, detail, scorecard; merge/split; reversible; policy chips.
- **/copilot** — Prompt, preview, cost/row, sandbox; diff vs manual; citations pane.
- **/reports** — Composer with timeline/graph/map figures; caption assistant; export packager.
- **/admin** — Schema registry, connector health, retries/backfills, feature flags, audit search.

### Appendix B — Telemetry Event Dictionary (Initial)

- `ui.command.open`, `ui.view.saved`, `graph.expand`, `graph.metrics.run`, `timeline.zoom`, `map.layer.toggle`, `copilot.preview`, `copilot.run.sandbox`, `er.merge`, `export.bundle`, `policy.denied`, `offline.enter`, `offline.sync.merge`

### Appendix C — Shortcut Map (Initial)

- Global: `⌘/Ctrl+K` palette, `?` help, `g g` Graph, `g t` Timeline, `g m` Map.
- Selection: `a` select all, `x` clear, `.` expand, `,` contract.
- Time: `[` zoom out, `]` zoom in, `⇧[`/`⇧]` nudge window.

---

> **End of Spec v1.0** — ready for sprint planning and epic decomposition.
