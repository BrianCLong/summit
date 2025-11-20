# Summit Codebase Orchestration Inventory

## Executive Summary

The Summit codebase contains a sophisticated, multi-layered orchestration ecosystem with:
- **307 maestro-related code files** across packages, services, and UI
- **122 orchestration-specific code files**
- **3 distinct Airflow DAG implementations**
- **Multiple orchestration frameworks**: Maestro (primary), Conductor, Airflow, Chronos Aeternum
- **Comprehensive runbooks**: 47+ operational procedure files
- **Distributed across 50+ directories** with specialized patterns

---

## 1. AIRFLOW/DAGS

### Status: **EXISTS** ✓ (2 locations)

#### Directory Structure
```
/home/user/summit/airflow/dags/
/home/user/summit/pipelines/airflow/dags/
/home/user/summit/server/data-pipelines/airflow/dags/
```

### Key Files & Purposes

#### `/home/user/summit/airflow/dags/coord_batch.py`
- **Type**: Batch coordination DAG
- **Owner**: intelgraph
- **Schedule**: Daily at 02:00 UTC (0 2 * * *)
- **Retry Policy**: 1 retry, 5-minute delay
- **Tasks**: 16 sequential tasks
- **Key Operations**:
  - Multi-source data ingestion (Twitter, YouTube, Reddit, Telegram, TikTok, RSS)
  - Similarity graph generation
  - Community detection (Louvain algorithm)
  - Anomaly detection (follower CUSUM, persona drift)
  - Campaign metrics computation
  - Coordination scoring
  - Intelligence case triggering

#### `/home/user/summit/pipelines/airflow/dags/search_offline.py`
- **Type**: Index rebuild and promotion DAG
- **Schedule**: Daily at 02:00 UTC
- **Tasks**: 2-stage pipeline
  1. `build`: Index construction (idempotent S3 staging)
  2. `promote`: Atomic manifest swap
- **Resilience**: 3 retries, 10-minute intervals, 2-hour SLA
- **SLA Handling**: Custom callback for missed SLAs

#### `/home/user/summit/server/data-pipelines/airflow/dags/ingest_csv.py`
- **Type**: CSV data ingestion DAG
- **Integration**: Streaming and batch paths

### Technologies/Frameworks
- **Framework**: Apache Airflow 2.x
- **Operators**: PythonOperator primarily
- **Executor**: Likely distributed (production K8s)
- **Connectors**: Internal job modules for specialized tasks

### Patterns Observed
- **Linear task dependencies**: Sequential execution via `>>` operator
- **Retry strategies**: Fixed exponential backoff
- **Idempotency**: S3 staging for atomic promotion
- **SLA enforcement**: Time-bounded execution with callbacks

### Ownership & Metadata
- **Owner**: intelgraph
- **Retry Delay**: 5-10 minutes configurable
- **Catchup**: Disabled (no historical backfill)
- **Task Distribution**: Graph analytics, similarity, anomaly detection

---

## 2. .ORCHESTRATOR (Custom Orchestrator Framework)

### Status: **EXISTS** ✓

### Directory Structure
```
/home/user/summit/.orchestrator/
├── state.json                        # Orchestration state snapshot
└── patches/10151/                    # 38 patch files for orchestration changes
```

### Purpose & Pattern
- **Type**: Git-based patch orchestrator for phase/sprint management
- **Use Case**: Manage large-scale code changes, compliance updates, phase transitions
- **Architecture**: Pull Request (PR) orchestration via Git patches

### Key Files
- **38 patch files** managing phase transitions (Phase 3 → Phase 4)
- **Topics addressed**:
  - Phase 3 completion & certification
  - Cognitive Decision Support System implementation
  - RBAC/ABAC authentication phases
  - SOAR v1.x integration
  - Policy Intelligence v1 implementation
  - Asset Inventory v1.2 reconciliation

### State Management
- **state.json**: Tracks orchestration state, patch application order, phase status
- **Version Control**: All patches tracked in .git, enabling reproducibility

