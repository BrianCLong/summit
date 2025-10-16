# IntelGraph — Front‑End Product Specification (v1.0)

_Council of Spies & Strategists • Chair: Markus Wolf_

> Purpose: Enable the engineering team to **rebuild the entire front end** and then **extend/expand** it across the roadmap so that **every feature and function is usable**. This spec is implementation‑ready: IA, routes, component contracts, data shapes, states, A11y, i18n, testing, perf budgets, and acceptance.

---

## 0) Scope & Non‑Goals

**Scope**

- Analyst UI for IntelGraph (tri‑pane graph/timeline/map) with synchronized brushing and pinboards.
- Case/workflow surfaces; ingestion wizard; ER/claims/provenance views; analytics & tradecraft panels.
- AI Copilot with auditable NL→Cypher preview, RAG citations, narrative builder, and guardrails.
- Admin Studio (policies, schema registry, connectors health, audit explorer).
- Offline/edge expedition mode with CRDT conflict resolution.

**Non‑Goals**

- Backend service specs (covered in server/… docs).
- Unlawful surveillance or targeted‑violence enablement. Product is **defensive/ethical** by design.

---

## 1) Product Principles

- **Provenance Before Prediction**: every visible claim is traceable; tooltips expose source→transform chain.
- **Compartmentation by default**: the UI enforces case/tenant scopes; sensitive flows are dual‑control.
- **Explainability first**: graphs, scores, and model outputs ship with XAI overlays and confidence bands.
- **Operate degraded**: offline kits; deterministic resync; reproducible exports.
- **Keyboard‑first**: command palette, shortcuts, and AAA accessibility.

---

## 2) Technology Stack & Conventions

- **Framework**: React 18 + TypeScript, Vite (or Next 15 App Router if SSR needed). Monorepo via Turborepo.
- **Styling/Design**: Tailwind CSS + shadcn/ui; CSS variables for theming (light/dark/high‑contrast).
- **Icons/Charts/Graph/Map**: lucide‑react; Recharts; Cytoscape.js (graph), React Flow for DAGs; Mapbox GL JS.
- **Data**: GraphQL (Urql or Apollo) + persisted queries; React Query for non‑GraphQL fetches.
- **State**: Redux Toolkit (app‑level) + RTK Query/Urql cache; Zustand for local feature stores.
- **Routing**: file‑system routing; deep‑linkable URLs (case/selection/time window encoded).
- **i18n**: i18next; ICU message format; locale packs; RTL resilience.
- **Testing**: Vitest/Jest + React Testing Library; Playwright E2E; Storybook for components.
- **Obs/Perf**: Web Vitals; OpenTelemetry web SDK; feature flags via config provider; Sentry (self‑host) or OpenTelemetry errors.
- **Security**: OIDC/OAuth2 (PKCE), WebAuthn step‑up, Content‑Security‑Policy, Trusted Types (if applicable), Strict‑Transport‑Security, Subresource Integrity; CSP nonces on SSR.

---

## 3) Information Architecture & Navigation

**Global Shell**

- **Left rail**: Home, Cases, Streams, Analytics, Runbooks, Reports, Admin.
- **Top bar**: Global search, command palette (⌘K), tenant/case switcher, live status (ingest/analytics), profile menu.
- **Footer**: legal/authority indicator for current view, build hash, environment badge.

**Primary Workspaces**

1. **Case Space** — tri‑pane (Graph • Timeline • Map) + pinboards; tasks/watchlists/SLA; comments with audit.
2. **Ingestion** — connectors catalog, ingest wizard, job monitor.
3. **Analytics** — link/path/centrality suites; pattern miner; anomaly/risk triage.
4. **Hypothesis & COA** — hypothesis workbench; COA planner; what‑if simulator; decision dashboard.
5. **Report Studio** — timelines, map boards, exhibits; redaction and disclosure packager.
6. **Admin Studio** — schema registry, policy simulator, warrant registry, license/TOS engine, user/role (SCIM), audit explorer.

