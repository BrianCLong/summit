# IntelGraph Platform - Repository Structure Guide
**Last Updated:** August 30, 2025  
**Purpose:** Comprehensive guide to repository organization and navigation

## 🎯 Quick Navigation

| Component | Location | Purpose | Tech Stack |
|-----------|----------|---------|------------|
| **Frontend** | `client/` | React web application | React 18, TypeScript, GraphQL |
| **Backend API** | `server/` | Node.js GraphQL server | Node.js, GraphQL, TypeScript |
| **Graph Database** | `graph-service/` | Neo4j interface service | Python, Neo4j |
| **AI/ML Services** | `ml/`, `copilot/` | Machine learning components | Python, TensorFlow, PyTorch |
| **Data Ingestion** | `ingestion/` | Kafka-based data pipeline | Python, Kafka |
| **Infrastructure** | `k8s/`, `terraform/` | Deployment configurations | Kubernetes, Terraform |
| **Documentation** | `docs/` | Architecture & guides | Markdown |

## 📁 Root Level Structure

```
intelgraph/
├── 🎨 Frontend Applications
│   ├── client/              # Main React web application  
│   ├── ui/                  # Shared UI components
│   └── frontend/            # Additional frontend assets
│
├── ⚙️  Backend Services
│   ├── server/              # Primary GraphQL API server
│   ├── api/                 # REST API services
│   ├── gateway/             # API gateway & routing
│   └── services/            # Microservices collection
│
├── 🧠 AI/ML Components  
│   ├── ml/                  # Machine learning models & training
│   ├── ai-ml-suite/         # AI processing pipeline
│   ├── copilot/             # AI assistant service
│   ├── cognitive-insights/  # Cognitive analysis engine
│   ├── nlp-service/         # Natural language processing
│   └── intelgraph_ai_ml/    # Core AI/ML library
│
├── 🗄️  Data & Graph Systems
│   ├── graph-service/       # Neo4j interface service
│   ├── graph-xai/           # Graph explainable AI
│   ├── db/                  # Database configurations
│   └── migrations/          # Database migration scripts
│
├── 📊 Data Processing
│   ├── ingestion/           # Kafka data ingestion pipeline
│   ├── data-pipelines/      # ETL/ELT data processing
│   ├── connectors/          # External system connectors
│   ├── streaming/           # Real-time data streaming
│   └── analytics/           # Data analysis tools
│
├── 🔧 Infrastructure & DevOps
│   ├── k8s/                 # Kubernetes manifests
│   ├── helm/                # Helm charts
│   ├── terraform/           # Infrastructure as code
│   ├── deploy/              # Deployment scripts
│   ├── monitoring/          # Observability configs
│   └── .github/             # GitHub Actions workflows
│
├── 📚 Documentation & Governance
│   ├── docs/                # Architecture & guides
│   ├── reports/             # Health & audit reports
│   ├── policies/            # Security & compliance policies
│   └── *.md                 # Root documentation files
│
├── 🔒 Security & Compliance
│   ├── rbac/                # Role-based access control
│   ├── audit/               # Audit configurations
│   └── policies/            # Security policies
│
├── 🧪 Testing & Quality
│   ├── tests/               # Test suites
│   ├── e2e/                 # End-to-end tests
│   └── benchmarks/          # Performance benchmarks
│
├── 🛠️  Development Tools
│   ├── scripts/             # Automation scripts  
│   ├── tools/               # Development utilities
│   ├── config/              # Configuration files
│   └── packages/            # Shared packages
│
└── 📦 Package Management
    ├── package.json         # Node.js dependencies
    ├── pyproject.toml       # Python configuration
    ├── Makefile             # Build automation
    ├── Taskfile.yml         # Modern task runner
    └── Justfile             # Current task system
```

## 🎯 Core Application Architecture

### Frontend (`client/`)
```
client/
├── src/
│   ├── components/          # Reusable React components
│   ├── pages/               # Route-based page components  
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── graphql/             # GraphQL queries & mutations
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
└── package.json             # Frontend dependencies
```

### Backend (`server/`)  
```
server/
├── src/
│   ├── graphql/             # GraphQL schema & resolvers
│   ├── services/            # Business logic services
│   ├── lib/                 # Shared utilities
│   ├── db/                  # Database connection & models  
│   └── middleware/          # Express middleware
├── dist/                    # Compiled JavaScript output
└── package.json             # Backend dependencies
```

### AI/ML Services (`ml/`, `copilot/`)
```
ml/
├── models/                  # Trained model artifacts
├── training/                # Training scripts & notebooks
├── inference/               # Model inference services
├── data/                    # Training/test datasets
└── requirements.txt         # Python ML dependencies

copilot/
├── src/                     # AI copilot service code
├── prompts/                 # AI prompt templates
├── knowledge/               # Knowledge base
└── requirements.txt         # AI service dependencies
```

## 🔄 Data Flow Architecture

### Ingestion Pipeline
```
External Data → ingestion/ → Kafka → graph-service/ → Neo4j
                     ↓
                data-pipelines/ → PostgreSQL
                     ↓
                 ml/ → AI Models → copilot/
```