### Patterns Observed
- **Semantic versioning**: Patches numbered sequentially (0001-0038)
- **Atomic changes**: Each patch represents a coherent feature/fix
- **Rollback capability**: Git history enables time-travel debugging
- **Documentation**: Comprehensive patch messages

---

## 3. .MAESTRO (Maestro Orchestrator Configuration)

### Status: **EXISTS** ✓

### Directory Structure
```
/home/user/summit/.maestro/
├── changespec.schema.yml             # Change specification schema
├── xrepo.yaml                        # Multi-repo configuration
├── freeze_windows.json               # Release freeze calendar
├── pipeline.yaml                     # CI/CD pipeline definition
├── plan-20250915-rc1.yaml           # Release planning
├── ci_budget.json                    # Cost budget for CI runs
├── marketplace/                      # Marketplace templates
├── changes/                          # 20+ change bundles
├── scripts/                          # Utility scripts
├── tests/                            # Test suites
└── rules.json                        # Validation rules
```

### Key Files & Purposes

#### `pipeline.yaml` - Main CI/CD Pipeline
```yaml
version: 1
pipeline:
  name: intelgraph-main
  environment: development
  budgets: { hard_cap_usd: 25.00 }
  steps:
    - id: setup-toolchains
      run: just setup && pnpm -v && python -V
    - id: build-all
      run: just build-all
    - id: sbom-and-scan
      run: just sbom && just trivy
    - id: slo-burn-check
      when: event == "push" || event == "pull_request"
    - id: migration-gate
      when: files_changed("migrations/**")
    - id: canary-deploy
      when: branch == "main" || tag != ""
    - id: canary-analyze
      when: step_succeeded("canary-deploy")
    - id: promote-or-rollback
      when: step_succeeded("canary-analyze")
```

**Key Capabilities**:
- Budget tracking ($25 USD hard cap)
- Progressive deployment (canary → analyze → promote)
- Conditional steps (file-change-aware, branch-aware)
- Gating on SLO burn rates

#### Change Management Files (20+ bundles)
- `20250915-prov-ledger-beta.yaml` - Provenance ledger feature
- `20250915-ops-sre.yaml` - SRE operational improvements
- `20251117-phase3-sprint3-community.yaml` - Community phase
- `20250915-runtime-unify.yaml` - Runtime consolidation
- `20250915-connector-pack-v1.yaml` - Connector framework

### Technologies/Frameworks
- **Language**: YAML-based DSL
- **Build System**: Just commands, pnpm workspaces
- **Analysis**: Trivy (vulnerability scanning), SBOM generation
- **Deployment**: Progressive canary with analysis gates

### Patterns Observed
- **Event-driven**: push, pull_request, schedule, manual triggers
- **Policy as code**: Conditional step execution
- **Cost governance**: Hard budget caps with step-level tracking
- **Observability**: SLO burn checks, canary analysis
- **Idempotency**: Gated promotion prevents regressions

### Ownership & Metadata
- **Teams**: Multiple: architecture, security, SRE
- **Cadence**: Weekly sprints, monthly phases
- **Governance**: OPA-integrated policy checks

---

## 4. DATA-PIPELINES

### Status: **EXISTS** ✓

