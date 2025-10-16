# IntelGraph Platform - Complete Development Package

## 📦 Package Overview

This is the complete development package for the IntelGraph Platform - a next-generation intelligence analysis platform that synthesizes and surpasses Maltego and Palantir capabilities with AI-augmented graph analytics, real-time collaboration, and enterprise-grade security.

## 🏗️ Project Structure

```
intelgraph-platform/
├── README.md                          # Main project documentation
├── LICENSE                            # MIT License
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore patterns
├── package.json                       # Root package.json
├── docker-compose.yml                 # Development environment
├── docker-compose.prod.yml            # Production environment
├──
├── docs/                              # Documentation
│   ├── REQUIREMENTS.md                # Full requirements specification
│   ├── ARCHITECTURE.md                # System architecture
│   ├── API.md                         # API documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   ├── SECURITY.md                    # Security guidelines
│   ├── CONTRIBUTING.md                # Contribution guidelines
│   ├── erd/                          # Entity relationship diagrams
│   │   ├── ERD.md                    # ERD documentation
│   │   ├── ERD.svg                   # ERD diagram
│   │   └── ERD.mermaid               # Mermaid ERD source
│   └── api/                          # API specifications
│       ├── openapi.yaml              # OpenAPI 3.0 specification
│       └── graphql-schema.graphql    # GraphQL schema
│
├── server/                           # Backend Node.js application
│   ├── package.json                 # Server dependencies
│   ├── src/
│   │   ├── app.js                   # Express application
│   │   ├── server.js                # Server entry point
│   │   ├── config/                  # Configuration files
│   │   │   ├── database.js          # Database configuration
│   │   │   ├── auth.js              # Authentication config
│   │   │   └── plugins.js           # Plugin system config
│   │   ├── models/                  # Data models
│   │   │   ├── Entity.js            # Entity model
│   │   │   ├── Relationship.js      # Relationship model
│   │   │   ├── User.js              # User model
│   │   │   ├── Investigation.js     # Investigation model
│   │   │   └── index.js             # Model exports
│   │   ├── services/                # Business logic
│   │   │   ├── AuthService.js       # Authentication service
│   │   │   ├── GraphService.js      # Graph operations
│   │   │   ├── AIService.js         # AI/ML integration
│   │   │   ├── PluginService.js     # Plugin management
│   │   │   ├── IngestService.js     # Data ingestion
│   │   │   └── ExportService.js     # Data export
│   │   ├── controllers/             # API controllers
│   │   │   ├── authController.js    # Authentication endpoints
│   │   │   ├── graphController.js   # Graph endpoints
│   │   │   ├── entityController.js  # Entity CRUD
│   │   │   ├── aiController.js      # AI/ML endpoints
│   │   │   └── adminController.js   # Admin endpoints
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.js              # Authentication middleware
│   │   │   ├── validation.js        # Input validation
│   │   │   ├── rateLimiting.js      # Rate limiting
│   │   │   ├── logging.js           # Request logging
│   │   │   └── error.js             # Error handling
│   │   ├── routes/                  # API routes
│   │   │   ├── auth.js              # Authentication routes
│   │   │   ├── graph.js             # Graph routes
│   │   │   ├── entities.js          # Entity routes
│   │   │   ├── ai.js                # AI/ML routes
│   │   │   └── admin.js             # Admin routes
│   │   ├── graphql/                 # GraphQL implementation
│   │   │   ├── schema.js            # GraphQL schema
│   │   │   ├── resolvers/           # GraphQL resolvers
│   │   │   │   ├── Query.js         # Query resolvers
│   │   │   │   ├── Mutation.js      # Mutation resolvers
│   │   │   │   ├── Subscription.js  # Subscription resolvers
│   │   │   │   └── index.js         # Resolver exports
│   │   │   └── directives/          # Custom directives
│   │   │       ├── auth.js          # Auth directive
│   │   │       └── rateLimit.js     # Rate limiting directive
│   │   ├── plugins/                 # Plugin system
│   │   │   ├── PluginManager.js     # Plugin management
│   │   │   ├── PluginRegistry.js    # Plugin registry
│   │   │   └── core/                # Core plugins
│   │   │       ├── osint.js         # OSINT integrations
│   │   │       ├── enrichment.js   # Data enrichment
│   │   │       └── export.js        # Export plugins
│   │   ├── utils/                   # Utility functions
│   │   │   ├── logger.js            # Logging utility
│   │   │   ├── crypto.js            # Cryptography utils
│   │   │   ├── validation.js        # Validation helpers
│   │   │   └── database.js          # Database utilities
│   │   └── tests/                   # Backend tests
│   │       ├── unit/                # Unit tests
│   │       ├── integration/         # Integration tests
│   │       └── fixtures/            # Test fixtures
│   └── Dockerfile                   # Backend container
│
├── client/                          # React frontend application
│   ├── package.json                # Client dependencies
│   ├── public/                     # Static assets
│   │   ├── index.html              # HTML template
│   │   ├── manifest.json           # PWA manifest
│   │   └── favicon.ico             # Favicon
│   ├── src/
│   │   ├── index.js                # Application entry point
│   │   ├── App.js                  # Main App component
│   │   ├── components/             # React components
│   │   │   ├── common/             # Common components
│   │   │   │   ├── Layout.jsx      # Layout component
│   │   │   │   ├── Header.jsx      # Header component
│   │   │   │   ├── Sidebar.jsx     # Sidebar component
│   │   │   │   └── Loading.jsx     # Loading component
│   │   │   ├── auth/               # Authentication components
│   │   │   │   ├── Login.jsx       # Login form
│   │   │   │   ├── Register.jsx    # Registration form
│   │   │   │   └── Profile.jsx     # User profile
│   │   │   ├── graph/              # Graph visualization
│   │   │   │   ├── GraphCanvas.jsx # Main graph canvas
│   │   │   │   ├── NodeRenderer.jsx # Node rendering
│   │   │   │   ├── EdgeRenderer.jsx # Edge rendering
│   │   │   │   └── Controls.jsx    # Graph controls
│   │   │   ├── investigation/      # Investigation components
│   │   │   │   ├── InvestigationList.jsx # Investigation list
│   │   │   │   ├── InvestigationView.jsx # Investigation viewer
│   │   │   │   └── InvestigationForm.jsx # Investigation form
│   │   │   ├── entities/           # Entity components
│   │   │   │   ├── EntityList.jsx  # Entity list
│   │   │   │   ├── EntityForm.jsx  # Entity form
│   │   │   │   └── EntityDetail.jsx # Entity details
│   │   │   ├── ai/                 # AI/ML components
│   │   │   │   ├── Predictions.jsx # Link predictions
│   │   │   │   ├── Insights.jsx    # AI insights
│   │   │   │   └── Copilot.jsx     # AI copilot
│   │   │   └── admin/              # Admin components
│   │   │       ├── UserManagement.jsx # User management
│   │   │       ├── SystemStats.jsx    # System statistics
│   │   │       └── PluginManager.jsx  # Plugin management
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useAuth.js          # Authentication hook
│   │   │   ├── useGraph.js         # Graph operations hook
│   │   │   ├── useWebSocket.js     # WebSocket hook
│   │   │   └── useLocalStorage.js  # Local storage hook
│   │   ├── store/                  # Redux store
│   │   │   ├── index.js            # Store configuration
│   │   │   ├── slices/             # Redux slices
│   │   │   │   ├── authSlice.js    # Authentication state
│   │   │   │   ├── graphSlice.js   # Graph state
│   │   │   │   ├── uiSlice.js      # UI state
│   │   │   │   └── investigationSlice.js # Investigation state
│   │   │   └── middleware/         # Custom middleware
│   │   │       ├── api.js          # API middleware
│   │   │       └── websocket.js    # WebSocket middleware
│   │   ├── services/               # Frontend services
│   │   │   ├── api.js              # API client
│   │   │   ├── auth.js             # Authentication service
│   │   │   ├── graph.js            # Graph service
│   │   │   └── websocket.js        # WebSocket service
│   │   ├── utils/                  # Utility functions
│   │   │   ├── constants.js        # Application constants
│   │   │   ├── helpers.js          # Helper functions
│   │   │   ├── validators.js       # Form validators
│   │   │   └── formatters.js       # Data formatters
│   │   ├── styles/                 # Styling files
│   │   │   ├── index.css           # Main stylesheet
│   │   │   ├── variables.css       # CSS variables
│   │   │   └── components/         # Component styles
│   │   └── tests/                  # Frontend tests
│   │       ├── components/         # Component tests
│   │       ├── hooks/              # Hook tests
│   │       └── utils/              # Utility tests
│   └── Dockerfile                  # Frontend container
│
├── plugins/                        # Plugin development
│   ├── README.md                   # Plugin development guide
│   ├── sdk/                        # Plugin SDK
│   │   ├── python/                 # Python SDK
│   │   │   ├── intelgraph_sdk/     # SDK package
│   │   │   │   ├── __init__.py     # Package init
│   │   │   │   ├── base.py         # Base plugin class
│   │   │   │   ├── transform.py    # Transform plugins
│   │   │   │   ├── connector.py    # Connector plugins
│   │   │   │   └── utils.py        # SDK utilities
│   │   │   ├── setup.py            # Package setup
│   │   │   └── requirements.txt    # Python dependencies
│   │   └── javascript/             # JavaScript SDK
│   │       ├── package.json        # JS SDK package
│   │       ├── src/                # SDK source
│   │       │   ├── index.js        # Main export
│   │       │   ├── BasePlugin.js   # Base plugin class
│   │       │   ├── Transform.js    # Transform plugins
│   │       │   └── Connector.js    # Connector plugins
│   │       └── types/              # TypeScript definitions
│   ├── examples/                   # Example plugins
│   │   ├── python/                 # Python examples
│   │   │   ├── osint_enrichment.py # OSINT enrichment
│   │   │   ├── threat_intel.py     # Threat intelligence
│   │   │   └── social_media.py     # Social media integration
│   │   └── javascript/             # JavaScript examples
│   │       ├── custom_visualization.js # Custom visualizations
│   │       ├── data_transform.js   # Data transformations
│   │       └── ui_extension.js     # UI extensions
│   └── marketplace/                # Plugin marketplace
│       ├── registry.json           # Plugin registry
│       └── submissions/            # Plugin submissions
│
├── deploy/                         # Deployment configurations
│   ├── docker/                     # Docker configurations
│   │   ├── nginx/                  # Nginx configuration
│   │   │   ├── nginx.conf          # Nginx config
│   │   │   └── ssl/                # SSL certificates
│   │   ├── postgres/               # PostgreSQL setup
│   │   │   ├── init.sql            # Database initialization
│   │   │   └── backup/             # Database backups
│   │   └── neo4j/                  # Neo4j configuration
│   │       ├── neo4j.conf          # Neo4j config
│   │       └── plugins/            # Neo4j plugins
│   ├── kubernetes/                 # Kubernetes manifests
│   │   ├── namespace.yaml          # Namespace definition
│   │   ├── configmap.yaml          # Configuration maps
│   │   ├── secrets.yaml            # Secret definitions
│   │   ├── deployments/            # Application deployments
│   │   │   ├── backend.yaml        # Backend deployment
│   │   │   ├── frontend.yaml       # Frontend deployment
│   │   │   ├── postgres.yaml       # PostgreSQL deployment
│   │   │   └── neo4j.yaml          # Neo4j deployment
│   │   ├── services/               # Service definitions
│   │   │   ├── backend-service.yaml # Backend service
│   │   │   ├── frontend-service.yaml # Frontend service
│   │   │   └── ingress.yaml        # Ingress configuration
│   │   └── monitoring/             # Monitoring setup
│   │       ├── prometheus.yaml     # Prometheus config
│   │       └── grafana.yaml        # Grafana config
│   ├── helm/                       # Helm charts
│   │   ├── Chart.yaml              # Helm chart metadata
│   │   ├── values.yaml             # Default values
│   │   ├── values-dev.yaml         # Development values
│   │   ├── values-prod.yaml        # Production values
│   │   └── templates/              # Helm templates
│   │       ├── deployment.yaml     # Deployment template
│   │       ├── service.yaml        # Service template
│   │       ├── ingress.yaml        # Ingress template
│   │       ├── configmap.yaml      # ConfigMap template
│   │       └── secrets.yaml        # Secrets template
│   └── terraform/                  # Infrastructure as Code
│       ├── main.tf                 # Main Terraform config
│       ├── variables.tf            # Variable definitions
│       ├── outputs.tf              # Output definitions
│       ├── providers.tf            # Provider configurations
│       ├── modules/                # Terraform modules
│       │   ├── vpc/                # VPC module
│       │   ├── eks/                # EKS module
│       │   ├── rds/                # RDS module
│       │   └── security/           # Security module
│       └── environments/           # Environment-specific configs
│           ├── dev/                # Development environment
│           ├── staging/            # Staging environment
│           └── prod/               # Production environment
│
├── scripts/                        # Utility scripts
│   ├── setup.sh                   # Development setup
│   ├── build.sh                   # Build script
│   ├── deploy.sh                  # Deployment script
│   ├── test.sh                    # Test runner
│   ├── backup.sh                  # Backup script
│   ├── migrate.sh                 # Database migration
│   └── seed.sh                    # Database seeding
│
├── .github/                       # GitHub configuration
│   ├── workflows/                 # GitHub Actions
│   │   ├── ci.yml                 # Continuous Integration
│   │   ├── cd.yml                 # Continuous Deployment
│   │   ├── security.yml           # Security scanning
│   │   └── release.yml            # Release automation
│   ├── ISSUE_TEMPLATE/            # Issue templates
│   │   ├── bug_report.md          # Bug report template
│   │   ├── feature_request.md     # Feature request template
│   │   └── security_report.md     # Security report template
│   └── pull_request_template.md   # PR template
│
├── tests/                         # End-to-end tests
│   ├── e2e/                       # E2E test suites
│   │   ├── auth.test.js           # Authentication tests
│   │   ├── graph.test.js          # Graph functionality tests
│   │   └── investigation.test.js  # Investigation tests
│   ├── performance/               # Performance tests
│   │   ├── load-test.js           # Load testing
│   │   └── stress-test.js         # Stress testing
│   └── security/                  # Security tests
│       ├── auth-test.js           # Authentication security
│       └── injection-test.js      # Injection attacks
│
└── monitoring/                    # Monitoring and observability
    ├── grafana/                   # Grafana dashboards
    │   ├── dashboards/            # Dashboard definitions
    │   └── provisioning/          # Provisioning config
    ├── prometheus/                # Prometheus configuration
    │   ├── rules/                 # Alert rules
    │   └── targets/               # Scrape targets
    └── elasticsearch/             # Log aggregation
        ├── mappings/              # Index mappings
        └── pipelines/             # Ingest pipelines
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git
- Neo4j 5.0+
- PostgreSQL 14+

### Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/intelgraph-platform.git
cd intelgraph-platform
```

