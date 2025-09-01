# IntelGraph — Frontend Rebuild & Roadmap Spec (v1.0)

**Purpose.** Give the web team everything needed to **rebuild from zero** and then **extend/expand/refine** the IntelGraph UI so that *every* feature/function in the product backlog is usable, governed, and measurable. This is a living spec; PRs update it alongside implementation.

**Audience.** Frontend engineers, design systems, accessibility, performance, DevEx, QA, SRE, security, and product/UX.

---

## 0) North‑Stars & Success Criteria
- **Analyst Time‑to‑Insight ↓**: measurable reduction vs. baseline tasks (graph pathfinding, entity triage, report drafting).
- **Evidence Integrity ↑**: provenance, confidence, and policy context are *first‑class* in the UI.
- **Guardrails by Default**: any denied action surfaces a human‑readable reason and appeal path.
- **Keyboard‑first, A11y AAA**: all critical flows fully operable without a mouse; screen reader parity.
- **Offline/Degraded Operation**: tri‑pane, case notes, and queued actions usable when disconnected.
- **SLOs Observable**: p95 UI latency and error budgets are tracked and regressions gate release.

---

## 1) Architecture & Tech Stack
**Framework**: React 18 + TypeScript 5, Vite build (ESM), optional Next.js adapter for SSR/ISR in cloud deployments.

**UI System**: Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react icons; custom graph/map/timeline components.

**State**:
- **Server State**: TanStack Query (query+mutation caching, request dedupe, optimistic updates).
- **Client/Session State**: Zustand stores (per feature) with persistable slices for offline.
- **URL State**: Route params + search params; shareable, immutable “view URLs.”

**Data Access**: Apollo Client (GraphQL) with **persisted queries**, auth link, retry/backoff, query cost hints, normalized cache per tenant/case.

**Routing**: React Router v6.28 (or TanStack Router). App shell with lazy‑loaded feature routes.

**Authn/Z**: OIDC/OAuth2 (PKCE) with step‑up WebAuthn/FIDO2 challenge modal; ABAC hints piped in JWT claims + policy sidecar. Session tokens kept in Secure, HTTP‑only cookies; refresh via silent iframe or refresh endpoint.

**Workers**: Web Workers for heavy transforms (CSV preview, small subgraph metrics, local diffing); Workbox service worker for offline caching & background sync.

**Maps/Graph/Timeline Engines**:
- **Graph**: Cytoscape.js (WebGL renderer) with custom layers for policy and provenance; virtualized edge rendering; LOD (level of detail) strategies.
- **Map**: Mapbox GL JS (vector tiles) with ESRI/GeoJSON adapter; geofences & corridor overlays.
- **Timeline**: VisX (d3 under the hood) for dense event lanes, time‑brushing, and selection sync.

**Charts**: Recharts for lightweight histograms, distributions, and KPIs.

**Internationalization**: i18n with ICU messages; RTL support; locale‑aware date/number/units.

**Error/Telemetry**: OpenTelemetry Web SDK (resource, traces, user action spans); Sentry (or equivalent) for crash/error capture.

**DevEx**: pnpm monorepo; packages for `ui/`, `icons/`, `hooks/`, `theme/`, `testing/`; Storybook with visual regression.

---

## 2) App Shell & Navigation
- **Global Frame**: top command bar (palette, search, help), left nav (cases, graph, analytics, runbooks, admin), right utility rail (explain/guardrails, notifications, watchlist).
- **Command Palette**: `⌘K` opens fuzzy actions (navigate, “explain this view”, “new case”, “runbook: …”).
- **Presence & Collaboration**: avatars + cursors for case rooms; @mentions; comment side panel with immutable audit stamps.
- **Undo/Redo & Diff**: global history service with per‑feature stacks; UI diffs for case edits and schema changes.

---

## 3) Core Experience: Tri‑Pane (Graph / Map / Timeline)
**Tri‑pane layout** with synchronized brushing and selections. All panes can dock/undock, resize, and pop‑out.

### 3.1 Selection & Sync
- Single selection model (entity, edge, subgraph, time range, geography) with multi‑select + lasso.
- Sync rules: selecting a node highlights paths on graph, pins pins on map, and shades time buckets on timeline.
- Cross‑filter controls: by time range, spatial bounds, policy labels, source/license, confidence band.

### 3.2 Provenance & Confidence Overlays
- Hover tooltips show source chain, transform history, license, hash, and confidence.
- Confidence opacity: low‑confidence items visually de‑emphasized; users can toggle thresholds.

