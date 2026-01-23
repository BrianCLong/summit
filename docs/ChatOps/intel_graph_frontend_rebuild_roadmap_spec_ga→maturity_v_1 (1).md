# IntelGraph Frontend Rebuild & Roadmap Spec — GA→Maturity (v1.0)

> Purpose: Provide **complete, implementation‑ready** frontend specifications to (1) rebuild IntelGraph’s web client from ground up, and (2) extend/expand/refine across the roadmap until maturity, with **every feature and function usable**. This spec defines architecture, tech stack, UX, component contracts, data flows, performance/SRE, security/compliance, and acceptance criteria.

---

## 0) North‑Star Goals & Principles

- **Analyst‑centric:** Tri‑pane (Graph ⟷ Timeline ⟷ Map) with synchronized brushing and pinboards; command palette; keyboard‑first; A11y AAA.
- **Evidence‑first:** Provenance & license surfaced everywhere; exportable disclosure bundles; explainability overlays.
- **Policy‑by‑default:** ABAC/RBAC gates at component level; guardrail reasons visible; appeal paths.
- **Realtime & offline:** Presence, comments, live graph changes; Offline Kit with CRDT merges; verifiable resync.
- **Modular & testable:** Clean architecture, typed boundaries, contract tests; Storybook‐driven UI.
- **Performant & observable:** p95 interactions < 1.5s; OTEL traces; SLO burn alerts; cost guards.

---

## 1) Tech Stack & Conventions

- **Framework:** React 18 (TS).
- **Design System:** Material‑UI (MUI) v6 as primary; Tailwind **utilities‑only** permitted for coarse layout.
- **State:** Redux Toolkit (RTK) for app/UI state; Apollo Client for GraphQL data; RTK slices wrap Apollo mutations where needed.
- **Graph:** Cytoscape.js (WebGL renderer) + cytoscape‑cose‑bilkent layout; custom WebWorker layout broker.
- **Map:** MapLibre GL JS + deck.gl layers; ESRI/Mapbox vector tile compatibility.
- **Timeline:** Vis‑Timeline for dense event lanes; d3‑scale for brushing.
- **Realtime:** Socket.IO client; awareness (presence, cursors) via Yjs + y‑websocket bridge.
- **Collab Docs/Annotations:** TipTap editor + Yjs for rich text; CRDTs for pinboards/notes.
- **Forms:** React Hook Form + Zod schemas; JSON‑Schema forms for connector mapping.
- **Routing:** React Router v6.26 with data routers, loaders, and deferred data.
- **i18n:** FormatJS/ICU (react‑intl); RTL support; locale packs.
- **Build:** Vite; env‑driven feature flags; bundle splitting by route & capability.
- **Testing:** Jest + React Testing Library; Playwright e2e; Axe + jest‑axe for a11y; k6 for web perf smoke in CI.
- **Lint/Style:** ESLint (typescript‑eslint), Prettier, stylelint for CSS (utilities).
- **Telemetry:** OpenTelemetry Web SDK; user journey events; GraphQL link instrumentation.
- **Security:** WebAuthn/FIDO2 flows; CSP nonces; Subresource Integrity; csrf‑token on GraphQL POST; JWT in httpOnly cookies.

**Coding Conventions**

- TS strict mode, no implicit `any`; exhaustive switch; never ignore Promise rejections.
- Component props typed with discriminated unions where meaningful; event contracts documented.
- DOM/event manipulation within graph/timeline/map components uses **jQuery wrappers** to normalize event delegation and gestures where low‑level interop is required.

---

## 2) Monorepo Structure (apps/packages)

```
intelgraph/
  apps/
    web/                      # React app (this spec)
  packages/
    ui-core/                  # MUI theme, tokens, primitives, icons, a11y helpers
    graph-kit/                # Cytoscape wrappers, layouts, style registry, exporters
    map-kit/                  # MapLibre/deck.gl layers, geofences, corridor overlays
    timeline-kit/             # Vis‑Timeline wrappers, sync adapters
    xai-overlays/             # XAI widgets (saliency, path rationale, counterfactual UI)
    provenance/               # Evidence tooltips, manifest builder UI, signature badge
    policy-guards/            # ABAC gate HOCs, reason surfaces, feature flags
    collab/                   # Yjs bindings, presence cursors, comments API
    graphql-client/           # Apollo setup, links (auth, otel), codegen types/hooks
    form-schemas/             # Zod + JSON‑Schema, DPIA/PII classifiers (UI rules)
    storybook-presets/        # Shared SB config, a11y, visual‑diff harness
```

