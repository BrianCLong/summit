# IntelGraph Platform - Repository Map

## Overview

IntelGraph is a next-generation intelligence analysis platform with AI-augmented graph analytics. It's a monorepo that contains multiple services, client applications, and supporting infrastructure.

## Directory Structure (Depth ≤ 4)

```
intelgraph/
├── __mocks__/                    # Mock files for testing
├── __tests__/                    # Test files
├── .aider.tags.cache.v4/        # Aider configuration
├── .archive/                     # Archived files
├── .ci/                          # CI configuration
├── .claude/                      # Claude-specific configuration
├── .devcontainer/                # VS Code dev container setup
├── .disabled/                    # Disabled features/components
├── .evidence/                    # Evidence files
├── .githooks/                    # Git hooks
├── .github/                      # GitHub configuration
├── .grok/                        # Grok/AI configuration
├── .husky/                       # Husky git hooks
├── .maestro/                     # Maestro orchestration files
├── .mc/                          # Command configuration
├── .prbodies/                    # PR templates
├── .security/                    # Security configuration
├── .vale/                        # Text linting configuration
├── .zap/                         # ZAP security scanning
├── absorption/                   # Absorption module
├── active-measures-module/       # Active measures functionality
├── activities/                   # Activity tracking
├── adr/                          # Architecture decision records
├── ai-ml-suite/                  # AI/ML suite
├── airflow/                      # Airflow workflows
├── alerting/                     # Alerting system
├── alertmanager/                 # Alertmanager configuration
├── analysis/                     # Analysis tools
├── analytics/                    # Analytics modules
├── api/                          # API implementations
├── apis/                         # API definitions
├── apps/                         # Application modules
├── archive_legacy/               # Legacy archive
├── artifacts/                    # Build artifacts
├── assistant/                    # Assistant functionality
├── audit/                        # Audit logs and tools
├── backlog/                      # Backlog items
├── benchmarks/                   # Benchmarking tools
├── brands/                       # Brand assets
├── bug-bash-results/             # Bug bash results
├── catalog/                      # Catalog services
├── chaos/                        # Chaos engineering
├── charts/                       # Helm charts
├── cli/                          # Command line interface
├── client/                       # React frontend application
│   ├── __mocks__/
│   ├── .husky/
│   ├── artifacts/
│   ├── browser-extension/
│   ├── client/                 # Client source code
│   ├── components/
│   ├── cypress/
│   ├── deploy/
│   ├── examples/
│   ├── node_modules/
│   ├── playwright-report/
│   ├── public/
│   ├── scripts/
│   ├── src/
│   ├── test/
│   ├── test-results/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── client-v039/                  # Legacy client version
├── clients/                      # Client libraries
├── cognitive_insights_engine/    # Cognitive insights engine
├── cognitive-insights/           # Cognitive insights features
├── cognitive-targeting-engine/   # Targeting engine
├── comms/                        # Communications
├── companyos/                    # Company-specific features
├── competitive/                  # Competitive analysis
├── compose/                      # Docker Compose files
├── conductor-ui/                 # Conductor UI
├── config/                       # Configuration files
├── connectors/                   # Data connectors
├── contracts/                    # API contracts
├── controllers/                  # API controllers
├── controls/                     # Control components
├── copilot/                      # Copilot functionality
├── crypto/                       # Cryptography
├── dash/                         # Dashboard components
├── dashboard/                    # Dashboard
├── data/                         # Data files
├── data-pipelines/               # Data pipelines
├── db/                           # Database utilities
├── deescalation-coach/           # Deescalation coach
├── deploy/                       # Deployment scripts
├── docker/                       # Docker configuration
├── docs/                         # Documentation
├── docs-site/                    # Documentation site
├── dora/                         # DORA metrics
├── e2e/                          # End-to-end tests
├── etl/                          # ETL processes
├── eval/                         # Evaluation tools
├── evals/                        # Evaluation results
├── evidence/                     # Evidence collection
├── examples/                     # Code examples
├── extensions/                   # Extensions
├── feature-flags/                # Feature flag configuration
├── featurestore/                 # Feature store
├── feedback/                     # Feedback system
├── finops/                       # FinOps tools
├── frontend/                     # Frontend utilities
├── ga-caseops/                   # GA case operations
├── ga-graphai/                   # GA GraphAI
├── gameday/                      # Gameday exercises
├── gateway/                      # API gateway
├── GOLDEN/                       # Golden path configuration
├── governance/                   # Governance tools
├── grafana/                      # Grafana dashboards
├── graph_xai/                    # Graph XAI
├── graph-service/                # Graph service
├── graph-xai/                    # Graph XAI
├── graphql/                      # GraphQL schemas
├── helm/                         # Helm charts
├── html/                         # HTML templates
├── iac/                          # Infrastructure as code
├── incident/                     # Incident response
├── infra/                        # Infrastructure
├── infrastructure/               # Infrastructure files
├── ingestion/                    # Data ingestion
├── integrations/                 # Third-party integrations
├── intel-startover-bundle/       # Intel startover bundle
├── IntelArchive/                 # Intel archive
├── intelgraph/                   # Core IntelGraph module
├── intelgraph_ai_ml/             # IntelGraph AI/ML
├── intelgraph_enhancements/      # IntelGraph enhancements
├── intelgraph_error_fixes_bundle/ # IntelGraph error fixes
├── intelgraph-docs-bundle/       # IntelGraph docs bundle
├── intelgraph-mvp/               # IntelGraph MVP
├── invariants/                   # Invariants
├── issue_bodies/                 # Issue templates
├── issues/                       # Issue tracking
├── jobs/                         # Job definitions
├── k6/                           # K6 load testing
├── k8s/                          # Kubernetes manifests
├── kubernetes/                   # Kubernetes configuration
├── ledger/                       # Ledger systems
├── legal/                        # Legal documents
├── lib/                          # Libraries
├── libs/                         # Libraries
├── load/                         # Load testing
├── logs/                         # Log files
├── mesh/                         # Service mesh
├── migrations/                   # Database migrations
├── ml/                           # Machine learning
├── ml-pipeline/                  # ML pipeline
├── mlops/                        # MLOps
├── mobile/                       # Mobile application
├── model-catalog/                # Model catalog
├── modules/                      # Modules
├── monitoring/                   # Monitoring
├── ner-service/                  # NER service
├── network/                      # Network components
├── nix/                          # Nix configuration
├── nlp-service/                  # NLP service
├── node_modules/                 # Node.js dependencies
├── non_functional_targets/       # Non-functional targets
├── notebooks/                    # Jupyter notebooks
├── observability/                # Observability tools
├── october2025/                  # October 2025 planning
├── okr/                          # OKRs
├── opa/                          # Open Policy Agent policies
├── openapi/                      # OpenAPI specifications
├── operator-kit/                 # Operator kit
├── ops/                          # Operations
├── orchestrations/               # Orchestrations
├── otel/                         # Open Telemetry
├── packages/                     # NPM packages
├── pact/                         # Pact contract tests
├── pcbo/                         # PCBO optimization
├── perf/                         # Performance tools
├── persisted/                    # Persisted queries
├── pet/                          # PET analysis
├── pipelines/                    # CI/CD pipelines
├── platform/                     # Platform components
├── playwright-report/            # Playwright reports
├── plugins/                      # Plugins
├── pm/                           # Project management
├── policies/                     # Policy definitions
├── policy/                       # Policy configuration
├── policy-fuzzer/                # Policy fuzzer
├── postmortems/                  # Postmortems
├── pov/                          # Proof of concept
├── predictive_threat_suite/      # Predictive threat suite
├── privacy/                      # Privacy tools
├── project/                      # Project configuration
├── project_management/           # Project management
├── prom/                         # Prometheus
├── prometheus/                   # Prometheus configuration
├── prompts/                      # AI/ML prompts
├── prov_ledger/                  # Provenance ledger
├── prov-ledger/                  # Provenance ledger
├── prov-ledger-service/          # Provenance ledger service
├── provenance/                   # Provenance tracking
├── public/                       # Public assets
├── python/                       # Python utilities
├── rag/                          # RAG system
├── rbac/                         # RBAC configuration
├── recipes/                      # Build recipes
├── release/                      # Release configuration
├── release_playbook/             # Release playbook
├── release-v24/                  # Release v24
├── relevance/                    # Relevance algorithms
├── reliability-service/          # Reliability service
├── reports/                      # Reports
├── roadmap/                      # Roadmap
├── router/                       # Routing
├── RUNBOOKS/                     # Runbooks
├── runs/                         # Run configurations
├── sales/                        # Sales tools
├── samples/                      # Sample data
├── scenarios/                    # Test scenarios
├── schema/                       # Schema definitions
├── schemas/                      # Schema files
├── scripts/                      # Utility scripts
├── sdk/                          # SDK components
├── search/                       # Search functionality
├── SECURITY/                     # Security documentation
├── server/                       # Node.js backend application
│   ├── __tests__/
│   ├── .github/
│   ├── ab/                     # A/B testing
│   ├── ai/                     # AI components
│   ├── billing/               # Billing components
│   ├── bootstrap/             # Bootstrap utilities
│   ├── cache/                 # Caching
│   ├── ci/                    # CI configuration
│   ├── config/                # Server configuration
│   ├── coverage/              # Test coverage
│   ├── crypto/                # Crypto utilities
│   ├── data/                  # Server data
│   ├── data-pipelines/        # Data pipelines
│   ├── db/                    # Database connections
│   ├── degrade/               # Degradation handling
│   ├── embeddings/            # Embedding utilities
│   ├── eslint-rules/          # ESLint rules
│   ├── features/              # Server features
│   ├── gateway/               # API gateway
│   ├── global/                # Global utilities
│   ├── grafana/               # Grafana configuration
│   ├── graph/                 # Graph utilities
│   ├── graphql/               # GraphQL resolvers
│   ├── inference/             # Inference components
│   ├── infrastructure/        # Infrastructure code
│   ├── k8s/                   # Kubernetes manifests
│   ├── logs/                  # Log configuration
│   ├── metrics/               # Metrics collection
│   ├── middleware/            # Express middleware
│   ├── migrations/            # Database migrations
│   ├── ml/                    # ML utilities
│   ├── models/                # Data models
│   ├── node_modules/
│   ├── observability/         # Observability
│   ├── orchestration/         # Orchestration
│   ├── orchestrator/          # Orchestrator
│   ├── perf/                  # Performance
│   ├── plan/                  # Planning
│   ├── plugins/               # Server plugins
│   ├── policies/              # Server policies
│   ├── privacy/               # Privacy utilities
│   ├── prompts/               # Prompt templates
│   ├── python/                # Python scripts
│   ├── qos/                   # QoS utilities
│   ├── redaction/             # Redaction utilities
│   ├── relevance/             # Relevance algorithms
│   ├── resilience/            # Resilience utilities
│   ├── routes/                # Express routes
│   ├── runbooks/              # Runbooks
│   ├── safety/                # Safety utilities
│   ├── scripts/               # Server scripts
│   ├── search/                # Search utilities
│   ├── security/              # Security utilities
│   ├── seeds/                 # Database seeds
│   ├── sei/                   # SEI utilities
│   ├── speclive/              # SpecLive utilities
│   ├── src/                   # Server source code
│   ├── telemetry/             # Telemetry
│   ├── test/                  # Test utilities
│   ├── test-results/          # Test results
│   ├── testing/               # Testing utilities
│   ├── tests/                 # Server tests
│   ├── tracing/               # Tracing
│   ├── utils/                 # Server utilities
│   ├── app.ts
│   ├── index.ts
│   ├── jest.config.js
│   ├── logger.ts
│   ├── otel.ts
│   ├── package.json
│   ├── server.ts
│   └── tsconfig.json
├── server-v039/                  # Legacy server version
├── services/                     # Backend services
├── simulated_ingestion/          # Simulated ingestion
├── specs/                        # Specifications
├── sprint-kits/                  # Sprint kits
├── src/                          # Source code root
├── status/                       # Status monitoring
├── streaming/                    # Streaming components
├── summit_helm_argocd_multiacct_pack/ # Summit Helm/ArgoCD
├── summit_policy_release_pack/   # Policy release pack
├── summit_release_env_pack/      # Release environment pack
├── summit_ticket_pack/           # Ticket pack
├── summit-company_extended/      # Extended company features
├── synthetics/                   # Synthetic tests
├── templates/                    # Template files
├── terraform/                    # Terraform configuration
├── test/                         # Test utilities
├── test-results/                 # Test results
├── tests/                        # Test files
├── tmp/                          # Temporary files
├── tmp-test/                     # Temporary tests
├── tools/                        # Development tools
├── triage/                       # Triage tools
├── ui/                           # UI components
├── uploads/                      # Upload handling
├── v24_modules/                  # Version 24 modules
├── v4/                           # Version 4 features
├── warehouse/                    # Data warehouse
├── web/                          # Web components
├── worker/                       # Worker processes
├── workers/                      # Worker utilities
├── workflows/                    # Workflow definitions
```

