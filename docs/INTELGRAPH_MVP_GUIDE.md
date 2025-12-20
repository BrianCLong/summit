# 🚀 Master Prompt: IntelGraph Supercharged MVP Development

> **IntelGraph** is a production-ready AI-augmented intelligence analysis platform.
> **Current Status: MVP-0 Complete, MVP-1 In Progress**
>
> Our core philosophy: **1) Always keep a working, deployable build** (smoke tests must pass).
> **2) Accelerate MVP feature delivery** with enterprise-grade quality.
> **3) Ship production-ready code with comprehensive testing, observability, and security.**

## 🎯 Current Production Status

✅ **PRODUCTION READY** - All MVP-0 features complete and validated

- ✅ Complete development environment with health checks
- ✅ Postgres persistence for Copilot runs/tasks/events
- ✅ CSV + STIX/TAXII data ingestion pipeline
- ✅ OPA security policies with 150+ test cases
- ✅ OpenTelemetry observability and Prometheus metrics
- ✅ Graph Performance Mode (10k+ nodes)
- ✅ Golden Path Wizard and Enhanced Copilot Panel
- ✅ Comprehensive smoke testing suite

## 🔥 Core Development Principles

### 1. **Deployability First (Non-Negotiable)**

```bash
# Every feature must pass these gates:
make up                    # ✅ Environment starts cleanly
make smoke                 # ✅ Full golden path works
node scripts/smoke-test-simple.js  # ✅ Quick validation
```

**Never merge if:**

- Docker Compose fails to start
- Smoke tests fail (0% tolerance)
- Golden path breaks (investigation → entities → Copilot → results)
- Health checks fail or timeout

### 2. **Feature Velocity (Ship Fast, Ship Right)**

**MVP-1 Priority Stack** (High → Medium → Low):

```
🔥 HIGH (Production Blockers):
  - Security scanning (Gitleaks, Trivy) in CI
  - Backup/disaster recovery procedures
  - Performance testing and optimization
  - OTLP exporter configuration

⚡ MEDIUM (Value Multipliers):
  - Redis Streams event replay
  - Advanced graph clustering algorithms
  - OSINT API connectors (Shodan, VirusTotal)
  - Temporal analysis and timeline views

🎯 LOW (Future Scale):
  - GNN link prediction models
  - Federated graph queries
  - Advanced AI analytics pipeline
```