---

## 3) Route Map & Navigation

**High‑level routes**

- `/signin` (OIDC, WebAuthn step‑up)
- `/cases` → list, filters, facets
- `/cases/:caseId` → **Case Studio** (Tri‑pane default)
  - `graph` | `map` | `timeline` panes (resizable)
  - `evidence` tab (docs/media, provenance)
  - `hypotheses` tab (CH tables)
  - `coa` tab (planner/simulator)
  - `report` tab (Brief Studio)
- `/ingest` → Ingest Wizard, connector catalog
- `/admin` → schema registry, policy simulator, feature flags, audit search
- `/search` → federated search (entities, claims, narratives)
- `/settings` → profile, notifications, language, accessibility

**Navigation**

- Global app bar: Case switcher, command palette (`⌘/Ctrl‑K`), notifications, profile
- Left rail: Case nav; collapsible; keyboard accessible
- Breadcrumbs reflect tenant/case/context

---

## 4) UX Specs — Core Screens & Interactions

### 4.1 Case Studio (Tri‑Pane)

- **Layout:** Responsive grid with draggable resizers; presets: 33/33/33, 50/25/25, 60/40 (two‑pane).
- **Sync:** Time brush on timeline sets `timeWindow`; map & graph filter to window; hover on graph node highlights contemporaneous map points and timeline events.
- **Pinboards:** Drag entities/edges/events to pinboard; annotate; share via Yjs. Versioned snapshots.
- **Explain Panel:** Contextual right‑drawer that answers “Explain this view” with XAI overlays + provenance links.
- **Performance:** Virtualized DOM lists; WebGL layers; workerized layouts; background aggregation queries with spinners and `aria‑busy`.

**Graph Panel**

- Cytoscape canvas with style registry (policy tags → halos; confidence → opacity; provenance → badges).
- Gestures: pan/zoom, lasso select, marquee zoom, focus paths; jQuery wrapper normalizes wheel/touch events.
- Actions: expand neighborhood; collapse subgraph; K‑shortest paths; save view; export (PNG/SVG/JSON); apply layouts.
- Tooling: filter chips (type, policy, time), search bar, pin‑as‑exhibit.

**Map Panel**

- Base: MapLibre GL; layers: entities, trajectories, stay‑points, rendezvous, geofences, corridor risk heat.
- Time playback scrubber synced to timeline; convoy/rendezvous detections appear as annotations.
- Drawing tools: lasso/box, geofence creation, route corridor editor.

**Timeline Panel**

- Lanes per entity type/case thread; density rendering; link to graph nodes; brush to set time window.
- Event composer: add/edit events with provenance link.

### 4.2 Ingest Wizard

- Steps: Source → Mapping → PII/DPIA → Validation → Preview → Submit.
- Schema mapper with AI suggestions and Zod validation; license panel shows TOS/owner; blocked fields show policy reason and appeal link.
- Streaming ETL status with progress; errors triaged; lineage recorded.

### 4.3 Hypothesis Workbench

- CH tables with evidence weights; Bayes sliders; dissent annex; missing‑evidence prompts.
- Suggested alternatives from Copilot; accept/reject with audit trail.

### 4.4 COA Planner & Simulator

- DAG editor (MUI + dnd‑kit) with dependencies/resources; Monte Carlo runs with small multiples; sensitivity sliders.
- Risk bands and assumptions log; export to Brief Studio.

### 4.5 Brief/Report Studio

- Rich text sections, figure embeds (graph/map/timeline snapshots); caption assistant; redaction map.
- Export to PDF/HTML; disclosure bundles include manifest.

### 4.6 Admin Studio

- Schema registry (add types/edges safely); policy simulator (dry‑run); feature flags; audit search; connector health.

---

## 5) Component Inventory & Contracts (Selected Highlights)

> Full API docs in Storybook; below lists the critical components with prop/event contracts.

### 5.1 `GraphCanvas`

**Props**