### API Request Flow
```
Client → gateway/ → server/ → GraphQL Resolvers
                        ↓
                 Graph Service (Neo4j)
                 Database (PostgreSQL)
                 AI/ML Services
```

## 🧩 Microservices Architecture

| Service | Port | Purpose | Technology |
|---------|------|---------|------------|
| **Client** | 3000 | Web application | React + Vite |
| **Server** | 4000 | GraphQL API | Node.js + Apollo |
| **Graph Service** | 4001 | Neo4j interface | Python + Neo4j |
| **Copilot** | 4002 | AI assistant | Python + FastAPI |
| **Ingestion** | 4003 | Data pipeline | Python + Kafka |
| **Gateway** | 4004 | API routing | Node.js + Express |

## 📋 Development Workflows

### Local Development Setup
1. **Prerequisites**: Docker, Node.js 18+, Python 3.12+
2. **Quick Start**: `make bootstrap && make up && make smoke`
3. **Development Mode**: `make dev` (starts client + server)
4. **Full Stack**: `make up-full` (includes AI + Kafka)

### Testing Strategy
- **Unit Tests**: `npm test` (Jest + React Testing Library)
- **Integration Tests**: `make test:integration` 
- **E2E Tests**: `npx playwright test`
- **Smoke Tests**: `make smoke` (validates golden path)

### Code Quality
- **Linting**: ESLint (JS/TS), Ruff (Python)
- **Formatting**: Prettier (JS/TS), Black (Python)  
- **Type Checking**: TypeScript, mypy
- **Security Scanning**: Gitleaks, CodeQL, Trivy

## 🔐 Security Architecture

### Authentication Flow
```
User → Client → Gateway → JWT Validation → GraphQL Server
                    ↓
               Auth Service → User Database
```

### Security Layers
1. **Network**: TLS/HTTPS termination at gateway
2. **Authentication**: JWT-based session management  
3. **Authorization**: RBAC via `rbac/` policies
4. **Data**: Encryption at rest (databases)
5. **Secrets**: Environment variables + Kubernetes secrets

## 📊 Monitoring & Observability

### Observability Stack
- **Metrics**: Prometheus (`monitoring/prometheus/`)
- **Tracing**: Jaeger (`monitoring/jaeger/`)
- **Dashboards**: Grafana (`monitoring/grafana/`)
- **Logging**: Structured JSON logs
- **Alerting**: Prometheus Alertmanager

### Health Check Endpoints
- **Client**: `http://localhost:3000/health`
- **Server**: `http://localhost:4000/health`
- **Graph Service**: `http://localhost:4001/health`
- **Overall**: `make health` (comprehensive check)

## 🚀 Deployment Architecture

### Environment Progression  
```
Local → Dev → Staging → Production
  ↓       ↓       ↓         ↓
Docker   K8s     K8s      K8s + CDN
```

### Infrastructure Components
- **Container Registry**: Docker Hub / ECR
- **Orchestration**: Kubernetes (`k8s/`)
- **Service Mesh**: Istio (optional)
- **Ingress**: NGINX Ingress Controller
- **Storage**: PostgreSQL (RDS), Neo4j AuraDB
- **Caching**: Redis Cluster

## 🧭 Navigation Tips

### Finding Code Components
- **GraphQL Schema**: `server/src/graphql/schemas/`
- **React Components**: `client/src/components/`
- **AI Models**: `ml/models/`
- **Database Migrations**: `server/src/migrations/`
- **K8s Configs**: `k8s/environments/`

### Common Tasks  
- **Add New API**: Edit `server/src/graphql/`
- **Add New UI**: Edit `client/src/components/`
- **Database Changes**: Add migration to `migrations/`
- **Deploy Changes**: Use `make deploy:dev`
- **Run Tests**: Use `make test`

### Debugging & Logs
- **Application Logs**: `make logs`
- **Database Logs**: `docker compose logs neo4j`
- **Development**: Browser DevTools + GraphQL Playground
- **Production**: Grafana dashboards + Jaeger traces

## 📈 Growth Patterns

### Adding New Services
1. Create service directory under appropriate category
2. Add Dockerfile and docker-compose configuration
3. Update Kubernetes manifests in `k8s/`
4. Add monitoring and health checks
5. Update this documentation

### Scaling Considerations
- **Horizontal Scaling**: Kubernetes HPA configurations
- **Database Scaling**: Read replicas for PostgreSQL/Neo4j
- **Caching Strategy**: Redis for session/query caching
- **CDN Integration**: Static asset distribution

---

## 🤝 Contributing

Before making changes:
1. 📖 Read `CONTRIBUTING.md`
2. 🔍 Review `docs/ADR/` for architectural decisions  
3. 🧪 Ensure `make smoke` passes locally
4. 📝 Update relevant documentation
5. 🔒 Run security scans (`gitleaks detect`)

For questions about repository structure, see `docs/` or create an issue.

---
*This document is maintained as part of the IntelGraph Platform baseline cleanup initiative.*