### Directory Structure
```
/home/user/summit/data-pipelines/
├── cisa-kev/                         # CISA Known Exploited Vulnerabilities ingestion
│   ├── ingest-cisa-kev.py
│   └── README.md
├── universal-ingest/                 # Multi-format ingestion (CSV/JSON/XML)
│   ├── ingest.py
│   ├── assets_csv.py
│   └── README.md
└── monitoring/                       # SLO/SLI monitoring
    ├── sli_slo.py
    ├── dashboards/
    ├── alertmanager/
    └── README.md

/home/user/summit/server/data-pipelines/  # Production pipelines
├── streaming/
│   ├── reliable_consumer.py
│   ├── backpressure.py
│   └── dlq.py
├── transformations/
│   ├── entity_mapper.py
│   └── __init__.py
├── deduplication/
│   ├── idempotent_loader.py
│   └── minhash_dedup.py
├── governance/
│   ├── lineage.py
│   ├── privacy.py
│   ├── contracts.py
│   └── __init__.py
├── performance/
│   ├── pipeline_optimizer.py
│   ├── caching.py
│   ├── cost_controls.py
│   ├── parquet_storage.py
│   └── analytics.py
├── optimization/
│   ├── pipeline_optimizer.py
│   ├── streaming.py
│   ├── batching.py
│   ├── resilience.py
│   ├── monitoring.py
│   └── PATTERNS.md
├── connectors/
│   ├── kafka_consumer.py
│   ├── csv_loader.py
│   ├── api_client.py
│   └── base.py
├── monitoring/
│   └── sli_slo.py
└── airflow/
    └── dags/
        └── ingest_csv.py
```

### Key Files & Purposes

#### Data Ingestion Pipelines
1. **CISA KEV Ingest** (`cisa-kev/ingest-cisa-kev.py`)
   - Fetches CISA Known Exploited Vulnerabilities catalog
   - Emits graph-compatible JSON for Neo4j
   - Deterministic `ingest_id` for idempotent reruns
   - Includes source metadata for traceability

2. **Universal Ingestion** (`universal-ingest/ingest.py`)
   - **Supported formats**: CSV, JSON, XML, plain text, GeoJSON
   - **Entity resolution**: Fuzzy matching + NLP-driven alias linking
   - **Neo4j integration**: Official Python driver with MERGE semantics
   - **DLQ handling**: Dead-letter queue for failed records
   - **Features**:
     ```bash
     python ingest.py OSINT sample.csv sample.json \
       --neo4j-uri bolt://localhost:7687 \
       --neo4j-user neo4j --neo4j-password password
     ```
   - **Replay support**: Replay failed records with rate limiting

3. **Asset CSV Connector** (`universal-ingest/assets_csv.py`)
   - Converts asset inventory CSV → graph-ready JSON
   - Required columns: asset_id, hostname, ip_address, cpe

#### Streaming & Real-time Processing
- **reliable_consumer.py**: Kafka consumer with exactly-once semantics
- **backpressure.py**: Rate limiting and flow control
- **dlq.py**: Dead-letter queue management

#### Data Quality & Governance
- **entity_mapper.py**: Entity normalization and linking
- **minhash_dedup.py**: MinHash-based deduplication
- **idempotent_loader.py**: Idempotent Neo4j loading
- **lineage.py**: Data lineage tracking & OpenLineage integration
- **privacy.py**: PII/privacy controls, GDPR compliance
- **contracts.py**: Schema validation, contract enforcement

#### Performance Optimization
- **pipeline_optimizer.py**: Cost-aware batch sizing, query optimization
- **caching.py**: Multi-tier caching (Redis, local)
- **parquet_storage.py**: Columnar storage for analytics
- **cost_controls.py**: Cost-per-record monitoring
- **Patterns**: Streaming, batching, resilience strategies documented in PATTERNS.md

#### Monitoring & Observability
- **sli_slo.py**: SLI/SLO definitions and tracking
- **dashboards/slo_overview.json**: Grafana dashboard
- **alertmanager/rules.yaml**: Alert rules

### Technologies/Frameworks
- **Language**: Python 3.13+
- **Streaming**: Kafka consumer
- **Graph Database**: Neo4j with Python driver
- **Deduplication**: MinHash, fuzzy matching
- **Scheduling**: Airflow
- **Monitoring**: Prometheus, Grafana

### Patterns Observed
- **Idempotency**: Deterministic ingest_id, MERGE semantics
- **Retry strategies**: Exponential backoff, DLQ capture
- **Rate limiting**: Backpressure controls, configurable delays
- **Cost governance**: Cost-per-record tracking
- **Observability**: SLI/SLO monitoring, lineage tracking