2. **Environment configuration**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Install dependencies**

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

4. **Start development environment**

```bash
# Start databases and services
docker-compose up -d

# Start backend
cd server && npm run dev &

# Start frontend
cd client && npm start
```

5. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql
- Neo4j Browser: http://localhost:7474

## 📝 Key Features

### Core Capabilities

- **Multi-Domain Graph Analysis** - Person, Organization, Device, Event, Document entities
- **Real-time Collaboration** - Live graph editing, comments, investigations
- **AI-Powered Analytics** - Link prediction, anomaly detection, pattern recognition
- **Advanced Visualization** - Interactive graph canvas with custom layouts
- **Plugin Architecture** - Extensible transform and connector system
- **Enterprise Security** - RBAC, audit trails, data encryption
- **Multi-format Export** - PDF, JSON, GEXF, GraphML, CSV exports
- **API Integration** - REST and GraphQL APIs with comprehensive documentation

### Technical Stack

- **Frontend**: React 18, Redux Toolkit, Cytoscape.js, Material-UI
- **Backend**: Node.js, Express, GraphQL, Socket.io
- **Databases**: Neo4j (graph), PostgreSQL (relational), Redis (cache)
- **AI/ML**: TensorFlow.js, Python ML services, Graph Neural Networks
- **Security**: JWT authentication, bcrypt encryption, rate limiting
- **Infrastructure**: Docker, Kubernetes, Helm, Terraform
- **Monitoring**: Prometheus, Grafana, ELK Stack