---

## 4) Routing Map (Deep‑Linkable)

```
/ (home)
/cases/:caseId
  /graph              (tri‑pane default)
    ?t=ISO8601..ISO8601&sel=node:123,edge:456&view=map|timeline|graph
  /entities/:entityId (details)
  /hypotheses         (workbench)
  /coa                (planner)
  /reports            (studio)
/ingest
  /catalog            (connectors)
  /wizard/new         (schema map → PII → DPIA → review)
  /jobs/:jobId        (progress/logs)
/analytics            (suites/patterns/anomalies)
/runbooks             (library & executions/DAG)
/admin
  /policies           (OPA rules, ABAC labels, simulate)
  /schema             (registry/migrations)
  /connectors         (health/quotas)
  /audit              (who/what/why/when)
  /warrants           (authority binding)
  /licenses           (TOS/license engine)
/settings             (profile, keys, notifications)
```

---

## 5) Core Interaction Patterns

- **Tri‑Pane Synchronization**: brushing the **Timeline** filters **Graph** & **Map**; box‑select on Map/timeline pins subgraph; selections persist to URL.
- **Pinboards & Saved Views**: capture current filters + layout + annotations; share by link with permission check.
- **Explain‑This‑View**: side panel shows query, cost estimate, provenance counts, and XAI rationale.
- **Confidence Opacity**: render low‑confidence edges with reduced opacity and dashed strokes.
- **Policy‑Aware UI**: edges/nodes invisible or obfuscated per labels; actions require reason‑for‑access prompts.
- **Dual‑Control Actions**: deletions, merges, exports; request→approve flow with audit trail.

---

## 6) Feature Specs (per surface)

### 6.1 Graph Explorer (link analysis canvas)

**Purpose**: Explore and annotate networks; pivot; filter by time/space; run quick analytics.

**Component Tree**

- `GraphViewport` (Cytoscape): layout engine (COSE, FCose), WebWorker layout option; edge bundling.
- `InspectorPanel`: entity/relationship details; provenance; related claims; actions (task, watchlist, tag).
- `FiltersDock`: time brush, type chips, degree/filter sliders, policy toggles.
- `PivotBar`: expand/collapse by relation; K‑paths finder; shortest/policy‑aware paths; saved pivots.
- `AnnotationLayer`: pins, callouts, groups, color‑by.
- `PinboardTray`: manage boards; snapshot to report.

**Data Contracts** (GraphQL)

- `query Subgraph(caseId, centerIds, tRange, filters) -> { nodes{id,type,labels,confidence,policy}, edges{id,src,dst,type,weight,confidence,policy}, provenance{counts} }`
- `mutation RunPaths(caseId, from, to, constraints) -> { paths{edges[], cost, policyHits[]} }`

**States**

- Empty / Loading (skeleton + spinner in viewport) / Data / No‑results / Policy‑redacted / Error (with retry/id).

**Acceptance**

- P95 pan/zoom < 16ms/frame; initial render < 1.5s for up to 50k nodes (virtualized draw, LOD).
- Time brushing updates both map & graph within 200ms median.
- Every selection reveals provenance tooltip in < 150ms.

---

### 6.2 Timeline

**Purpose**: Time‑travel the case; show events, observations, and claim validity windows.

**Components**: `TimeBrush`, `Bands (Events/Claims/Changes)`, `GapHighlighter`, `ViewportMiniMap`.
**Interactions**: drag to window; alt‑drag = compare windows; click event → highlight in Graph/Map.
**Acceptance**: time‑travel snapshot is consistent with graph at `t` (bitemporal rules).

---

### 6.3 Map Board

**Purpose**: Geo analysis, colocation windows, convoy/rendezvous detection; geofences.

