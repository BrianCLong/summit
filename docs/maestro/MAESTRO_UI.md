Maestro UI — World‑Class Control Plane (Overview)

Separation: Maestro builds IntelGraph; Maestro ≠ IntelGraph. This UI is a standalone control plane for orchestration, governance, observability, CI/CD, tickets, and evidence.

Information Architecture

```mermaid
flowchart LR
  subgraph UX[Maestro UI]
    NAV[Global Nav / Command Palette]
    HUB[Home / Control Hub]
    RUNS[Runs & Pipelines]
    AUTON[Autonomy & Guardrails]
    RECIPES[Recipe Library]
    OBS[Observability & SLOs]
    COST[FinOps / Cost Guard]
    CI[CI/CD & Environments]
    TICKETS[Tickets / Issues / Projects]
    ADMIN[Admin Studio]
  end

  UX -->|uses| API[GraphQL/REST Gateway]
  API --> ORCH[Orchestrator/Agent Runtime]
  API --> POL[Policy/OPA Engine]
  API --> PROV[Provenance & Claim Ledger]
  API --> TELE[Telemetry: OTEL/Prom/Logs]
  API --> GIT[GitHub: Issues/Projects/Actions]
  API --> CICD[CI/CD: Actions/Jenkins/Argo]
  API --> SECRETS[Key/Secrets Mgmt]

  classDef s fill:#eef,stroke:#88a
  class UX s
```

Autonomy Model (L0–L5)

Controls: risk budget sliders, blast radius caps, windows, ceilings, approvals, canary ratio, rollback thresholds, with an Explain panel for rationale.

Core Screens (Wireframe Summaries)

- Home/Hub: Autonomy dial, risk budget, freeze, canary, rollback, quick actions, live cards.
- Runs & Pipelines: Filters + DAG view + side panel for Params/Logs/Metrics/Artifacts/Evidence/Policies.
- Autonomy & Guardrails: Level controls, ordered policies, simulation preview.
- Recipes: Filters + grid, right panel for schema/param form/preflight/versioning.
- Observability: Dashboards/Traces/Logs/Alerts/SLOs/Incidents.
- CI/CD: Environments, pipeline graph, controls, GitHub runs.
- Tickets: Table/Board/Roadmap; detail links to runs/PRs.
- Admin: Registry, connectors, flags, access, audit, jobs.

UML / Mermaid Diagrams

Use‑Case (Actors & Goals)

```mermaid
flowchart TB
  classDef actor fill:#fff,stroke:#333,stroke-dasharray: 3 3
  User[Operator]
  Analyst[Analyst]
  SRE[SRE]
  Omb[Ombudsman]
  Admin[Admin]

  subgraph System[Maestro UI]
    UC1(Configure Autonomy Levels)
    UC2(Run Pipelines / Runbooks)
    UC3(Observe Telemetry & SLOs)
    UC4(Manage Tickets/Projects)
    UC5(Deploy via CI/CD)
    UC6(Apply/Author Recipes)
    UC7(Policy Explain / Approvals)
    UC8(Show Your Work / Evidence)
    UC9(Cost Guard & Budgets)
    UC10(Administer Platform)
  end

  User --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9
  Analyst --- UC2 & UC3 & UC6 & UC8
  SRE --- UC3 & UC5 & UC7 & UC9
  Omb --- UC7 & UC8 & UC4
  Admin --- UC10 & UC1
```

Component Diagram (Logical)

```mermaid
flowchart LR
  UI[Maestro Web UI (React/TS)] --> GQL[API Gateway (GraphQL/REST)]
  GQL --> ORCH[Agent Runtime / Orchestrator]
  GQL --> POL[Policy Engine (OPA/ABAC)]
  GQL --> PROV[Provenance & Evidence Ledger]
  GQL --> OBSV[Observability Stack (OTEL/Prom/Logs)]
  GQL --> GH[GitHub Adapter (Issues/Projects/Actions)]
  GQL --> CICD[CI/CD Adapter (Actions/Jenkins/Argo)]
  GQL --> SECR[Secrets/Key Mgmt]
  GQL --> STORE[Recipe/Config Store]
  ORCH --> RUNT[Run Logs & Artifacts]
  OBSV --> SLO[SLO Engine/Budgets]
```

Sequence — Live Tweak & Safe Apply

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Maestro UI
  participant POL as Policy Engine
  participant ORC as Orchestrator
  participant OBS as Observability

  U->>UI: Adjust autonomy → L3 (preview)
  UI->>POL: Evaluate change
  POL-->>UI: Allow with gates (dual‑approval)
  UI->>U: Show pre‑flight + approvals
  U->>UI: Request run with canary 10%
  UI->>ORC: Start canary
  ORC-->>OBS: Emit signals
  OBS-->>UI: Live SLO/burn
  alt Breach
    UI->>ORC: Auto‑rollback
  else Healthy
    UI->>ORC: Promote 100%
  end
```

State — Run Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> PreFlight
  PreFlight --> Rejected
  PreFlight --> Canary
  Canary --> Rollback : SLO breach
  Canary --> Promote : Healthy
  Promote --> Running
  Running --> Succeeded
  Running --> Failed
  Rollback --> Failed
  Failed --> [*]
  Succeeded --> [*]
```

Getting Started (Dev)

- Build/serve the existing conductor-ui frontend as-is.
- Open with `?ui=maestro` or path `/maestro` to load Maestro UI without affecting existing UI.
- The current data uses mock hooks in `conductor-ui/frontend/src/maestro/api.ts` and can be switched to live APIs.

Runtime Configuration

Inject endpoints at runtime (no rebuild) via a window global in `index.html` or a small script:

```html
<script>
  window.__MAESTRO_CFG__ = {
    gatewayBase: 'http://localhost:4000/api/maestro/v1',
    grafanaBase: 'http://localhost:3000',
    grafanaDashboards: {
      slo: 'maestro-slo',
      overview: 'maestro-overview',
      cost: 'maestro-cost',
    },
    authToken: '<optional bearer>',
  };
  // Navigate to /maestro
</script>
```

Frontend reads config from `conductor-ui/frontend/src/maestro/config.ts` and automatically enables:

- GET /runs, GET /runs/:id, GET /runs/:id/graph
- Logs SSE: GET /runs/:id/logs?stream=true
- PATCH /autonomy (preview + gates)
- GET/PUT /budgets
- POST /tickets
- POST /policies/explain
- Grafana deep links for SLO/overview/cost dashboards

Notes

- This UI is additive. No existing files or IntelGraph product UIs are overwritten.
- Meets separation requirement and aligns with GA P0 scaffolding: navigation, core screens, autonomy controls, and evidence-first surfaces.