## 🔧 Configuration

### Environment Variables

| Variable         | Description             | Default                                  |
| ---------------- | ----------------------- | ---------------------------------------- |
| `NODE_ENV`       | Environment mode        | `development`                            |
| `PORT`           | Server port             | `4000`                                   |
| `CLIENT_PORT`    | Client port             | `3000`                                   |
| `NEO4J_URI`      | Neo4j connection string | `bolt://localhost:7687`                  |
| `NEO4J_USER`     | Neo4j username          | `neo4j`                                  |
| `NEO4J_PASSWORD` | Neo4j password          | `password`                               |
| `POSTGRES_URI`   | PostgreSQL connection   | `postgresql://localhost:5432/intelgraph` |
| `REDIS_URI`      | Redis connection        | `redis://localhost:6379`                 |
| `JWT_SECRET`     | JWT signing secret      | `your-secret-key`                        |
| `ENCRYPTION_KEY` | Data encryption key     | `32-byte-encryption-key`                 |

### Database Configuration

#### Neo4j Setup

```cypher
// Create constraints
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;

// Create indexes
CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX entity_created IF NOT EXISTS FOR (e:Entity) ON (e.created_at);
```

#### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investigations table
CREATE TABLE investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧩 Plugin Development

### Creating a Transform Plugin (Python)