- `graph: SerializedGraph` — nodes/edges with policy/provenance facets
- `layout: 'cose'|'dagre'|'grid'|CustomLayout`
- `filters: GraphFilters` — type, policy, time, confidence
- `selection: Selection` (controlled)
- `timeWindow: [Date, Date]`
- `onSelectionChange(sel: Selection)`
- `onContextAction(evt: GraphActionEvent)` — expand, collapse, saveView, export
- `xaiHints?: XaiOverlayHints`

**Events** (jQuery delegated in container to normalize mouse/touch)

- `node:click`, `edge:click`, `selection:changed`, `view:layout:changed`, `xai:overlay:request`

**Behavior**

- Workerized layout; cancelable; progress callbacks; throttled viewport updates.

### 5.2 `MapBoard`

**Props**: `layers: MapLayer[]`, `timeWindow`, `selection`, `onDraw(shape)`, `onHover(entityId)`

### 5.3 `EventTimeline`

**Props**: `lanes: TimelineLane[]`, `brush`, `onBrush`, `selection`, `onEventOpen(id)`

### 5.4 `ExplainPanel`

**Props**: `context: ExplainableContext` (query/model/view), `onCiteClick(evidenceId)`, `onOpenModelCard(modelId)`

### 5.5 `ProvenanceBadge`

**Props**: `source`, `license`, `hash`, `chain: Transform[]`; click opens manifest modal.

### 5.6 `PolicyGate`

**Props**: `check: PolicyCheck`, `fallback: ReactNode`; renders children if allowed; otherwise reason card with appeal.

### 5.7 `CopilotDock`

**Props**: `mode: 'query'|'etl'|'narrative'`; shows NL→Cypher preview; diff vs manual query; execute in sandbox; citations.

### 5.8 `CommentsPanel`

**Props**: `threadId`, `entityRef`, `presence`, `onMention(user)`; Yjs‑backed; immutable audit markers.

(Complete inventory appendix lists ~80 components across UI primitives, forms, modals, editors, and panels.)

---

## 6) Data Layer & Contracts

- **GraphQL:** Apollo Client with persisted queries; automatic retries (idempotent); cost hints; field‑level authz errors map to `PolicyGate` reasons.
- **Codegen:** `graphql-code-generator` → TS types/hooks; error‑free builds gated in CI.
- **Links:** Auth link (OIDC/JWT), error link (policy error → guard), OTEL link (traceparent), retry link (exponential backoff).
- **Subscriptions/Realtime:** Socket.IO namespace `/events` for case rooms; GraphQL subscription option v2.
- **Caching:** Apollo InMemory + normalized IDs; entity version keys include `validFrom/To`.
- **Offline:** Service Worker; IndexedDB for caches (entities, tiles, docs); background sync; divergence report UI.

**Key Operations** (client side)

- `GetCaseOverview(caseId)`
- `GetGraphSlice(caseId, filters, timeWindow)`
- `ExpandNeighborhood(entityId, depth, policy)`
- `SearchEntities(query, policy)`
- `GetTimeline(caseId, window)`
- `RecordHypothesis(caseId, payload)`
- `RunCOASim(caseId, dag, params)`
- `CreateReportExport(caseId, selection)`

---

## 7) Synchronization & Collab

- **Presence:** Yjs awareness protocol; color & cursor per user; recent activity list.
- **Comments & Mentions:** immutable audit, legal hold flags; redact/resolve workflow.
- **Pinboards:** CRDT lists; shareable links; snapshot hashes for disclosure.
- **Case Live Updates:** Socket rooms per case; ops: `graph:update`, `evidence:new`, `policy:change`.

---

## 8) Security, Privacy & Governance (Frontend Duties)

- **AuthN:** OIDC; step‑up with WebAuthn; session keep‑alive banners; reauth prompts for sensitive actions.
- **AuthZ:** Policy‑aware rendering via `PolicyGate`; field‑level truncation with tooltip rationale.
- **Privacy:** PII masking toggles (with permission); minimization presets at ingest UI; purpose badges.
- **License/TOS:** Data License badges; blocked exports show clause & appeal.
- **Audit:** Reason‑for‑access dialog surfaces before opening sensitive exhibits.
- **Threats:** XSS protections (MUI sanitize, DOMPurify for rich text), CSP, lock down `postMessage`, clickjacking frame guards.

