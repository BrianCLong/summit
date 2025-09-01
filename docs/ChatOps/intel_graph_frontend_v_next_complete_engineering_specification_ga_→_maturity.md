# IntelGraph Frontend vNext — Complete Engineering Specification (GA → Maturity)

> Scope: A production‑grade, multi‑tenant web client that enables **every feature and function** enumerated in the master backlog to be usable end‑to‑end. This spec is the single source of truth for IA/UX, architecture, components, data flows, API contracts (client‑side), accessibility, testing, observability, rollout, and roadmap evolution.

---

## 0) TL;DR for Engineering Leads
- **Stack**: React 18 + TypeScript 5, Vite, TailwindCSS, shadcn/ui, TanStack Query, Zustand, Zod, GraphQL (Apollo Client), Web Workers.
- **Viz**: Cytoscape.js (graph), Mapbox GL JS (map), vis‑timeline (timeline), Recharts (charts), Monaco (editors), Mermaid (diagrams).
- **State**: Server data via TanStack Query; local UI via Zustand slices; URL is single source for shareable state.
- **Auth**: OIDC/OAuth2 (PKCE), WebAuthn step‑up; JWT w/ per‑tenant claims; CSRF/clickjacking defenses; PII redaction client‑helpers.
- **Offline**: Service Worker + IndexedDB (Dexie); CRDT (LWW element set) for annotations; deterministic sync queues.
- **Perf budgets**: TTFI ≤ 2.0s @ P95 on analyst machines; Interaction latency ≤ 100ms; Graph render (≤50k nodes neighborhood) ≤ 1.5s.
- **A11y**: WCAG AAA targets; complete keyboard paths; reduced‑motion & high contrast; screenreader‑first flows.
- **Testing**: Vitest + RTL (unit), Playwright (E2E), Axe (a11y), k6 (client perf), mocked GraphQL.
- **Observability**: Web OTEL traces, client metrics, error reporting (Sentry), feature flags, client‑side cost guard hints.

---

## 1) Product Objectives & Non‑Functional Goals
**Objectives**
- Make all core workflows **discoverable and operable** via UI: Ingest → Resolve → Analyze (graph/timeline/map) → Hypothesize → Simulate → Decide → Report.
- Provide an **auditable, explainable** UX for Copilot actions, provenance, permissions, and policy gates.
- Enable **case‑centric collaboration** with compartmentation, legal basis, and exportable disclosure bundles.

**Non‑Functional Targets**
- **Performance**: P95 query+render SLA as in perf budgets below. Lazy load all heavy viz; progressive hydration.
- **Reliability**: Graceful degradation offline; deterministic error boundaries; retryable tasks; feature flag kill‑switches.
- **Security/Privacy**: RBAC+ABAC hints at client; least‑privileged UI; PII minimization; opt‑out of biometric identification.
- **Internationalization**: ICU messages; RTL; timezone/locale correctness.

---

## 2) Information Architecture (IA)
### 2.1 Global Shell
- **Top bar**: Tenant switcher, Case switcher, Global search, Command palette, Presence, User menu (profile, keys, help), Theme toggle.
- **Left nav (contextual)**: Home, Cases, Graph Explorer, Timeline, Map, Ingest, Entities, Hypotheses, COA Planner, Reports, Admin Studio.
- **Right rail (dockable)**: Copilot, Notifications/Tasks, Explain‑This‑View, Audit & Provenance, Filters.
- **Work surface**: Tri‑pane layout (Graph | Timeline | Map) with resizable panes and synchronized selection/brushing.

### 2.2 Primary Routes
- `/login`, `/consent`, `/2fa` (WebAuthn step‑up)
- `/tenant/:tid` (shell)
- `/tenant/:tid/cases` (list, create)
- `/tenant/:tid/case/:cid` (workspace)
  - `/graph`, `/timeline`, `/map` (tabs), `/entities`, `/ingest`, `/hypotheses`, `/coa`, `/reports`
- `/admin` (schema registry, policies, connectors, feature flags, audits)
- `/disclosure/:bundleId` (read‑only viewer with manifest verification)

### 2.3 Navigation Rules
- Deep‑linkable via URL params for time window, filters, selected nodes/paths, map viewport, pinned boards.
- Command palette can navigate to any route, run saved queries, or trigger actions.

---

## 3) UX Blueprints (Flows → Screens → Components)
For each major capability below, we define: **User story**, **Happy path**, **Error edge cases**, **Key interactions**, **Components**, **State**, **Perf/A11y notes**, **Done criteria**.