### 3.3 Policy/Guardrail Overlays
- Policy labels and legal basis displayed as chips; attempt to cross a boundary triggers **Explain/Appeal** dialog.

### 3.4 Performance & Scale
- Progressive render: nodes/edges batched; WebGL LOD; server‑side subgraph sampling for huge neighborhoods.
- Virtualized lists/tables; background Web Worker for layout recalcs.

---

## 4) Feature Specs (by Capability)

### 4.A Data Intake & Preparation (UI)
1) **Ingest Wizard**
   - Drag‑drop CSV/JSON/Parquet, mapping assistant (AI suggestions), PII detector, DPIA checklist, redaction presets.
   - License/TOS rule display; blocked fields show policy text + appeal workflow.
   - Acceptance: map → preview → validate → ingest in ≤10 min for golden samples.

2) **Connectors Catalog**
   - Cards for connectors with status, rate limits, sample datasets; golden tests link; “Add to Case” flow.
   - Health indicators; retries, backfills, and backpressure hints.

3) **Streaming ETL Monitor**
   - Live pipeline view (ingest → enrich → load); poison/quarantine badges; sensor health drift alerts.

4) **Data License Registry**
   - Per‑source license surface; usage constraints; export blockers with reason; owner/appeal contact.

### 4.B Canonical Model & Graph Core (UI)
1) **Schema Explorer**
   - GraphQL schema browser (entities/edges/facets) + JSON‑LD vocab; version history & diff.

2) **Entity Resolution Console**
   - Candidate pairs with explainable scorecards; merge/split with reversible history; adjudication queues; policy labels on merges.

3) **Time‑Travel & Bitemporal Views**
   - View snapshots as of `t`; timeline gap highlighter; compare two time slices.

4) **Geo‑Temporal Tools**
   - Trajectories, stay‑points, rendezvous/convoy detection; corridor risk and geofencing layers.

5) **Provenance & Claim Ledger UI**
   - Evidence registration, source signatures/hashes; contradiction graphs; disclosure bundle builder.

### 4.C Analytics & Tradecraft (UI)
1) **Link/Path/Community Suite**
   - K‑shortest & policy‑aware paths; communities (Louvain/Leiden) with explainers; centrality metrics with “why” panel.

2) **Pattern Miner**
   - Temporal motifs, co‑travel/co‑presence, financial structuring; template library (20+), parameter panels, save/share with provenance.

3) **Anomaly & Risk**
   - Detector gallery (degree, egonet, temporal spikes, selector misuse); tunable thresholds; ROC preview; triage queues.

4) **Hypothesis Workbench**
   - Competing hypotheses, evidence weights, missing evidence prompts, Bayes updates, dissent annex; report template autopopulates CH/COI tables.

5) **COA Planner & What‑If**
   - COAs as DAGs; dependencies/resources; Monte Carlo sims; defensive deception lab integration (honeypots/decoys telemetry loop).

6) **Strategic/Predictive**
   - Timeline forecasting with confidence bands; counterfactual simulator; crisis playbooks; war‑gamed decision dashboard with tabletop recorder.

### 4.D AI Copilot (Auditable)
1) **NL → Cypher/SQL**
   - Prompt box with generated query preview, **cost/row estimate**, sandbox execute, diff vs. manual.

2) **GraphRAG/Evidence‑First**
   - Retrieval shows **path rationales**; inline citations; redaction awareness; missing citations block publish.

3) **ETL Assistant**
   - Field mapping suggestions; dedupe candidates; quality warnings; DPIA pre‑submit checklist.

4) **Hypothesis & Narrative Builder**
   - Alternative explanations; prompts for missing evidence; draft briefs with figures from graph snapshots.

5) **Guardrails Panel**
   - Policy reasoner output; model cards; blocked actions show justification + appeal path; red‑team prompts preserved.

### 4.E Collaboration & Workflow
- **Case Spaces** (roles, tasks, watchlists, SLAs, 4‑eyes) with immutable audit and legal hold.
- **Brief/Report Studio** (timeline/map/graph figures, caption assistant) with one‑click PDF/HTML + redaction maps.
- **Disclosure Packager** (hash manifest, license terms) and cross‑tenant hashed deconfliction.

### 4.F Security, Governance & Audit (in UI)
- **Access Explainability**: who/what/why/when panels; reason‑for‑access prompts; warrant/authority decorations on queries.
- **Privacy Guards**: k‑anonymity toggles, minimization warnings at ingest; purpose limitation chips.
- **Key/Secrets Posture**: client surfaces enclave/field‑level encryption statuses (read‑only indicators).