**Components**: Mapbox layer stack; `TrajectoryLayer`, `StayPointLayer`, `HeatLayer`, `GeofenceEditor`.
**Data**: geojson features with time windows and confidence; clustering at low zoom.
**Acceptance**: precise/recall ≥ target on labeled samples for rendezvous highlights (display fidelity only; model server‑side).

---

### 6.4 Entity Resolution (ER) UI

**Purpose**: Human‑in‑the‑loop adjudication; explainable merges; reversible operations.

**Components**: `CandidatePairsGrid`, `SimilarityBreakdown`, `MergePreview`, `ExplainPanel`, `OverrideLog`.
**Data**: `/er/candidates` (features, scores); `/er/explain` (feature importances, rationale).
**Acceptance**: merge shows why; merges are reversible; overrides require reason + approver where flagged.

---

### 6.5 Provenance & Claim Ledger

**Purpose**: Register evidence; visualize claim→support/contradict graphs; export disclosure bundles.

**Components**: `ClaimInspector`, `SourceTrail` (hashes, transforms), `ContradictionGraph`, `DisclosureBuilder`.
**Actions**: package for disclosure → manifest preview → sign & export (blocked when license/policy conflict).
**Acceptance**: every visible claim resolves to source(s); exports emit verifiable manifest; blocked exports show human‑readable reason and appeal path.

---

### 6.6 Ingest Wizard & Jobs

**Purpose**: Map schemas; classify PII; run DPIA; set redaction presets; stream into case.

**Flow**

1. **Select Connector** → 2) **Sample & Map** (AI suggestions + manual mapping) → 3) **PII/DPIA** → 4) **License/TOS** → 5) **Preview** → 6) **Run**.
   **Components**: `ConnectorCatalog`, `SchemaMapper`, `PIIClassifier`, `DPIAChecklist`, `LicenseGate`, `RunSummary`, `JobConsole`.
   **Acceptance**: CSV→canonical mapping < 10 min; redaction presets applied; lineage recorded; job console streams logs.

---

### 6.7 Analytics & Tradecraft Suite

**Purpose**: Link/path/community/centrality; pattern miner; anomalies & risk scoring with XAI.

**Modules**: `CommunityDetect`, `CentralityPanel`, `PatternMiner` (temporal motifs, co‑travel, structuring), `AnomalyTriage` (queues, detectors), `PathFinder` (K‑paths, constrained routes).
**Acceptance**: metrics reproducible on provided fixtures; explainers show why a node/edge scored.

---

### 6.8 Hypothesis Workbench

**Purpose**: Competing hypotheses, evidence weights, Bayes updates, missing‑evidence prompts; dissent capture.

**Components**: `ClaimsTable`, `HypothesesMatrix`, `EvidenceWeigher`, `ResidualUnknowns`, `DissentAnnex`.
**Acceptance**: publishing a brief **requires** citations; alt‑hypothesis recorded; residual unknowns listed.

---

### 6.9 COA Planner & What‑If Simulator

**Purpose**: Build COAs as DAGs; map dependencies/resources; simulate likelihood/impact; sensitivity sliders.

**Components**: `COAEditor (React Flow)`, `ResourceBoard`, `AssumptionsPanel`, `MonteCarloRunner`, `SensitivityControls`, `OutcomeBands`.
**Acceptance**: COA comparisons render impact bands; all assumptions logged and exportable.

---

### 6.10 AI Copilot (Auditable)

**Purpose**: NL interactions with graph & corpus; always preview queries; never execute blind.

**Panels**

- **Ask the Graph**: prompt → generated Cypher/SQL preview → cost/row estimate → sandbox run.
- **Evidence‑First RAG**: answers with inline snippet citations; redaction‑aware.
- **ETL Assistant**: mapping suggestions; dedupe candidates; validation rules.
- **Narrative Builder**: draft brief with timelines/maps; guarded language & confidence levels.
- **Guardrails Console**: policy reasoner messages, model cards, prompt privacy log.
  **Acceptance**: ≥95% syntactic validity for generated queries on test corpus; blocked actions show clear reasons.