### Workflow Count
- **2 example workflows** (CISA KEV, Universal Ingest)
- **1 Airflow DAG** (CSV ingest)
- **1 streaming pipeline**

---

## 5. ETL/OPENLINEAGE

### Status: **EXISTS** ✓ (Minimal)

### Directory Structure
```
/home/user/summit/etl/
└── openlineage/
    └── client.ts
```

### File Purpose

#### `client.ts` - OpenLineage Integration
```typescript
import { OpenLineageClient } from 'openlineage-client';

export const ol = new OpenLineageClient({
  url: process.env.OL_URL!,
  apiKey: process.env.OL_TOKEN!,
});

export function emitRun(job: string, inputs: string[], outputs: string[]) {
  /* emit start/complete with datasets */
}
```

**Capabilities**:
- RESTful OpenLineage server integration
- Job start/complete event emission
- Dataset input/output tracking
- Environment-based configuration

### Technologies/Frameworks
- **Framework**: OpenLineage TypeScript client
- **Protocol**: HTTP/REST to OpenLineage backend
- **Integration Points**:
  - Airflow DAGs (via Airflow OpenLineage plugin)
  - Data pipeline executors
  - Custom workflow engines

### Current Status
- **Maturity**: Early integration (stub implementation)
- **Coverage**: Used by data pipelines for lineage emission
- **Limitations**: Basic implementation, no filtering/aggregation

### Integration Opportunities
- Conductor workflow lineage
- Maestro execution tracking
- Cross-system data flow visualization

---

## 6. RUNBOOKS

### Status: **EXISTS** ✓

### Directory Structure
```
/home/user/summit/RUNBOOKS/
├── INDEX.md                          # Central index (47 runbooks)
├── actions/                          # GitHub Actions procedures
│   └── flip_index.yml
├── canary/                           # Deployment canary procedures
│   └── raise_conductor_canary.md
├── compliance/                       # Compliance & privacy procedures
│   ├── rtbf_two_phase_confirm.md
│   └── dsar_export_validation.md
├── search/                           # Search service operations
│   └── latency-spike.md
├── stage/                            # Staging environment procedures
│   └── dual_flip.md
├── [47 YAML/Markdown runbook files]
```

### Runbook Categories & Count

#### Core Platform Operations (6)
1. `release-captain-quick-reference.md` - Release coordination
2. `release-captain-verification.md` - Post-release validation
3. `schema-migration-playbook.md` - Database migrations
4. `disaster-recovery-procedures.yaml` - DR playbooks
5. `disaster-recovery.json` - DR configuration
6. `postmortem_template.md` - Incident documentation

#### Deployment & Configuration (5)
1. `deploy-promote.yaml` - Canary → production promotion
2. `dev-bootstrap.yaml` - Development environment setup
3. `rollback.yaml` - Rollback procedures
4. `docling-deploy.md` - Docling-specific deployment
5. `mvp3_go_live.md` - MVP3 launch checklist

#### Intelligence Operations (9)
1. `cti-rapid-attribution.yaml` - Cyber threat attribution
2. `fraud-ring-detection.yaml` - Financial fraud detection
3. `insider-risk-assessment.yaml` - Insider threat assessment
4. `supply-chain-exposure.yaml` - Supply chain risk analysis
5. `aml-suspicious-activity.yaml` - Anti-money laundering triage
6. `ransomware-triage.yaml` - Ransomware incident response
7. `phishing-cluster.yaml` - Phishing cluster analysis
8. `disinfo-campaign.yaml` - Disinformation campaign tracking
9. `actor-pivoting.yaml` - Threat actor pivot analysis

#### Investigation & Analysis (3)
1. `ip-theft-investigation.yaml` - IP theft investigation
2. `link-analysis-demo.yaml` - Link analysis demonstration
3. `human-rights-vetting.yaml` - Human rights due diligence