## Services & Architecture

### Backend Services

- **Node.js/TypeScript Server**: Main API server (GraphQL + REST)
- **Neo4j**: Graph database for entity relationships
- **PostgreSQL**: Relational database for user data
- **TimescaleDB**: Time-series database for metrics
- **Redis**: Cache and session storage
- **Open Policy Agent (OPA)**: Policy-based authorization
- **Jaeger**: Distributed tracing
- **Prometheus**: Metrics collection
- **Grafana**: Dashboard and visualization
- **Kafka**: Streaming platform (optional)

### Frontend

- **React 18**: Frontend framework
- **Material-UI**: UI component library
- **Cytoscape.js**: Graph visualization
- **Vite**: Build tool

### Infrastructure

- **Docker**: Containerization
- **Docker Compose**: Local development orchestration
- **Helm**: Kubernetes deployments
- **OpenTelemetry**: Observability
- **Playwright**: E2E testing
- **Jest**: Unit testing

## Build Systems & Package Managers

### Node.js

- **Package Manager**: npm (with workspaces)
- **Build Tool**: TypeScript compiler (tsc), Vite
- **Monorepo**: Uses npm workspaces for multiple packages

### Python

- **Python Version**: 3.10+ (based on README)
- **Linter**: ruff (as seen in package.json)
- **Formatter**: black (as seen in pyproject.toml)

