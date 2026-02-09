# Detailed architectural diagram

## Runtime / platform architecture (C4-ish, Mermaid)

```mermaid
flowchart LR
  %% Users
  U[Analyst / Operator] -->|Browser| FE[Frontend UI
(client/)
React 18 + Vite + MUI]
  U -->|Browser| CU[Conductor UI
(conductor-ui/)
Ops/Admin UX]

  %% Edge/API
  FE -->|HTTPS| API[API Tier
(Node.js + Express + Apollo GraphQL)
GraphQL + REST]
  CU -->|HTTPS| API

  %% Core services
  API -->|AuthZ / Policy checks| POL[Policy & Guardrails
(Policy fetcher + enforcement points)
clients/cos-policy-fetcher/ + policy artifacts]
  API -->|Cache / rate limit / pubsub| REDIS[(Redis)]
  API -->|Relational + audit + vectors| PG[(PostgreSQL)]
  API -->|Graph relationships| NEO[(Neo4j)]
  API -->|Telemetry time-series| TS[(TimescaleDB)]

  %% Background orchestration
  API -->|enqueue jobs| MQ[BullMQ / Maestro
(.maestro/ + orchestration)
Queue + workers]
  MQ -->|uses| REDIS
  MQ -->|read/write| PG
  MQ -->|read/write| NEO
  MQ -->|pipelines| AIMS[AI/ML + Pipelines
(ai-ml-suite/ + domain modules)]

  %% Observability
  API -->|metrics/logs| OBS[Observability Stack
(Grafana + alerting)]
  MQ -->|metrics/logs| OBS
  TS -->|dashboards| OBS

  %% Ops / Runbooks / Governance
  OBS --> RUN[Runbooks & Operator Playbooks
(runbooks/)]
  API --> SEC[Security & Compliance
(SECURITY/ + compliance/ + audit/)]
  MQ --> SEC

  %% CI / gates
  DEV[Developer Workstation] -->|make bootstrap| BOOT[Bootstrap + Tooling
(make targets, pnpm, Docker)]
  DEV -->|make ga| GA[GA Gate
Lint + Verify + Tests + Smoke + Security]
  GA --> API
  GA --> MQ
  GA --> FE

  %% Notes
  classDef store fill:#f6f6f6,stroke:#999,stroke-width:1px;
  class PG,NEO,TS,REDIS store;
```

## Repository “codemap” architecture (what lives where)

This is the view that helps new contributors answer “where is the thing?” quickly, based on real top-level directories in the repo:

```mermaid
flowchart TB
  ROOT[Repo Root: summit] --> GOV[Governance & Ops]
  ROOT --> PLAT[Platform (Runtime)]
  ROOT --> AI[AI/ML + Domain Modules]
  ROOT --> AG[Agentic Development Tooling]

  GOV --> RUNBOOKS[runbooks/]
  GOV --> SECURITY[SECURITY/ + .security/]
  GOV --> COMPLIANCE[compliance/]
  GOV --> AUDIT[audit/]
  GOV --> CI[.ci/ + ci/ + .ga-check/ + .github/]
  GOV --> QA[__tests__/ + __mocks__/ + GOLDEN/ datasets + .evidence/]

  PLAT --> CLIENT[client/]
  PLAT --> CONDUCTOR[conductor-ui/]
  PLAT --> CLI[cli/]
  PLAT --> BACKEND[backend/]
  PLAT --> API[api/ + apis/ + api-schemas/]
  PLAT --> ORCH[.maestro/ + .orchestrator/]
  PLAT --> CFG[config/ + configs/ data-plane + compose/ + charts/]

  AG --> CLAUDE[.claude/]
  AG --> GEMINI[.gemini/]
  AG --> JULES[.jules/ + .Jules/]
  AG --> QWEN[.qwen/]
  AG --> PROMPTS[.agentic-prompts/ + .agent-guidance/]
  AG --> DEVCONTAINER[.devcontainer/]

  AI --> AIML[ai-ml-suite/]
  AI --> COG[cognitive-* modules]
  AI --> AM[active-measures-module/]
  AI --> OTHER[additional vertical modules (numerous)]
```