#### Service-Specific Operations (12)
1. `incident-auto-reweighter.md` - MC Platform v0.4.5 QAM service
2. `docling-oncall.md` - Docling on-call procedures
3. `docling-rollback.md` - Docling rollback procedures
4. `chaos-drill.yaml` - Chaos engineering drills
5. `etl-assistant-demo.yaml` - ETL assistant demonstration
6. `backfill-entity-resolver.yaml` - Entity resolver backfill
7. `v24-coherence.md` - V24 coherence validation
8. `demo-seed.yaml` - Demo data seeding
9. `disclosure-packager.yaml` - Disclosure package generation
10. `ingest-enrich-handoff.yaml` - ETL handoff procedures
11. `aml-structuring.yaml` - AML structuring detection
12. `rapid-attribution.yaml` - Attribution automation

### Key Characteristics
- **Format**: YAML workflows + Markdown procedures
- **Scope**: Operational (not development)
- **Triggers**: Manual + scheduled
- **Audience**: On-call engineers, SREs, ops teams

### Ownership & Governance
- **Maintained by**: DevOps, SRE, IntelGraph Platform teams
- **Review cadence**: Quarterly updates
- **Change control**: Git-based via pull requests

---

## ADDITIONAL ORCHESTRATION SYSTEMS

### 7. ORCHESTRATION FRAMEWORK (Chronos Aeternum)

#### Location
```
/home/user/summit/orchestration/
├── runtime/                          # Go-based execution engine
├── packages/intent-engine/           # TypeScript workflow compiler
├── examples/                         # Example workflows
├── deploy/                           # Container definitions
└── docs/PHASES.md                    # Roadmap documentation
```

#### Architecture Overview
- **Intent Engine**: Compiles YAML → IR DAGs (TypeScript)
- **Deterministic Runtime**: Go-based executor with policy stubs
- **Compliance**: OPA policies, OpenTelemetry, provenance hashing
- **CI Automation**: GitHub Actions for verification

#### Key Technologies
- **Languages**: Go (runtime), TypeScript (compiler)
- **Execution**: Deterministic with retries, telemetry
- **State**: PostgreSQL persistence
- **Observability**: OpenTelemetry integration

---

### 8. MAESTRO PACKAGES & SERVICES

#### Location
```
/home/user/summit/packages/
├── maestro-core/                     # Core orchestration engine
├── maestro-cli/                      # Command-line interface
└── maestroflow/                      # Workflow DSL

/home/user/summit/ga-graphai/packages/
├── maestro-conductor/                # Advanced conductor service
├── meta-orchestrator/                # Multi-agent orchestrator
├── workflow-diff-engine/             # Workflow change tracking
└── cost-guard/                       # Cost optimization
```

#### maestro-core Package (`@maestro/core`)
- **Version**: 1.0.0
- **Key exports**:
  - `engine.ts` - Main orchestration engine
  - `observability/tracer.ts` - OpenTelemetry integration
  - `policy/opa-policy-engine.ts` - OPA policy enforcement
  - `budget/budget-manager.ts` - Cost governance
  - `stores/postgres-state-store.ts` - State persistence
  - `stores/s3-artifact-store.ts` - Artifact management
  - `plugins/` - 6 plugin types (cosign, web-scraper, SBOM, Ollama, OpenAPI, LiteLLM)

#### maestro-cli Package
- **Commands**: run, deploy, plan, status, logs, init, config, template, dsar
- **Features**: YAML validation, dry-run, debugging

#### maestroflow Package
- **Schema-based**: JSON schema for workflow definitions
- **DSL**: Supports build, test, lint, deploy, approve, notify, custom tasks
- **Transpilers**: Generate Tekton, GitHub Actions configs
- **Natural language**: NL→Flow translation (nl2flow.ts)

#### maestro-conductor (ga-graphai)
- **Anomaly detection**: Unsupervised learning from execution metrics
- **Discovery**: Auto-discovery of workflow patterns
- **Self-healing**: Automatic remediation
- **Job routing**: Intelligent task distribution
- **Monitoring**: Real-time pipeline health
- **Optimization**: Cost and latency optimization
- **Predictive insights**: Forecasting for capacity planning