### 3.1 Ingest Wizard & ETL Assistant
**User story**: As an analyst, I map CSV/JSON/feeds into canonical entities, classify PII, and run streaming enrichment with full lineage.

**Screens**
1) New Ingest → Source selection (catalog + manifest preview)
2) Field mapping (auto‑suggest via schema‑aware helper) + validation
3) PII classification, redaction presets, DPIA checklist
4) Enrichment config (GeoIP, language, hashing, EXIF scrub, OCR/STT toggles)
5) Dry‑run → errors and policy blocks (license/TOS), then Launch job
6) Job monitor (progress, retry, sample rows, lineage trail)

**Components**: `SourcePicker`, `ConnectorCard`, `SchemaMapper`, `MappingTable`, `PIIClassifier`, `PolicyBlocker`, `EnricherPanel`, `JobProgress`, `LineageTrail`.

**State**: `ingest.slice` (source, mapping, policy, enrichers), TanStack Query jobs feed.

**Perf/A11y**: Virtualized tables; diff‑on‑scroll; keyboard mapping editor; live‑region updates for job progress.

**Done**: Map CSV→entities in ≤10 minutes; blocked fields show policy reasons; lineage recorded; manifest downloadable.

### 3.2 Entity Resolution (ER) Review
**User story**: As a steward, I review merge candidates with explainable scorecards; approve/undo merges with policy labels.

**Screens**: Candidates queue → Compare view (side‑by‑side) → Features explanation → Decision (merge/split/hold) → Audit trail.

**Components**: `ERQueue`, `EntityCard`, `FeatureScorebar`, `EvidencePanel`, `DecisionBar`, `MergeGraph`, `HistoryTimeline`.

**State**: `er.slice` (filters, queue position), Query: `/er/candidates`, `/er/explain`, mutations `/er/merge`, `/er/split`.

**Done**: Reproducible merges; reversible merges; override logs captured; conflict graph rendered.

### 3.3 Graph Explorer (Link/Path/Community/Centrality)
**User story**: Visualize and analyze subgraphs; run pathfinding; compute communities and centrality with XAI panels.

**Screens**: Graph canvas with query builder; Saved views; Metrics drawer; XAI/Path rationale panel; Pinboard.

**Components**: `GraphCanvas` (Cytoscape adapter), `QueryBuilder`, `MetricChips`, `XaiPanel`, `Pinboard`, `PathInspector`, `GraphLegend`.

**Interactions**: Lasso/brush; expand/collapse; time‑slice; policy‑aware filters; k‑shortest; compare views.

**State**: `graph.slice` (selection, filters, time window), stream of query results.

**Perf**: Level‑of‑detail rendering; layout caching; async web worker for metrics; viewport‑based pruning.

**Done**: Shortest/k‑shortest and community metrics return with explainability; saved/recalled views; path export.

### 3.4 Timeline (Events) & Synchronized Brushing
**User story**: Inspect entity/case events across time, align with map and graph, highlight gaps.

**Screens**: Timeline board with lanes (entities, narratives, claims), time‑window brush, gap highlighter.

**Components**: `TimelineBoard` (vis‑timeline), `GapMarkers`, `TimeBrush`, `LaneGroup`, `BookmarkBar`.

**Done**: Time‑travel snapshots; gap detection; synchronized selection with Graph/Map.

### 3.5 Map (Geo‑Temporal)
**User story**: Explore trajectories, stay‑points, rendezvous/convoy detections; draw geofences and corridors.

**Components**: `MapView` (Mapbox GL), `TrajectoryLayer`, `StayPointLayer`, `RendezvousLayer`, `FenceEditor`, `CorridorRiskOverlay`.

**Done**: Import sample AIS/ADS‑B; detect colocations; toggle corridor risk; export as layer.

### 3.6 Pattern Miner & Anomaly/Risk Triage
**User story**: Run pattern templates (co‑travel, structuring), tune parameters, triage anomalies with justifications.

**Screens**: Template library → Parameter sheet → Result list → Triage queue.

**Components**: `PatternLibrary`, `ParameterSheet`, `ResultGrid`, `TriageQueue`, `ExplainBadge`.

**Done**: 20+ templates; ROC/AUC displays; XAI reasons; saved templates with provenance.

### 3.7 Hypothesis Workbench
**User story**: Create competing hypotheses, link evidence with weights, track residual unknowns, export CH/COI tables.

**Components**: `HypothesisCanvas` (DAG), `EvidenceLinker`, `WeightSlider`, `UnknownsList`, `DissentAnnex`.

**Done**: Bayes updates applied; dissent annex; narrative builder integration; exportable tables.