```python
from intelgraph_sdk import TransformPlugin

class OSINTEnrichment(TransformPlugin):
    def __init__(self, config):
        super().__init__(config)
        self.api_key = config.get('api_key')

    def transform(self, entity):
        """Enrich entity with OSINT data"""
        if entity.type == 'Person' and 'email' in entity.attributes:
            # Perform OSINT lookup
            enriched_data = self.lookup_osint(entity.attributes['email'])
            entity.attributes.update(enriched_data)
        return entity

    def lookup_osint(self, email):
        # Implementation here
        return {'social_profiles': [], 'breach_data': []}
```

### Creating a Visualization Plugin (JavaScript)

```javascript
import { VisualizationPlugin } from 'intelgraph-sdk';

export class ThreatActorVisualization extends VisualizationPlugin {
  name = 'threat-actor-viz';

  shouldApply(node) {
    return (
      node.data.type === 'Person' && node.data.attributes.threat_actor === true
    );
  }

  apply(node, canvas) {
    canvas.setNodeStyle(node.id, {
      'background-color': '#ff4444',
      'border-color': '#cc0000',
      'border-width': 3,
    });
    canvas.addBadge(node.id, '⚠️');
  }
}
```

## 🔐 Security Features

### Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- API key management for integrations
- Multi-factor authentication support