#### meta-orchestrator (ga-graphai)
- **Multi-agent**: Collaborative planning and execution
- **Prompt engineering**: Template-based action generation
- **Intent translation**: Natural language → executable plans
- **Consensus building**: Agreement protocol for distributed decisions
- **RSIP**: Reinforcement learning for plan optimization

#### workflow-diff-engine (ga-graphai)
- **Change tracking**: Detect workflow modifications
- **Compatibility analysis**: Breaking change detection
- **Version compatibility**: Cross-version migration support

---

### 9. CONDUCTOR UI

#### Location
```
/home/user/summit/conductor-ui/frontend/src/maestro/
├── components/                       # 40+ UI components
├── pages/                            # Page layouts
├── services/                         # Service integrations
├── api/                              # GraphQL/REST clients
└── auth/                             # Authentication context
```

#### Key Components (UI Layer)
- **DAG.tsx** - Workflow DAG visualization
- **RunsList.tsx** - Execution run management
- **TraceVisualization.tsx** - Distributed trace rendering
- **SLODashboard.tsx** - SLO/SLI monitoring
- **TenantCost.tsx** - Cost tracking per tenant
- **ControlHub.tsx** - Central control plane
- **PlaybookDialog.tsx** - Playbook execution
- **CommandPalette.tsx** - Global command interface

#### Authentication Integration
- Multi-provider OIDC (Auth0, Azure, Google)
- PKCE flow implementation
- Keycloak integration
- Session management

#### Observability Features
- Grafana dashboard embedding
- Real-time trace correlation
- Cost anomaly detection
- SLO burn rate tracking

---

### 10. WORKFLOW DEFINITIONS & SCHEMAS

#### Location
```
/home/user/summit/
├── workflows/                        # Workflow definitions
│   ├── hello-world.yaml              # Reference workflow
│   ├── hello-case.yaml               # Case workflow
│   ├── templates/                    # Workflow templates
│   └── reference/
├── contracts/
│   └── workflow.schema.json           # JSON schema for workflows
├── schemas/
│   ├── workflow.maestro.yaml
│   └── dag-node.schema.yaml
```

#### Workflow Schema (`contracts/workflow.schema.json`)
- **Version**: maestro/v1
- **Core fields**:
  - `apiVersion`, `kind`, `metadata`, `attestations`, `spec`
  - Tasks with retry/timeout policies
  - Artifact management
  - Observability correlation
  - Policy enforcement (purpose, authority, license)

#### Example Workflow (hello-world.yaml)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hello-world-workflow
spec:
  tasks:
    - name: health_check_task
      type: SIMPLE
      retryCount: 3
      timeoutSeconds: 30
    - name: system_info_task
      type: SIMPLE
      inputParameters:
        check_components: [postgres, redis, workers]