---

## 9) Accessibility (A11y AAA) & Internationalization

- Full keyboard support for tri‑pane, including pane resizing and canvas interactions.
- Screen reader labels for nodes/edges/events; offscreen summaries for graph/map contexts.
- Motion/reduced animations option; high‑contrast theme.
- Locales: LTR/RTL; date/number formats; pluralization via ICU; transliteration helpers.

---

## 10) Performance Budgets & Tactics

- **Budgets:** TTFI ≤ 2.0s @ cold; route‑level chunk ≤ 250KB gz; graph render ≥ 30fps up to 5k nodes; p95 action < 1.5s.
- **Tactics:** code‑split per route; workerized layouts; canvas virtualization; memoized selectors; pre‑fetched case shells; tile caching; WebGL instancing for large symbol layers.
- **Backpressure:** Show ‘heavy query’ hints; cancel/abort controllers; cost guard UI.

---

## 11) Observability & Analytics

- OTEL tracing for route transitions, GraphQL ops, heavy UI actions.
- User journey analytics (consent‑aware): time‑to‑first‑insight, path discovery time, export cycles.
- Error taxonomy: policy vs network vs validation; surface remediation.

---

## 12) Testing Strategy

- **Unit:** component logic, reducers/selectors, hooks wrappers.
- **Contract:** Storybook interaction tests; GraphQL mock server with golden fixtures.
- **E2E:** Playwright flows: ingest→resolve→analyze→report; screenshot diffs.
- **A11y:** jest‑axe on Storybook stories; manual assistive tech audits.
- **Perf:** Lighthouse CI budgets per route; k6 smoke for websocket & subscription paths.

---

## 13) CI/CD & Environments

- PR previews via Vercel/Netlify; Storybook deploy per PR.
- Static analysis gates (TS, ESLint, a11y scans); visual regression diffs.
- Feature flags via environment + remote config; canary releases with kill‑switches.

---

## 14) Theming & Design Tokens

- Token sets: color (semantic), typography scale, spacing, radii, elevation, focus rings.
- Dark/light themes; high‑contrast variant; policy/clearance palettes (e.g., sensitive = halo).
- Iconography: Lucide set + custom provenance/policy icons.

---

## 15) Roadmap‑Aligned Extensions (Post‑GA)

- **Graph‑XAI Everywhere:** integrate `xai-overlays` with saliency/path rationales; fairness/robustness panels.
- **Predictive Suite UI:** forecast bands on timelines; counterfactual editors; causal explainer widgets.
- **Federated Search:** cross‑graph/tenant hashed deconfliction views; result provenance stitching.
- **Deception Lab (Defensive):** honeypot/decoy registry UI; telemetry loop dashboards.
- **Offline Expedition Kit v2:** full tri‑pane local; divergence reports; signed resync logs.
- **Marketplace:** connector gallery w/ license scanner; conformance badges.

---

## 16) Acceptance Criteria (Frontend)

- **Tri‑pane Sync:** brushing → graph/map filtering within 100ms; cross‑highlighting latency ≤ 50ms.
- **NL→Cypher Preview:** ≥95% syntactic validity on prompts in test pack; rollback works; sandbox labels visible.
- **Provenance Integrity:** every figure/exhibit has manifest link; external verifier passes hash check.
- **Policy‑by‑Default:** blocked actions show human‑readable reason + appeal link; simulator shows impact of policy change.
- **A11y:** axe violations = 0 (serious/critical) on GA screens; keyboard coverage documented.
- **Perf:** budgets met; SLO dashboards show p95 < 1.5s for standard interactions.

---

## 17) Security & Abuse‑Case UX

- Abuse cases storyboarded (prompt injection banners, poisoned feed alerts, selector misuse warnings).
- Honeytoken indicators and canary prompts; model‑abuse reporting with quarantine notice.

---

## 18) Developer Experience

- Storybook with docs/controls for every component; MDX usage guides; copy‑paste code samples.
- VSCode tasks: `yarn dev`, `yarn test:watch`, `yarn e2e`, `yarn storybook`, `yarn typecheck`.
- GraphQL mock server + fixtures for rapid dev; contract tests guard breaking changes.