### Data Protection

- AES-256 encryption for sensitive data
- Field-level encryption for PII
- Secure key management with Vault integration
- Data masking and redaction capabilities

### Audit & Compliance

- Comprehensive audit logging
- GDPR compliance features
- Data retention policies
- Privacy impact assessments

## 📊 API Documentation

### REST API Endpoints

#### Authentication

```
POST /api/v1/auth/login          # User login
POST /api/v1/auth/register       # User registration
POST /api/v1/auth/refresh        # Token refresh
POST /api/v1/auth/logout         # User logout
```

#### Graph Operations

```
GET  /api/v1/graph/entities      # List entities
POST /api/v1/graph/entities      # Create entity
GET  /api/v1/graph/expand        # Expand graph
POST /api/v1/graph/search        # Search graph
```

#### AI/ML Services

```
POST /api/v1/ai/predict-links    # Predict missing links
POST /api/v1/ai/detect-anomalies # Detect anomalies
POST /api/v1/ai/find-patterns    # Pattern recognition
```

### GraphQL Schema

```graphql
type Entity {
  id: ID!
  type: String!
  attributes: JSON!
  labels: [String!]!
  relationships: [Relationship!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
  updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
  deleteEntity(id: ID!): Boolean!
}

type Query {
  entities(filter: EntityFilter): [Entity!]!
  graph(query: GraphQuery!): Graph!
  investigations: [Investigation!]!
}
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# Scale specific services
docker-compose up -d --scale backend=3

# View logs
docker-compose logs -f backend
```

### Kubernetes Deployment

```bash
# Install with Helm
helm repo add intelgraph https://charts.intelgraph.com
helm install intelgraph intelgraph/intelgraph-platform

# Custom configuration
helm install intelgraph intelgraph/intelgraph-platform -f values-prod.yaml
```

### Cloud Deployment

```bash
# AWS EKS with Terraform
cd deploy/terraform/environments/prod
terraform init
terraform plan
terraform apply

# Deploy application
kubectl apply -f deploy/kubernetes/
```

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Backend tests only
npm run test:server

# Frontend tests only
npm run test:client

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Test Coverage

- Unit tests: >90% coverage requirement
- Integration tests: API and database operations
- E2E tests: Critical user journeys
- Security tests: Authentication and authorization
- Performance tests: Load and stress testing

## 📈 Monitoring & Observability

### Metrics Collection

- Application metrics via Prometheus
- Custom business metrics
- Performance monitoring
- Error tracking and alerting

### Logging

- Structured JSON logging
- Centralized log aggregation with ELK
- Security event logging
- Audit trail maintenance

### Dashboards

