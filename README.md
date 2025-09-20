# IntelGraph Enterprise Intelligence Analysis Platform

[![CI](https://github.com/BrianCLong/summit/actions/workflows/ci.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/ci.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/codeql.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/codeql.yml)
[![Policy](https://github.com/BrianCLong/summit/actions/workflows/conftest.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/conftest.yml)

> **Enterprise-grade AI-augmented intelligence analysis platform with graph analytics, machine learning, and advanced security.**

## 🚀 Quick Start (60 seconds)

```bash
# 1. Install dependencies
make install

# 2. Start development environment
make dev

# 3. Access the platform
open http://localhost:3000  # Web Client
open http://localhost:4000  # API Server
```

## 📋 Prerequisites

- **Node.js** 20+ 
- **pnpm** 9+
- **Docker** & Docker Compose
- **Helm** 3.8+ (for Kubernetes deployment)

## 🏗️ Architecture

IntelGraph is a microservices-based platform built with:

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + GraphQL + Apollo Server
- **Databases**: Neo4j (graph) + PostgreSQL (relational) + Redis (cache)
- **ML/AI**: Python services + TensorFlow/PyTorch
- **Infrastructure**: Kubernetes + Helm + ArgoCD
- **Security**: OPA policies + Cosign signing + RBAC

### Core Services

| Service | Description | Port |
|---------|-------------|------|
| `web-client` | React frontend application | 3000 |
| `api-server` | GraphQL API gateway | 4000 |
| `graph-analytics` | Neo4j graph analysis | 4001 |
| `ml-engine` | Machine learning inference | 4002 |
| `feed-processor` | Data ingestion pipeline | 4003 |
| `search-engine` | Elasticsearch integration | 4004 |
| `workflow-engine` | Business process automation | 4005 |

## 🛠️ Development

### Essential Commands

```bash
# Development
make dev              # Start development environment
make dev-stop         # Stop development environment
make dev-logs         # View logs

# Testing & Quality
make test             # Run all tests
make test-changed     # Test only changed packages
make lint             # Run ESLint
make typecheck        # TypeScript checking
make security         # Security scans

# Build & Deploy
make build            # Production build
make helm-template    # Generate K8s manifests
make policy-test      # Test OPA policies

# Utilities
make help             # Show all commands
make check-tools      # Verify tool installation
make status           # Show environment status
```

## 🧪 Testing

The platform includes comprehensive testing:

- **Unit Tests**: Jest + Testing Library
- **Integration Tests**: Supertest + GraphQL
- **E2E Tests**: Playwright
- **Performance Tests**: K6
- **Security Tests**: OWASP ZAP + Trivy
- **Policy Tests**: Conftest + OPA

```bash
# Run specific test suites
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests
pnpm test:e2e         # End-to-end tests
pnpm test:security    # Security testing
```

## 🔒 Security

Security is built into every layer:

- **Authentication**: OIDC + JWT + RBAC
- **Authorization**: Fine-grained permissions + OPA policies
- **Data Protection**: Encryption at rest + in transit
- **Compliance**: SOC2 + FedRAMP + GDPR ready
- **Supply Chain**: Signed containers + SBOM generation

### Security Scanning

```bash
make security         # Run security scans
trivy fs .           # Filesystem vulnerability scan
pnpm audit           # Dependency vulnerability scan
```

## 🚀 Deployment

### Local Development

```bash
make dev              # Docker Compose stack
```

### Kubernetes (Recommended)

```bash
# Deploy to development
kubectl apply -f infra/helm/intelgraph/values-dev.yaml

# Deploy to production (requires approval)
make deploy-prod
```

### Environment Configuration

| Environment | Endpoint | Database | Features |
|-------------|----------|----------|----------|
| **Development** | `localhost:3000` | Local Docker | All features, debug enabled |
| **Staging** | `stage.intelgraph.com` | Managed services | Production-like, synthetic tests |
| **Production** | `intelgraph.com` | Enterprise databases | High availability, monitoring |

## 📊 Monitoring & Observability

- **Metrics**: Prometheus + Grafana dashboards
- **Tracing**: OpenTelemetry + Jaeger
- **Logging**: Structured JSON logs + correlation IDs
- **Alerting**: SLO-based alerts + PagerDuty integration
- **Health Checks**: `/health` endpoints + liveness probes

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** using conventional commits: `git commit -m "feat: add amazing feature"`
4. **Test** your changes: `make test lint typecheck security`
5. **Push** to your branch: `git push origin feature/amazing-feature`
6. **Open** a Pull Request

### Development Workflow

- All PRs require **CI checks** to pass (tests, linting, security)
- Code must pass **OPA policy validation**
- Documentation must be updated for new features
- **CODEOWNERS** approval required for sensitive areas

## 📚 Documentation

- **API Docs**: `/docs/api` - GraphQL schema + REST endpoints
- **Architecture**: `/docs/architecture` - System design + patterns
- **Deployment**: `/docs/deployment` - Kubernetes + Helm guides
- **Security**: `/docs/security` - Policies + compliance
- **Runbooks**: `/docs/runbooks` - Operations + troubleshooting

## 🏷️ Releases

Releases follow [Semantic Versioning](https://semver.org/):

- **Patch** (`v1.0.1`): Bug fixes, security patches
- **Minor** (`v1.1.0`): New features, backward compatible
- **Major** (`v2.0.0`): Breaking changes

### Release Process

1. **Release Candidate**: Automatic via `release` workflow
2. **Testing**: Comprehensive validation on staging
3. **Approval**: Manual approval for production deployment
4. **Deployment**: Canary rollout (10% → 50% → 100%)
5. **Monitoring**: SLO monitoring + rollback if needed

## 📈 Performance

- **API Response Time**: p95 < 350ms
- **Graph Query Performance**: p95 < 1.5s for complex queries
- **UI Load Time**: First Contentful Paint < 1.2s
- **Availability**: 99.9% uptime SLA
- **Scalability**: Auto-scaling based on CPU/memory metrics

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/BrianCLong/summit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BrianCLong/summit/discussions)
- **Security**: [Security Policy](SECURITY.md)
- **Documentation**: [docs-site/](./docs-site)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the IntelGraph Team**

*Enterprise intelligence analysis for the modern world.*