```

---

## SUMMARY TABLE

| Area | Status | Key Technologies | Workflows/DAGs | Files | Maturity |
|------|--------|------------------|-----------------|-------|----------|
| **Airflow/DAGs** | ✓ | Apache Airflow 2.x | 3 DAGs | 3 | Production |
| **.Orchestrator** | ✓ | Git patches | N/A | 38 | Production |
| **.Maestro** | ✓ | YAML DSL, Just | 20+ bundles | 15 | Production |
| **Data-Pipelines** | ✓ | Python, Kafka, Neo4j | 4 pipelines | 50+ | Production |
| **ETL/OpenLineage** | ✓ | OpenLineage, TypeScript | N/A | 1 | Early |
| **RUNBOOKS** | ✓ | YAML/Markdown | 47 procedures | 47 | Production |
| **Orchestration Framework** | ✓ | Go, TypeScript | Examples | 20+ | Beta |
| **Maestro Packages** | ✓ | TypeScript, Python | N/A | 307 | Production |
| **Conductor UI** | ✓ | React, TypeScript | N/A | 100+ | Production |
| **Workflow Schemas** | ✓ | JSON Schema, YAML | Examples | 10+ | Production |

---

## TECHNOLOGY STACK OVERVIEW

### Languages
- **Primary**: TypeScript/JavaScript, Python, Go, YAML
- **Total**: 122 orchestration files + 307 Maestro files = 429 core files

### Frameworks & Tools
- **Workflow Definition**: Maestro YAML, JSON Schema, Tekton YAML, GitHub Actions
- **Execution Engines**: 
  - Conductor (Netflix)
  - Maestro (custom)
  - Airflow (Apache)
  - Chronos Aeternum (custom Go runtime)
- **Storage**: PostgreSQL, S3, Redis
- **Observability**: OpenTelemetry, Prometheus, Grafana
- **Policy**: OPA (Open Policy Agent)
- **Cost**: Custom budget managers, cost-per-record tracking

### Integration Points
- **Data sources**: Kafka, S3, Neo4j, APIs
- **Triggers**: Cron, webhooks, manual, events
- **Notifications**: AlertManager, custom handlers
- **Routing**: Cost-aware, ML-powered job routing

---

## DESIGN PATTERNS OBSERVED

### 1. **Deterministic Execution**
- Idempotent operations (MERGE semantics, staging)
- Reproducible DAGs (versioned schemas)
- State machines (execution tracking)

### 2. **Progressive Deployment**
- Canary analysis gates
- SLO burn rate checks
- Automated rollback on failure

### 3. **Cost Governance**
- Hard budget caps per pipeline
- Cost-per-task tracking
- Cost-aware routing (GPU vs CPU)

### 4. **Multi-Agent Orchestration**
- Collaborative planning (meta-orchestrator)
- Consensus building
- Distributed decision making

### 5. **Compliance & Observability**
- Policy as code (OPA)
- Lineage tracking (OpenLineage)
- Audit logging (provenance)
- Attestations (signatures, permissions)

### 6. **Resilience**
- Exponential backoff retries
- Dead-letter queues
- Circuit breaker patterns
- Health checks with callbacks

---

## CONSOLIDATION OPPORTUNITIES

### High-Priority Unification Areas
1. **Workflow Definition**: Converge on single schema (Maestro YAML)
2. **Execution Runtime**: Consolidate Conductor + Airflow + Chronos
3. **State Management**: Unified PostgreSQL schema
4. **Observability**: Centralized OpenTelemetry + Prometheus stack
5. **Policy Enforcement**: Single OPA policy engine

### Medium-Priority Standardization
1. Task library (plugin registry)
2. Artifact handling (S3 conventions)
3. Retry/backoff strategies
4. Secret management (HashiCorp Vault)

### Low-Priority Clean-up
1. Archive legacy workflows (.archive/workflows)
2. Consolidate deprecated patterns
3. Update documentation

---

## RECOMMENDATION FOR UNIFIED ORCHESTRATION SYSTEM

### Proposed Architecture
```
┌─────────────────────────────────────┐
│     Unified Orchestration API       │
│  (REST + GraphQL + gRPC)            │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌──────────┐
│Maestro │ │ Airflow│ │ Conductor│
│ Execs  │ │ Execs  │ │  Execs   │
└─┬──────┘ └────┬───┘ └────┬─────┘
  │            │           │
  └─────┬──────┴──────┬────┘
        │             │
    ┌───▼─────────────▼───┐
    │  State Store (Postgres)
    │  + Artifact (S3)
    │  + Observability (OTEL)
    │  + Policy (OPA)
    └─────────────────────┘
```

### Implementation Phases
1. **Phase 1**: Unify schemas + APIs
2. **Phase 2**: Migrate Airflow DAGs → Maestro
3. **Phase 3**: Retire legacy Conductor instances
4. **Phase 4**: Consolidate observability
5. **Phase 5**: Unified governance & cost control

