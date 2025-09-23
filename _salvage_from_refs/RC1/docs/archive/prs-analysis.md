# IntelGraph PR Analysis - 74 Open PRs

## Current Count: 67 PRs (not 74)

## Categorization by Subsystem:

### A: Infra/Tooling (5 PRs)
- **377**: `chore: fix eslint setup` 
- **369**: `feat: add metrics endpoint and dev bootstrap`
- **384**: `feat: initialize telemetry service and enhance dashboard responsiveness`
- **379**: `test: add persisted query enforcement test and load workflow`
- **375**: `Feature/analytics pipeline`

### B: Backend Core/GraphQL (8 PRs)
- **526**: `feat: enforce tenant-aware graph resolvers`
- **493**: `feat: harden GraphQL performance`
- **465**: `refactor(graphql): modularize schema with federation`
- **464**: `refactor(graphql): modularize schema with federation` [DUPLICATE]
- **376**: `feat(graph): tenant-scoped caching and LOD`
- **447**: `feat(graph): implement GDS-based node clustering`
- **432**: `feat: add real-time entity locking`
- **297**: `feat(security): enforce tenant scoping across API/DB/cache` [DRAFT]

### C: AI/ML Pipeline (11 PRs)
- **538**: `feat: enhance graph services and sentiment volatility chart`
- **506**: `feat: add micro alpha detector pipeline`
- **478**: `feat(ml): optimize GNN inference with quantization and streaming`
- **436**: `feat(ml): add model registry and retry queue`
- **463**: `feat: add transformer link suggestions`
- **482**: `feat: add hybrid entity resolution pipeline`
- **497**: `feat(er): canonical_id, merges/splits + audit log`
- **388**: `feat: integrate real ai extraction pipelines`
- **489**: `feat: integrate forecast alerts with auto-retraining`
- **490**: `feat: adaptive summary feedback with export options`
- **474**: `feat: log llm usage for analytics` [DUPLICATE with 472]

### D: Security/Auth/RBAC (7 PRs)
- **499**: `feat(ops): per-tenant LLM budgets + retrieval-only degrade`
- **481**: `feat: add tamper-evident audit trail`
- **471**: `feat: add request sanitization middleware`
- **449**: `feat: enforce tag-based access control`
- **391**: `feat: add FastAPI auth with RBAC skeleton`
- **386**: `feat: tenant-aware auth and microexpression analysis docs`
- **297**: `feat(security): enforce tenant scoping across API/DB/cache` [DRAFT]

### E: Data/Analytics (9 PRs)
- **492**: `feat: harden universal ingest with dlq`
- **392**: `feat: add workspace and audit logging`
- **403**: `feat: add entity change history`
- **402**: `feat: add graph snapshot diffing`
- **374**: `feat: add Celery scheduled analytics with alerts`
- **409**: `feat: enrich entities with third-party threat intel`
- **404**: `feat: add threat feed ingestion pipelines`
- **366**: `feat: enable telemetry and metrics automation`
- **361**: `feat(server): add status endpoint for service info`

### F: Frontend/UI (8 PRs)
- **508**: `feat: add dark mode and accessibility toggles`
- **378**: `feat(client): add AI insights panel with community overlays`
- **429**: `feat: add analyst dashboard mvp`
- **424**: `feat(ui): add analyst workbench with drag and AI assist`
- **423**: `feat: add advanced graph search`
- **405**: `feat: add real-time analyst dashboard and alert triage`
- **373**: `feat: add data fusion panel and reports dashboard`
- **367**: `fix: trim debug console logs from client bootstrap`

### G: Collaboration/Real-time (5 PRs)
- **491**: `feat: add collaborative editing enhancements`
- **408**: `feat: add collaborative workspace service`
- **387**: `feat: expand insight panel controls and load testing`
- **450**: `feat: add entity image upload`
- **439**: `feat: notify anomalies in real time` [DUPLICATE with 438]

### H: Specialized Intelligence (14 PRs)
- **507**: `feat: add tactical wargaming simulation engine`
- **485**: `feat: add neural influence map dashboard`
- **484**: `feat: automate roadmap updates`
- **480**: `feat: add disinformation detection module`
- **477**: `feat: expand threat simulations with live feeds`
- **475**: `docs: add narrative generation system design`
- **473**: `feat: add browser extension for psyops monitoring`
- **470**: `feat: adapt explanations by authority`
- **469**: `feat: add ideological alignment screening`
- **468**: `feat: add cognitive twin service`
- **467**: `feat: add real-time behavioral dna inference`
- **466**: `docs: add cognitive terrain evaluation framework`
- **428**: `feat: add threat analytics engine`
- **398**: `feat: add analyst assistant chat endpoint`

### I: Documentation/Architecture (4 PRs)
- **483**: `docs: add PsyOps risk assessment matrix`
- **476**: `refactor: add modular agent SDK`
- **390**: `docs: expand roadmap with streaming and search`
- **360**: `docs: mark next sprints as completed`

### J: Bug Fixes/Maintenance (2 PRs)
- **389**: `fix: harden startup guardrails`
- **472**: `feat: log llm usage for analytics` [DUPLICATE]

## Duplicates to Close:
- PR 464 (duplicate of 465) - GraphQL federation
- PR 474 (duplicate of 472) - LLM usage logging  
- PR 439 (duplicate of 438) - anomaly alerts

## Risk Assessment:
- **High Risk**: Multi-tenant security changes (297, 526, 376)
- **Medium Risk**: GraphQL federation refactor (465), AI/ML pipeline changes
- **Low Risk**: Documentation, UI improvements, tooling fixes