---

## 19) Migration Plan (from current web)

- Audit existing components; map to new packages.
- Create adapter layer to retain Tailwind utility patterns while moving to MUI primitives.
- Phase routes: (1) Case Studio (tri‑pane), (2) Ingest Wizard, (3) Hypothesis/COA/Report, (4) Admin.
- Data compatibility: maintain GraphQL schema parity; introduce persisted queries & cost hints.

---

## 20) Risk Register & Mitigations

- **Large graph perf:** workerized layouts, level‑of‑detail rendering, sampling; fallback to server‑side aggregation.
- **Map/timeline sync drift:** single source of time truth; debounced events; deterministic rounding.
- **Offline conflicts:** CRDT conflict visualizer; operator approvals for merges.
- **Policy drift confusion:** policy simulator & explainer surfaces before/after diffs.

---

## 21) Open Questions (tracked as issues — initial defaults assumed)

- Thresholds for density rendering on graph/timeline per device class.
- Default corridor risk color ramp accessibility in high‑contrast.
- Exact persisted query catalog & cost budgets per tenant SKU.

---

## 22) Deliverables & Definition of Done

- Working GA app with routes/components as above.
- Storybook coverage ≥ 85% of components with interaction tests.
- Perf, a11y, and policy acceptance criteria green.
- Operator handbook (troubleshooting, feature flags).
- Demo datasets and recorded walkthroughs.

---

### Appendix A — Component Matrix (Abbrev.)

| Category   | Component       | Key Props                          | Events                   |
| ---------- | --------------- | ---------------------------------- | ------------------------ |
| Graph      | GraphCanvas     | graph, layout, filters, timeWindow | selection, contextAction |
| Graph      | GraphToolbar    | filters, layout presets            | onFilterChange, onLayout |
| Graph      | XaiOverlay      | hints, modelId                     | onOpenModelCard          |
| Map        | MapBoard        | layers, timeWindow                 | onDraw, onHover          |
| Map        | CorridorEditor  | route, constraints                 | onSave, onCancel         |
| Timeline   | EventTimeline   | lanes, brush                       | onBrush, onEventOpen     |
| Evidence   | EvidenceList    | query, facets                      | onOpen, onExport         |
| Hypotheses | HypothesisTable | rows, weights                      | onChange, onAnnex        |
| COA        | COAEditor       | dag, resources                     | onSimulate, onExport     |
| Report     | BriefStudio     | sections, figures                  | onExport                 |
| Collab     | CommentsPanel   | threadId, presence                 | onMention                |
| System     | PolicyGate      | check                              | n/a                      |

### Appendix B — Example Flows (Sequence Summaries)

- **NL Query → Cypher Preview → Sandbox Execute → Save View**
- **Ingest CSV → Map Fields → PII/DPIA → Preview → Submit → Timeline/Graph Materialization**
- **COA Design → Monte Carlo → Sensitivity Tuning → Export Brief**

### Appendix C — Sample JSON Types (abbrev.)

```ts
type PolicyLabel = {
  sensitivity: 'public' | 'internal' | 'restricted' | 'secret';
  legalBasis?: string;
  purpose?: string;
  retention?: 'short' | 'std' | 'long';
};

interface NodeFacet {
  id: string;
  type: string;
  confidence: number;
  policy: PolicyLabel;
  provenanceId: string;
}
interface EdgeFacet {
  id: string;
  type: string;
  weight?: number;
  policy: PolicyLabel;
  provenanceId: string;
}

interface SerializedGraph {
  nodes: NodeFacet[];
  edges: EdgeFacet[];
  snapshotAt?: string;
}
```

### Appendix D — Theming Tokens (abbrev.)

```ts
export const tokens = {
  color: {
    bg: { base: '#0b0f14', raised: '#10151c' },
    fg: { base: '#dbe7ff', muted: '#9bb0c9' },
    accent: { primary: '#79ffe1', warn: '#ffd166', danger: '#ef476f' },
    policy: { restricted: '#ff6b6b', secret: '#ffd166', internal: '#118ab2' },
  },
  radius: { sm: 6, md: 12, lg: 20 },
  focus: { ring: '2px solid #79ffe1' },
};
```

---

**End of v1.0 Spec**