### 3.8 COA Planner & What‑If Simulation
**User story**: Model COAs (DAGs), run Monte Carlo over graph transitions, compare likelihood/impact bands.

**Components**: `CoaCanvas`, `DependencyEditor`, `SimulationPanel`, `SensitivitySliders`, `AssumptionLog`.

**Done**: Side‑by‑side COA comparison; assumptions logged; after‑action template generated.

### 3.9 AI Copilot (Auditable)
**Panels**: (a) NL→Cypher query with preview and cost estimate; (b) GraphRAG answers with inline citations; (c) Hypothesis/Narrative drafting with guarded language; (d) ETL schema helper.

**Components**: `CopilotDock`, `PromptEditor` (Monaco), `CypherPreview`, `CostEst`, `CitationList`, `PolicyReasoner`, `RetryWithContext`.

**Done**: ≥95% syntactic validity for generated queries; missing citations block publication; guardrail denials show reasons and appeal path.

### 3.10 Collaboration (Case Spaces) & Reporting
**Features**: Tasks with SLAs; @mentions; comments (immutable audit); brief/report studio (timeline/map/graph figures, caption assistant); disclosure packager with manifest verification.

**Components**: `CaseDashboard`, `TaskBoard` (SLA badges), `CommentStream`, `BriefStudio`, `ExportWizard`, `ManifestVerifier`.

**Done**: All edits/audits visible; one‑click PDF/HTML; disclosure bundle verifiable.

### 3.11 Admin Studio
**Features**: Schema registry (safe extensions), connector health, job control, policy simulator, feature flags, auth/audit search.

**Components**: `SchemaRegistry`, `ConnectorHealth`, `JobControl`, `PolicySimulator`, `FeatureFlags`, `AuditSearch`.

**Done**: Dry‑run policy change vs. historical patterns; zero criticals before release gates.

---

## 4) Component Inventory (Atomic → Composite)
**Atoms**: Button, IconButton, Tooltip, Badge, Tag, Toggle, SegmentedControl, Spinner, Avatar, Checkbox, Radio, Input, Select, DateRangePicker, TimezonePicker, FileDrop, Pill, MetricChip, Toast, Dialog/Sheet, Popover.

**Molecules**: DataTable (virtualized), KeyValueList, JsonViewer, CodeEditor (Monaco), QueryBuilder blocks, MapLayerControl, GraphLegend, TimelineLane, EvidenceCard, MergeCard, PolicyBadge, LicenseBadge, ConfidenceBar, RiskBar, SLAClock.

**Organisms**: LinkAnalysisBoard, TimelineBoard, MapBoard, IngestWizard, ERReview, HypothesisWorkbench, CoaPlanner, CopilotDock, ReportStudio, AdminConsole.

**Layouts**: AppShell, TriPane, TwoPane, DrawerStack, ModalStack.

**Cross‑cutting UI**: CommandPalette (kbar), GlobalSearch, Notifications, Presence (avatars), KeyboardShortcutsOverlay.

---

## 5) Client Architecture
### 5.1 Libraries & Patterns
- **React + TS + Vite**. Routing via React Router v7.
- **shadcn/ui** for primitives; Tailwind Design Tokens (color/space/typography); CSS variables for themes.
- **TanStack Query** for server data (GraphQL links + REST fallbacks); retries/backoff; background revalidation.
- **Zustand** slices: `app`, `case`, `graph`, `timeline`, `map`, `ingest`, `er`, `hypothesis`, `coa`, `copilot`, `admin`.
- **Apollo Client** (Codegen): typed queries/mutations; persisted queries; cost hints.
- **Web Workers**: heavy graph algorithms, layouts, diffing, and CSV parse; Comlink wrappers.
- **Dexie (IndexedDB)**: offline cache of case data, saved views, disclosure bundles; LWW sets for annotations.

### 5.2 Directory Layout
```
apps/web/
  src/
    app-shell/
    routes/
      login/
      tenant/[tid]/
        index.tsx
        cases/
        case/[cid]/
          graph/
          timeline/
          map/
          entities/
          ingest/
          hypotheses/
          coa/
          reports/
    components/
      atoms|molecules|organisms
    state/
      slices/*.ts
    api/
      graphql/ (gql, fragments, codegen)
      rest/
    workers/
    lib/
    theme/
    i18n/
    tests/
```

### 5.3 Data Contracts (Client‑Side)
- **GraphQL**: Persisted queries with cost metadata; pagination cursor pattern; field‑level authz errors surface as Policy badges.
- **Streaming**: WebSocket/SSE for live jobs & notifications.
- **File I/O**: Signed URLs; chunked upload; resumable; checksum verify.