**MVP-2+ Stretch Goals** (Don't block MVP-1):

- Multi-modal AI analysis (text, images, documents)
- Real-time collaborative investigations
- Advanced threat hunting workflows
- Enterprise SSO integration

### 3. **Production-Grade Code Standards**

**Architecture Requirements:**

- ✅ **Observability**: Every new API emits OpenTelemetry spans + Prometheus metrics
- ✅ **Security**: All operations go through OPA policy engine
- ✅ **Performance**: Handle 10k+ graph nodes smoothly
- ✅ **Reliability**: Graceful degradation and error recovery
- ✅ **Testing**: Unit + integration + smoke test coverage

**Code Quality Gates:**

```bash
# Before any commit:
npm run lint               # ESLint + Prettier
npm run typecheck          # TypeScript validation
npm run test               # Unit tests
make smoke                 # Integration validation

# Conventional commits required:
feat(copilot): add event replay capability
fix(graph): resolve clustering performance issue
docs(api): update GraphQL schema documentation
```

### 4. **CI/CD Production Alignment**

**Required for every PR:**

- ✅ All smoke tests pass (blocking)
- ✅ Security scans clean (no high severity)
- ✅ Performance benchmarks stable
- ✅ Documentation updated
- ✅ Metrics/tracing instrumented

**Infrastructure as Code:**

```bash
# Keep these updated:
.env.example               # New configuration options
docker-compose.dev.yml     # Service dependencies
scripts/smoke-test.js      # Feature validation
monitoring/grafana-dashboard.json  # New metrics
server/policies/           # Security policies
```

### 5. **Developer Experience Excellence**

**30-Second Start:**

```bash
git clone https://github.com/BrianCLong/summit.git
cd intelgraph && cp .env.example .env
make up                    # Full environment in Docker
make smoke                 # Verify everything works
# ✅ Ready to code!
```

**Development Loop:**

```bash
# Daily workflow:
make up                    # Start services
npm run dev               # Hot reload development
make smoke                # Validate changes
git commit -m "feat: ..."  # Ship when ready
```

## 🎯 Acceptance Criteria (Definition of Done)

### For Every Feature:

- ✅ **Deployable**: `make up && make smoke` passes
- ✅ **Observable**: Metrics + tracing instrumented
- ✅ **Secure**: OPA policies cover new operations
- ✅ **Performant**: No degradation in smoke test timings
- ✅ **Documented**: README, API docs, troubleshooting updated
- ✅ **Tested**: Unit tests + integration + golden path coverage

### For Every Release:

- ✅ **Security**: Gitleaks + Trivy scans clean
- ✅ **Performance**: Load testing on 10k+ node graphs
- ✅ **Reliability**: Disaster recovery procedures tested
- ✅ **Monitoring**: Grafana alerts configured
- ✅ **Compliance**: Audit logs and RBAC verified

## 🔧 Enhanced Command Arsenal

```bash
# Environment Management
make up                    # Start all services with health checks
make down                  # Graceful shutdown
make logs                  # Tail service logs
make seed                  # Load demo investigation data
make clean                 # Reset to clean state

# Testing & Validation
make smoke                 # Full golden path validation
node scripts/smoke-test-simple.js  # Quick infrastructure check
npm run test               # Unit test suite
npm run test:e2e           # End-to-end tests
opa test server/policies/  # Security policy validation

# Code Quality
npm run lint               # ESLint + Prettier
npm run typecheck          # TypeScript validation
npm run audit              # Security vulnerability scan
npm run coverage           # Test coverage report

# Production Preparation
python scripts/create-github-issues.py  # Generate MVP-1 tickets
python scripts/preview-github-issues.py # Preview without token
docker compose -f docker-compose.prod.yml up  # Production build
curl http://localhost:9090/metrics      # Verify metrics export
```

## 🚦 Development Flow

### 1. **Feature Planning**

```bash
# Check current production state
make smoke                 # Baseline: everything works

# Plan feature with issues
python scripts/preview-github-issues.py  # See MVP-1 roadmap
```

### 2. **Development Cycle**

```bash
# Start feature branch
git checkout -b feat/new-capability
make up                    # Ensure clean environment

# Develop with hot reload
npm run dev                # Backend + frontend

# Validate frequently
make smoke                 # Verify no regressions
```

### 3. **Production Readiness**

```bash
# Pre-commit validation
npm run lint && npm run typecheck && npm run test
make smoke                 # Full integration test

# Security validation
opa test server/policies/  # Policy compliance
npm audit                  # Dependency security

# Performance validation
# (Load test with production data volumes)
```

## 🎪 Advanced Features Ready

**AI & Analytics:**

- Graph Neural Networks for link prediction
- Community detection clustering
- Anomaly detection in network patterns
- Multi-modal content analysis

**Enterprise Integration:**

- OSINT API connectors (Shodan, VirusTotal, etc.)
- STIX/TAXII federation
- Enterprise SSO (SAML/OIDC)
- Advanced audit and compliance

**Scale & Performance:**

- Federated graph queries
- Temporal graph analysis
- Real-time collaborative editing
- WebGL graph rendering

## 🌟 Developer Mantra

> **"Work ambitiously, ship fast, but never break deployability."**

**Every contribution should:**

1. 🎯 **Add significant user value** (move MVP forward)
2. 🛡️ **Maintain production quality** (security, performance, reliability)
3. 🚀 **Keep deployment simple** (smoke tests always pass)
4. 📊 **Include observability** (metrics, logs, traces)
5. 📚 **Update documentation** (README, API docs, troubleshooting)

---

## 🆘 Troubleshooting

**Common Issues:**

```bash
# Services won't start
make down && make clean && make up

# Smoke tests failing
docker compose logs        # Check service health
make seed                  # Reload demo data

# Performance issues
curl localhost:9090/metrics # Check resource usage
```

**Getting Help:**

- 📖 **Documentation**: Complete guides in `docs/`
- 🧪 **Smoke Tests**: Built-in validation and diagnostics
- 🎫 **Issues**: [GitHub Issues](https://github.com/brianlong/intelgraph/issues)
- 💬 **Discussions**: Team chat or GitHub Discussions

---

**Remember: IntelGraph is production-ready NOW. Every change should maintain that standard while pushing capabilities forward.**