### 4.G Integrations (UI Touchpoints)
- **STIX/TAXII & MISP** import/export modals with mapping preview and license warnings.
- **SIEM/XDR Bridges**: indicator sync dashboards; failure queues; replay controls.
- **GIS** layers and shapefile imports; **Relativity/Nuix** export wizard with chain‑of‑custody preview.

### 4.H Ops, Observability & Reliability (Client‑side)
- **SLO Widgets**: p95 render time, error rate per route; latency heatmaps.
- **Cost Guard Surface**: client receives budget hints; UI shows query budget consumption; slow‑query killer prompts.
- **Offline/Edge Mode**: expedition kit UX; conflict resolution view for CRDT merges; signed sync logs viewer.
- **Admin Studio**: connector health, job retries/backfills, schema registry UI, feature flags.

---

## 5) Screens & Routes
```
/
  /cases
    /:caseId
      /overview
      /graph
      /map
      /timeline
      /entities
      /evidence
      /hypotheses
      /coa
      /reports
      /disclosure
  /ingest (wizard)
  /connectors
  /anomalies
  /runbooks
  /admin (schema, connectors, flags, audit, cost)
  /help (playbooks, tutorial, model cards)
```

---

## 6) Design System & Visual Language
- **Tokens**: colors (dark/light/high‑contrast), spacing, radii (2xl default), typography scale (xs→7xl), elevation, motion.
- **Components**: Buttons, Dropdowns, Menus, Dialogs, Toasters, Tabs, DataTable (virtualized), EmptyStates, Skeletons, Breadcrumbs, Breadcrumb+Command hybrid.
- **A11y**: Radix primitives; aria‑labels for all controls; focus rings; reduced motion mode.
- **Motion**: Framer Motion for micro‑transitions (pane docking, hover reveals, selection bursts) with reduced‑motion fallbacks.

---

## 7) Data Contracts & GraphQL
- **Persisted Queries** only; forbid ad‑hoc queries in prod.
- **Cost Limits**: client displays server‑reported cost; warns before high‑cost queries; suggests narrowing filters.
- **Field‑level Auth**: GraphQL errors map to UI guardrails; never guess—always show precise denial reason.
- **Pagination**: cursor‑based; expose `pageInfo` in UI; infinite scroll with “Load exact N.”
- **Streaming**: use GraphQL subscriptions for live streams (ingest status, runbook progress, alerts).
- **SDK**: typed hooks via codegen (`graphql-code-generator`), per‑tenant caches, offline queue for mutations.

---

## 8) Offline & Sync
- **Caching**: Workbox strategies (stale‑while‑revalidate for assets, network‑first for queries, queue mutations).
- **CRDTs**: LWW element‑set for annotations/pinboards; op‑log per case; conflict inspector UI.
- **Sync Safety**: signed sync logs; operator approvals for destructive merges; divergence reports after reconnect.

---

## 9) Security Posture in the Client
- **Secrets**: no tokens in localStorage; cookies only.
- **Clickjacking**: frameguard headers assumed; UI includes in‑app `open in new window` for case‑safe shares.
- **Clipboard & Export**: redaction and license checks run client‑side before enabling copy/export.
- **Honeytokens**: visually marked (operator‑only) with tripwire notes; never expose to general users.

---

## 10) Performance Budgets & Tuning
- **Initial TTFI ≤ 2.5s** on standard analyst hardware; route switch ≤ 250ms p95.
- **Bundle Targets**: < 250KB critical path (gz), rest code‑split by feature; prefetch on idle.
- **Rendering**: avoid re‑renders via memoization/selectors; windowed lists; debounced brush events.
- **Graph**: max draw batch per frame; adaptive simplification when > N nodes on screen; WASM layout option.

---

## 11) Telemetry, Audit & Product Analytics
- **OTEL**: route view spans, user actions (command palette usage, filters applied), network spans; correlate with server traces.
- **Audit Surface**: “Why am I seeing this?” panel; reason‑for‑access prompts on sensitive views.
- **Analytics**: feature usage counters; funnels for ingest→analyze→report; privacy‑first (aggregate only).

---

## 12) Error Handling & Guardrails UX
- **Global Error Boundary** with incident IDs, safe retry, and “include diagnostics” toggle.
- **Policy Denials** show: rule name, legal basis, what to change, and explicit appeal workflow.
- **Soft‑Fail** modes: partial results with red/amber banners and remediation hints.