### 5.4 Error Model
- Normalized `AppError { code, message, cause?, policyReason?, retryAfter?, correlationId }`.
- Error boundaries per route; toast for non‑blocking; inline for blocking; attach correlationId.

---

## 6) Security, Privacy & Governance in UI
- **AuthN**: OIDC PKCE; optional SAML; step‑up via WebAuthn; rotation prompts; session idle lock.
- **AuthZ**: Client honors RBAC/ABAC hints; hides not denies when appropriate; “why can’t I?” helper shows policy reasons.
- **Reason‑for‑Access** prompts: modal before sensitive views; cached per session with TTL.
- **Redaction & Minimization**: PII indicators on forms; redaction maps on documents; license class badges.
- **Audit Surface**: Everywhere shows ‘who/what/why/when’ flyouts; export manifests verify in Disclosure Viewer.
- **Content Security**: CSP, Trusted Types, sanitized HTML; no inline scripts; strict MIME types; antiforgery tokens.

---

## 7) Accessibility (WCAG‑AAA Targets)
- Every interaction has a **keyboard‑only** path; focus traps audited; skip links; logical tab order.
- ARIA roles/labels; live regions for async updates; reduced‑motion alt.
- High contrast palette; color not sole signal (icons + text).
- Screenreader narrative for complex viz: Graph/Map/Timeline expose summaries and path tables.

---

## 8) Performance & Capacity Budgets
- **Bundle**: ≤ 250KB initial JS (gzip) for shell; code‑split feature routes; prefetch on idle.
- **Graph**: Render ≤ 50k‑node neighborhood in ≤ 1.5s using worker‑driven layout and LOD nodes; throttle redraws.
- **Timeline/Map**: Windowed rendering; tile cache; pre‑aggregated bins.
- **Network**: HTTP/2, gzip/brotli; CDN cache for static; client caching with stale‑while‑revalidate.
- **Instrumentation**: web‑vitals, custom metrics: time‑to‑first‑insight (TTFI), query‑to‑render, triage throughput.

---

## 9) Offline/Edge Mode
- **Service Worker**: install screen; background sync; per‑case cache; signed sync logs.
- **Conflict UI**: Divergence report; per‑field diff; operator approvals; CRDT merges for annotations.
- **Degraded UX**: Local tri‑pane works with last snapshot; changes queued; banner shows status.

---

## 10) Internationalization & Localization
- ICU message format; fallback locales; runtime language switch; numeric/date/units per locale.
- RTL support; bidi‑safe components.

---

## 11) Testing Strategy & Quality Gates
- **Unit**: Vitest + React Testing Library; 90% critical path coverage.
- **Contract**: GraphQL schema codegen check; fixture‑based golden outputs for queries.
- **E2E**: Playwright scripts for top journeys (ingest→resolve→analyze→report); screenshot diffs for visual regressions.
- **A11y**: Axe automated scans + manual audits on complex viz.
- **Load/Perf**: k6 scripts emulating typical analyst sessions; worker stress on large graphs.
- **Security**: Authz depth tests; query depth limits; XSS/HTML injection tests.
- **Acceptance packs**: per feature with fixtures, golden outputs, policy denials.

**CI Gates**: All above must pass; client bundle size budget; lighthouse scores; a11y checks; E2E green on preview env.

---

## 12) Observability & Feature Flags
- **Tracing**: OTEL browser SDK → collector; link client spans with backend spans via traceparent.
- **Metrics**: User timing (TTFI, query‑to‑render), interaction latency, error rate; tenant cost hints.
- **Logging**: Redaction of PII; correlationId propagation.
- **Flags**: Variants per tenant/case; kill switches for heavy analytics and Copilot features.

---

## 13) Design System & Visual Language
- **Tokens**: Color (semantic), spacing, typography; motion durations; radii (2xl); shadows (soft).
- **Themes**: Light/Dark/High‑Contrast; prefers‑color‑scheme default.
- **Charts**: Neutral palettes by default; color‑blind safe; confidence as opacity.
- **Icons**: lucide‑react; consistent metaphors (provenance, policy, license, confidence).

---

## 14) Detailed Feature Specs (Selected)
### 14.1 Provenance Overlays
- Tooltip shows source→transform chain, hash, confidence, license.
- Path inspector lists supporting/contradicting claims with evidence links.
- Export bundles include manifest; viewer verifies hashes and transformation chain.