---

### 6.11 Report Studio & Disclosure Packager

**Purpose**: Compose publishable briefs; 1‑click PDF/HTML; selective redaction; annex dissent.

**Components**: `FigurePicker (graph/map/timeline snapshots)`, `CaptionAssistant`, `RedactionTools`, `DisclosurePackager` (hash tree manifest).
**Acceptance**: exports include verifiable manifest; right‑to‑reply fields supported; style guardrails enforced.

---

### 6.12 Collaboration & Workflow

**Purpose**: Case tasks, roles, watchlists, SLA timers; comments with immutable audit and legal hold.

**Components**: `TaskBoard`, `RoleMatrix`, `Watchlists`, `SLAHeat`, `Comments` (@mentions, permalinks), `LegalHoldToggle`.
**Acceptance**: all edits & audits visible; 4‑eyes checks for risky steps; hashed cross‑tenant deconfliction where configured.

---

### 6.13 Admin Studio

**Purpose**: Operate the platform safely.

**Areas**

- **Policy Simulator** (OPA): dry‑run changes vs historical queries; diff results; impact report.
- **Schema Registry**: versioned ontology; safe migrations; unknown types render safely in UI.
- **Connectors Health**: status, rate limits, quotas, retries/backfills, feature flags.
- **Audit Explorer**: who/what/why/when; anomaly alerts; reason‑for‑access prompts review.
- **Warrants/Authorities**: bind queries to legal basis; show at point‑of‑use.
- **License/TOS Engine**: source terms; query‑time enforcement; export blockers with appeal path.

**Acceptance**: zero‑critical security findings before release; STRIDE mapping complete; quarterly red‑team items triaged.

---

## 7) Global Systems

### 7.1 Search

- **Global**: entity, case, document, claim ID; filters by type, time, policy.
- **Within‑workspace**: graph nodes/edges; hypotheses; tasks; runbooks.
- **Contract**: `query Search(scope, q, facets) -> {hits{type,id,snippet,provenance}}`.

### 7.2 Notifications

- Real‑time via websockets/subscriptions; inbox + toast; digest emails (server‑side).
- Types: job completed, approval requests, audit flags, risk threshold crossed, comments/@mentions.

### 7.3 Offline/Edge Mode

- Local cache (IndexedDB) of case subgraphs & docs (encrypted); CRDT merges on reconnect; conflict UI.
- Signed resync logs shown in `SyncPanel`; divergence report available in Report Studio.

### 7.4 Theming & A11y

- Tokens for color/spacing/typography; dark/light/high‑contrast; prefers‑reduced‑motion.
- WCAG 2.2 AAA where feasible; focus rings, roving tabindex, ARIA landmarks; navigate all core flows via keyboard.

### 7.5 Internationalization

- ICU messages; date/number/zone formatting; locale switch; RTL mirroring; content language tags per source.

### 7.6 Security & Privacy in the Front‑End

- Step‑up auth gates on sensitive actions; session lock; clipboard guards on redacted views; hide‑on‑blur for sensitive panes (opt‑in).
- CSP allowlist; no third‑party trackers; sanitization for any rich text; download watermarks; honeytoken banners where configured.

---

## 8) Performance Budgets & Quality Gates

- **TTI (case view)** ≤ 2.0s on reference dataset; **p95 graph query render** < 1.5s for 3‑hop/50k nodes.
- Graph viewport maintains ≥ 50 FPS at median; degrade to LOD shapes beyond threshold.
- Idle‑until‑urgent for heavy panels; web workers for layouts; prefetch saved views; memory cap checks.

**Quality Gates**

- Storybook accessibility check passes for all components; Playwright E2E for critical flows; screenshot diffs for Report Studio.

---

## 9) Data Contracts (Selected)

_(Representative GraphQL/REST shapes — align with gateway schema.)_