---

## 13) Testing Strategy
- **Unit**: Vitest + RTL; hooks and components with MSW for API mocks.
- **E2E**: Playwright across roles/tenants (happy path + abuse cases); offline/CRDT flows tested.
- **Accessibility**: axe‑core CI gate; manual screen‑reader audits.
- **Visual**: Storybook + screenshot diffs on critical views (tri‑pane, ER console, report studio).
- **Load/Soak**: k6‑driven synthetic UI interactions; big graph view stress; long‑running sessions.

---

## 14) Feature Flags & Environments
- **Flags**: `ff.ai.copilot`, `ff.predictive.suite`, `ff.offline.kit`, `ff.federated.search`.
- **Env Matrix**: dev (hot reload) → preview (ephemeral per PR) → stage (prod data double‑write, shadow traffic) → prod.
- **Observability**: release health dashboards; SLO burn alerts; feature adoption reports.

---

## 15) Roadmap Alignment (Frontend Deliverables)
**Near‑Term (Q3–Q4 2025)**
- Ship Core GA shell: tri‑pane UI, ABAC surfaces, audit panels, 10+ connectors UIs, Copilot v1 (NL→Cypher preview), Prov‑Ledger export preview, Offline Kit v1.
- SLO dashboards, cost guard surfaces, chaos drill hooks in UI.

**Mid‑Term (Q1–Q2 2026)**
- Graph‑XAI overlays on anomalies/ER/forecasts; fairness/robustness views.
- DFIR adapters UX; federated search prototype (cross‑tenant hashed deconfliction badges).
- Runbooks 25+ with DAG editor + replay logs.

**Longer‑Term (H2 2026 → 2027)**
- Federation GA UI; advanced simulations and counter‑deception experiments; Crisis Cell live ops board; marketplace surfaces for connectors.

---

## 16) Acceptance Criteria (UI slices)
- **ER Explainability**: merge decisions show features/scores/overrides; reversible logs.
- **Hypothesis Rigor**: briefs include competing hypotheses, evidence weights, residual unknowns.
- **Policy‑by‑Default**: all blocked actions show rule + appeal; policy change simulator has dry‑run diff UI.
- **Provenance Integrity**: exports bundle manifest with hash tree & transform chain; external verifier green.
- **UI Usability**: TTFI & task time tracked; regressions fail CI.

---

## 17) Epics → Stories (Frontend)
- **EPIC: Tri‑Pane** → layout, sync engine, overlays, LOD, pinboards, saved views.
- **EPIC: Ingest Wizard** → file parse, mapping AI, PII flags, DPIA, license checks, lineage preview.
- **EPIC: ER Console** → candidates, explainers, merge/split, adjudication queues, policy labels.
- **EPIC: Copilot** → NL→Cypher, cost estimates, RAG with citations, guardrails panel, narrative builder.
- **EPIC: Analytics Suite** → pathfinding, communities, centralities, pattern miner, anomaly gallery.
- **EPIC: COA & Predictive** → DAG editor, sim runner, confidence bands, decision dashboard.
- **EPIC: Reports & Disclosure** → report studio, export+redaction, disclosure packager, right‑of‑reply.
- **EPIC: Governance & Audit** → access reasons, warrant badges, ombuds queue surface.
- **EPIC: Offline Kit** → SW caching, CRDT conflicts, sync logs, divergence reports.
- **EPIC: Admin Studio** → schema registry, connector health, feature flags, job control.

Each epic breaks into Definition of Ready, Definition of Done, fixtures, and golden outputs.

---

## 18) Security & Abuse‑Case UX Playbooks
- Insider misuse, prompt injection, data poisoning, lateral movement: provide canned UI responses (quarantine banners, appeal paths, ombuds contact) and red‑team rehearsal scripts.

---

## 19) Appendix — Query Cookbook (UI)
- Time‑travel, policy‑aware paths, geo‑temporal co‑presence, narrative contradictions, COA removals — all available as **saved query templates** with preview cards and expected result types (table, path set, subgraph, map layer, timeline events).

---

## 20) Open Questions / Future Considerations
- Multi‑graph federation UI contracts (cross‑tenant hashed deconfliction visuals).
- JanusGraph back‑end option impacts on query surface and explainers.
- Marketplace governance for third‑party connector UIs and license scanning.

---

**Deliverable**: This spec is considered *accepted* when the Shell (Sections 1–3) and at least one complete flow per Capability (Section 4) meet Section 16’s acceptance criteria with telemetry and tests wired in.