## CI/CD & Container Images

### Docker Images

- **Frontend**: node:20-bullseye (Vite build)
- **Backend**: node:20-bullseye (Node.js server)
- **Database**: postgres:16-alpine, neo4j:5.8
- **Cache**: redis:7-alpine
- **Observability**: prom/prometheus, grafana/grafana
- **Policy**: openpolicyagent/opa:0.65.0-rootless
- **Tracing**: jaegertracing/all-in-one:1.58

### CI/CD

- **GitHub Actions**: For CI/CD pipelines
- **Makefile**: For local development workflows
- **Scripts**: Various shell scripts in /scripts directory

## Data Stores

1. **Neo4j**: Primary graph database (entities and relationships)
2. **PostgreSQL**: Relational data (users, audit logs, metadata)
3. **TimescaleDB**: Time-series data (metrics, events)
4. **Redis**: Cache, sessions, and real-time pub/sub

## Environment Files & Secrets Handling

### Environment Files

- **.env.example**: Contains example environment variables
- **.env**: Local environment configuration (git-ignored)
- **Environment Variables**: For database URLs, secrets, API keys

### Secrets Handling

- **Environment-based**: Secrets stored in environment variables
- **No committed secrets**: Secrets are not committed to repository
- **Configuration**: Uses dotenv for environment management

## Makefile Targets (Golden Path)

### Core Development

- **`make bootstrap`**: Setup development environment
- **`make up`**: Start core services (minimal hardware)
- **`make smoke`**: Run smoke tests to verify deployment

### Optional Services

- **`make up-ai`**: Start with AI processing capabilities
- **`make up-kafka`**: Start with Kafka streaming
- **`make up-full`**: Start all services (AI + Kafka)

### Data Flow

- **`make ingest`**: Produce sample posts to Kafka
- **`make graph`**: Consume and write to Neo4j