### 14.2 Policy & License Engine (Client Hints)
- Every action checks precomputed policy hints; if denied, the UX shows **why** and the appeal path.
- License badges on data blocks; export wizard blocks on license clauses with human‑readable reasons.

### 14.3 Copilot Guardrails
- Model cards surfaced; temperature bounds; prompt privacy notice; red‑team prompts logged.
- “Retry with more context” suggests schema snippets or saved views.

### 14.4 Disclosure Packager
- Select evidence; auto‑add provenance; compute manifest; include right‑to‑reply fields; render printable HTML/PDF.

### 14.5 Deception Lab (Defensive)
- Register honeypots/decoys; track telemetry; show lure effectiveness; purple‑team scripts library (read‑only).

---

## 15) API Shapes (Client‑Facing)
> **Note**: All server contracts live in backend specs; below are client expectations and example fragments.

**GraphQL Fragments** (examples):
```graphql
fragment Provenanced on HasProvenance {
  id
  provenance { sourceId transform hash confidence license }
}

query CaseEntities($caseId: ID!, $cursor: String) {
  case(id: $caseId) {
    id
    entities(after: $cursor, first: 100) {
      edges { node { id type name ...Provenanced } }
      pageInfo { endCursor hasNextPage }
    }
  }
}
```

**ER API (REST)**
- GET `/er/candidates?caseId=...&after=...`
- POST `/er/merge {leftId,rightId, rationale, labels}` → `202 Accepted`
- POST `/er/split {entityId, rationale}`
- GET `/er/explain?id=...` → features & weights

**Copilot**
- POST `/copilot/nl2cypher {prompt, caseId}` → `{cypher, costEstimate, preview}`
- POST `/copilot/ragrun {question, caseId}` → `{answer, citations[]}` (citations are required to publish)

**Policy/License**
- POST `/policy/simulate { action, context }` → `{allow|deny, reason, appealPath}`

---

## 16) Security Threat Model (Client)
- **Abuse trees**: prompt injection, data poisoning surfaces in UI, insider misuse via over‑broad queries.
- **Controls**: JIT access prompts; immutable audit surfacing; honeytokens in datasets; query heuristics warnings.

---

## 17) Rollout & Environments
- **Envs**: dev → stage → prod; preview env per PR (Vercel/Netlify‑like) with seeded synthetic data.
- **Canary**: feature flags guard rollouts; auto‑rollback on metrics regression.
- **Docs**: User playbooks & cookbooks; demo modes; operator guides.

---

## 18) Roadmap (Frontend Milestones)
**GA (Q3–Q4 2025)**
- Deliver tri‑pane experience, ingest wizard, ER review, core graph analytics, Copilot (NL→Cypher + RAG), reporting, admin studio.
- 10+ connectors visible in UI; policy/guardrails; disclosure viewer; offline kit v1.

**Maturing (Q1–Q2 2026)**
- Graph‑XAI overlays across anomalies/ER/forecasts; fairness & robustness views.
- Federated search prototype; deeper SIEM/XDR bridges; 25+ runbooks UI; JanusGraph option toggle.

**Advanced (H2 2026 → 2027)**
- Multi‑graph federation UX; advanced simulations; crisis cell with COA comparisons; marketplace for connectors/runbooks.

---

## 19) Acceptance Criteria (UI‑Specific)
- **Usability**: measured reductions in TTFI and path discovery; user‑testing milestones met.
- **Explainability**: every inference has a viewable rationale; missing citations block publication.
- **Governance**: reason‑for‑access prompts; export manifests verify; dual‑control deletes visible.
- **A11y**: axe scans pass; manual audits of graph/map/timeline narrations.
- **Perf**: budgets met on reference hardware; soak tests stable.

---

## 20) Open Questions & Assumptions
- Auth provider mix (OIDC vs SAML) per tenant confirmed at deploy time.
- Choice of map provider (Mapbox vs ESRI) configurable; default Mapbox GL.
- Data volume guardrails (server‑side pagination limits) exposed to UI via cost hints.
- Copilot model selection (server‑side) exposed via capability manifest.

---

## 21) Appendix — Keyboard Shortcuts (Initial)
- `⌘/Ctrl K`: Command palette
- `G` then `G`: Graph tab; `G` then `T`: Timeline; `G` then `M`: Map
- `⌘/Ctrl F`: Search
- `⌘/Ctrl E`: Export disclosure pack
- `?`: Shortcuts overlay

## 22) Appendix — Visuals & Wireframe Notes
- Provide monochrome wireframes for each screen in Figma (IDs TBD). Annotate focus order and screenreader text.

— End of Spec —