```graphql
# Entities
fragment EntityFields on Entity {
  id
  type
  labels
  policy {
    sensitivity
    purpose
    legalBasis
  }
  confidence
}

query Entity($id: ID!, $t: TimeRange) {
  entity(id: $id, t: $t) {
    ...EntityFields
    facets {
      ... on Person {
        names
        aliases
        selectors
      }
      ... on Org {
        names
        registration
        sanctions
      }
      ... on Event {
        window
        participants
        locations
      }
    }
    provenance {
      sources {
        id
        title
        license
        hash
      }
      transformChain {
        step
        tool
        params
        hash
      }
    }
  }
}

# Subgraph fetch
query Subgraph($case: ID!, $center: [ID!]!, $t: TimeRange, $filters: Filters) {
  subgraph(case: $case, centerIds: $center, t: $t, filters: $filters) {
    nodes {
      ...EntityFields
    }
    edges {
      id
      src
      dst
      type
      weight
      confidence
      policy
    }
    stats {
      counts {
        byType
      }
    }
  }
}

# Copilot preview
mutation GenerateCypher($prompt: String!, $scope: Scope!) {
  copilot {
    nlToCypher(prompt: $prompt, scope: $scope) {
      text
      estCost
      rows
      warnings
    }
  }
}

# Policy simulation
mutation SimulatePolicy($rule: String!, $sample: QuerySample!) {
  admin {
    simulatePolicy(rule: $rule, sample: $sample) {
      affectedUsers
      affectedQueries
      diffSummary
    }
  }
}
```

---

## 10) Telemetry & Instrumentation (Front‑End)

- OpenTelemetry auto‑instrumentation; `traceId`/`spanId` propagated to server.
- **Event Spec** (examples):
  - `graph.select` `{nodeId, edgeId, caseId, tRange}`
  - `timeline.brush` `{from,to,caseId}`
  - `copilot.preview` `{chars, estCost, accepted}`
  - `export.blocked` `{reasonCode, policyId}`
  - `policy.simulate.run` `{ruleId, diff}`
- Performance marks: `case.mount`, `graph.firstPaint`, `map.layerReady`, `report.export.start/finish`.

---

## 11) Error Handling & Empty States

- **Typed errors**: PolicyDenied, LicenseBlocked, RedactionRequired, NotAuthorized, NotFound, ServerBusy.
- **UX**: explain cause + next action, show policy/warrant/license link, provide appeal path where defined.
- **Empty**: “Connect a source”, “Brush a time window”, “No paths under current constraints”.

---

## 12) Testing Plan

- **Unit**: components, reducers, hooks; golden tests for GraphQL contracts via MSW.
- **E2E**: critical journeys — load case → brush time → run K‑paths → pin & export brief; ingest CSV → map schema → run job → see entities in case; generate Cypher → preview → sandbox execute.
- **Load/Perf**: k6 profile for websocket/subscription flows; CPU/memory watch under 50k nodes.
- **A11y**: axe ruleset; keyboard tab sweeps; screen‑reader narratives for tri‑pane & copilot.

**Acceptance Packs**

- Per module “Definition of Done” with fixtures: ER, Copilot, Pattern Miner, COA, Report Studio, Admin Simulator.

---

## 13) Security, Governance & Audit (UI Responsibilities)

- Reason‑for‑access prompts on sensitive views; banner shows current **legal authority** and **license class**.
- Warrant registry links; policy simulation before publishing changes; audit inspector surfaces who/what/why/when.
- Dual‑control flows: merges, hard deletes, disclosure exports.

---

## 14) Feature Flags & Rollout

- Flags: `copilot.enabled`, `graphxai.overlays`, `offline.kit`, `predictive.suite`, `federated.search`, `deception.lab` (defensive), `policy.simulator.v2`.
- Safe rollout: canary by tenant; log/metric SLIs; auto‑rollback hooks; migration guards.

---

## 15) Roadmap Extensions (UI‑Forward)