- System health dashboard
- Business metrics dashboard
- Security monitoring dashboard
- Investigation analytics dashboard

## 🛠️ Development Workflow

### Git Workflow

1. Create feature branch from `develop`
2. Implement changes with tests
3. Submit pull request with description
4. Code review and approval (2 reviewers)
5. Merge to `develop` via squash merge
6. Deploy to staging for testing
7. Merge to `main` for production release

### Code Standards

- ESLint + Prettier for JavaScript/TypeScript
- Black + isort for Python
- Conventional Commits for commit messages
- Semantic versioning for releases

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Security scan
        run: npm audit

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./scripts/deploy.sh
```

## 📚 Documentation

### Available Documentation

- **User Guide**: Complete user manual with tutorials
- **API Reference**: REST and GraphQL API documentation
- **Plugin Development**: SDK documentation and examples
- **Deployment Guide**: Infrastructure and deployment instructions
- **Security Guide**: Security best practices and compliance
- **Architecture Guide**: System design and technical architecture

### Documentation Build

```bash
# Generate API docs
npm run docs:api

# Build user documentation
npm run docs:build

# Serve documentation locally
npm run docs:serve
```

## 🤝 Contributing

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow the coding standards
- Include tests for new features
- Update documentation as needed
- Ensure security considerations
- Maintain backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Community Support

- **GitHub Issues**: Bug reports and feature requests
- **Discord**: https://discord.gg/intelgraph
- **Stack Overflow**: Tag questions with `intelgraph`

### Enterprise Support

- **Email**: enterprise@intelgraph.com
- **Documentation**: https://docs.intelgraph.com
- **SLA**: 24/7 support with 4-hour response time

---

## 🔧 Packaging for GitHub Commit

To prepare this package for GitHub commit, follow these steps:

### 1. Create Directory Structure

```bash
#!/bin/bash
# Create the complete directory structure
mkdir -p intelgraph-platform/{docs/{erd,api},server/src/{config,models,services,controllers,middleware,routes,graphql/{resolvers,directives},plugins/core,utils,tests/{unit,integration,fixtures}},client/{public,src/{components/{common,auth,graph,investigation,entities,ai,admin},hooks,store/{slices,middleware},services,utils,styles/components,tests/{components,hooks,utils}}},plugins/{sdk/{python/intelgraph_sdk,javascript/{src,types}},examples/{python,javascript},marketplace/submissions},deploy/{docker/{nginx/ssl,postgres/backup,neo4j/plugins},kubernetes/{deployments,services,monitoring},helm/templates,terraform/{modules/{vpc,eks,rds,security},environments/{dev,staging,prod}}},scripts,.github/{workflows,ISSUE_TEMPLATE},tests/{e2e,performance,security},monitoring/{grafana/{dashboards,provisioning},prometheus/{rules,targets},elasticsearch/{mappings,pipelines}}}
```

### 2. Initialize Git Repository

```bash
cd intelgraph-platform
git init
git remote add origin https://github.com/your-org/intelgraph-platform.git
```

### 3. Create Core Files

The artifact contains the complete file structure and content. Copy each section to its respective file according to the directory structure above.

### 4. Commit and Push

```bash
git add .
git commit -m "feat: initial IntelGraph platform implementation

- Complete full-stack architecture with React frontend and Node.js backend
- Neo4j graph database integration with PostgreSQL for metadata
- AI/ML services for link prediction and anomaly detection
- Plugin system with Python and JavaScript SDK
- Enterprise security with RBAC and audit logging
- Kubernetes deployment with Helm charts
- Complete CI/CD pipeline with GitHub Actions
- Comprehensive monitoring and observability setup
- API documentation with OpenAPI and GraphQL schemas
- Terraform infrastructure as code for cloud deployment"

git push -u origin main
```

### 5. Set up GitHub Repository

1. Create repository on GitHub: `intelgraph-platform`
2. Configure branch protection rules for `main` branch
3. Set up GitHub Actions secrets for deployment
4. Enable security scanning and dependency management
5. Configure issue templates and PR templates

### 6. Jira Integration Setup

1. Create Jira project: "IntelGraph Platform"
2. Import epics and stories from `docs/JIRA_SETUP.md`
3. Link GitHub repository to Jira project
4. Configure automatic issue linking in commits

This package provides a complete, production-ready foundation for the IntelGraph platform with all necessary documentation, deployment configurations, and development tools.