- **Graph‑XAI Overlays**: counterfactual sliders; saliency heat on subgraph; fairness/robustness panels.
- **Predictive Threat Suite**: timeline forecasting view; causal explorer; counterfactual simulator pane.
- **War‑Gamed Decision Dashboard**: narrative heatmaps; playbook runner; after‑action auto‑report.
- **Federated Multi‑Graph Search**: cross‑tenant hashed deconfliction UI with privacy rails.
- **Crisis Cell**: live SITREP board; COA comparison; diplomatic off‑ramps module.

---

## 16) Component Inventory (selected, with props)

- `GraphViewport({nodes,edges,layout,selection,onSelect,onContext,policy})`
- `TimeBrush({from,to,onChange,onCompare,gaps})`
- `MapViewport({features,layers,onSelect,onBrush,geoFences})`
- `EntityCard({entity,provenance,actions})`
- `ClaimInspector({claim,supports,contradicts,manifest})`
- `PatternMinerPanel({templates,params,onRun,results})`
- `AnomalyQueue({detectors,items,onAdjudicate})`
- `HypothesesMatrix({hypotheses,evidence,weights,onUpdate})`
- `COAEditor({dag,resources,assumptions,onSimulate})`
- `CopilotPanel({mode,prompt,onGenerate,onExecute,preview})`
- `DisclosureBuilder({bundle,licenses,onValidate,onExport})`
- `PolicySimulator({rule,sample,onRun,results})`
- `AuditTable({filters,events,onDrill})`

---

## 17) Visual/Interaction Guidelines

- **Layouts**: grid‑based, generous padding, rounded‑2xl, soft shadows; consistent spacing scale.
- **Motion**: Framer Motion for subtle transitions; respect reduced‑motion.
- **Color**: purpose‑bound (risk, confidence, selection); customizable palettes with accessible contrasts.
- **Docs in UI**: tooltips + “Why am I seeing this?” links for model outputs and policy blocks.

---

## 18) DevEx & Build

- CI: type‑check, lint, unit tests, Storybook build, bundle size budgets, Lighthouse.
- Artifacts: versioned via SemVer; build hash surfaced in footer; feature manifest JSON.
- Env config: `.well‑known/intelgraph.json` for endpoints/scopes/flags.

---

## 19) Appendix A — Gherkin Acceptance (samples)

```gherkin
Feature: Copilot NL→Cypher preview
  Scenario: Analyst previews and safely executes a generated query
    Given I am in a Case Space with Copilot enabled
    When I ask the graph "show paths from A to B excluding classified edges"
    Then I see a Cypher preview with cost and row estimates
    And the Execute button is disabled until I confirm the preview
    And if policy denies execution, I see a reason with an appeal path

Feature: License‑blocked export
  Scenario: Attempt to export evidence with restricted license
    Given my report includes a source licensed for non‑export
    When I click "Export Disclosure"
    Then the export is blocked
    And I see the license clause and owner
    And I can request an exception via dual‑control workflow

Feature: ER merge with explainability
  Scenario: Adjudicate a candidate pair
    Given I open a candidate pair with score > threshold
    Then I see feature‑level contributions and a rationale
    When I merge them
    Then the merge is recorded with my reason and is reversible
```

---

## 20) Appendix B — Example State Machines

- **Export**: `Idle → Validating → Blocked | Ready → Signing → Done | Error`
- **Copilot**: `Idle → Generating → Preview → (Blocked|Ready) → Executing → Done | Error`
- **Ingest Job**: `Draft → Running → (Needs‑Mapping|Needs‑Consent) → Completed | Failed`

---

## 21) Appendix C — Glossary (UI)

- **Claim**: a structured assertion with provenance and confidence.
- **Policy Label**: sensitivity/legal basis/purpose tags that control visibility and actions.
- **Disclosure Bundle**: export with manifest, hashes, and license terms.

---

### End of Spec
