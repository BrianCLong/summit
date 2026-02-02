# Summit Platform Onboarding Guide

Welcome to the Summit Intelligence Analysis Platform! This guide will help you get productive quickly in this large, complex codebase.

**Last Updated:** 2026-01-20
**Maintainer:** Engineering Team

---

## 🎯 Quick Start (30 Minutes)

### Prerequisites Checklist

- [ ] **Node.js 22+** (`node --version`) - Install via [nvm](https://github.com/nvm-sh/nvm) using `.nvmrc`
- [ ] **pnpm 10+** (`pnpm --version`) - Install: `npm install -g pnpm@10`
- [ ] **Python 3.11+** (`python3 --version`) - For ML services
- [ ] **Docker & Docker Compose** - For local services (Neo4j, Postgres, Redis)
- [ ] **Git** - Obviously :)
- [ ] **AWS CLI** (optional) - For cloud deployments
- [ ] **kubectl & helm** (optional) - For Kubernetes operations

### 1. Clone and Install (5 min)

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Install dependencies (this may take 5-10 minutes)
pnpm install --frozen-lockfile

# Verify installation
pnpm typecheck  # Should pass
pnpm lint       # Should pass
```

### 2. Start Local Services (5 min)

```bash
# Start Neo4j, Postgres, Redis via Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# neo4j        running   0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
# postgres     running   0.0.0.0:5432->5432/tcp
# redis        running   0.0.0.0:6379->6379/tcp
```

### 3. Configure Environment (5 min)

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your local credentials
# Minimum required:
# - NEO4J_PASSWORD (default: change_me_in_dev)
# - SESSION_SECRET (generate random string)

# Optional: Add AI provider keys for testing
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
```

### 4. Run Database Migrations (5 min)

```bash
# Run Postgres migrations
pnpm db:pg:migrate

# Run Neo4j migrations
pnpm db:neo4j:migrate

# Verify databases
psql -h localhost -U summit_user summit_dev -c "SELECT count(*) FROM migrations;"
```

### 5. Start Development Servers (5 min)

```bash
# Option 1: Start all services concurrently
pnpm dev

# Option 2: Start server and client separately
# Terminal 1:
cd server && pnpm dev

# Terminal 2:
cd client && pnpm dev

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:4000
# - Neo4j Browser: http://localhost:7474
# - GraphQL Playground: http://localhost:4000/graphql
```

### 6. Verify Installation (5 min)

```bash
# Run smoke tests
pnpm test:smoke

# Expected output: All tests pass

# Open browser and verify:
# 1. Navigate to http://localhost:3000
# 2. You should see the Summit Platform login/dashboard
# 3. Check browser console for errors (should be clean)
```

✅ **Success!** You now have a working local development environment.

---

## 📚 Codebase Architecture (Understand in 15 Minutes)

### Repository Structure

This is a **pnpm workspace monorepo** with 844+ packages/apps/services. Don't panic! Here's what matters:

```
summit/
├── apps/                   # 34 deployable applications
│   ├── web/                # 🟢 MAIN FRONTEND (React, start here)
│   ├── api/                # 🟢 CORE API GATEWAY (Express + GraphQL)
│   ├── gateway/            # API gateway with RBAC
│   ├── ml-engine/          # ML model serving
│   ├── switchboard-web/    # HITL console (experimental)
│   └── ...                 # 29 other apps
│
├── server/                 # 🟢 CORE BACKEND MONOLITH (Node.js/TypeScript)
│   ├── src/
│   │   ├── maestro/        # Agent orchestration runtime
│   │   ├── conductor/      # Agent coordination (⚠️ has TODOs)
│   │   ├── graphql/        # GraphQL resolvers
│   │   ├── services/       # Business logic
│   │   ├── auth/           # Authentication/AuthZ
│   │   ├── intel/          # Intelligence analysis modules
│   │   ├── graph/          # Neo4j graph operations
│   │   └── ...             # 220+ more subdirectories
│   └── tests/              # 533 test files
│
├── packages/               # 380+ shared libraries (NPM packages)
│   ├── maestro-*/          # Agent SDK
│   ├── prov-ledger*/       # Provenance/audit logging
│   ├── graph-*/            # Graph analytics
│   ├── work-graph/         # Project/task management
│   └── ...                 # 370+ more packages
│
├── terraform/              # Infrastructure as Code (AWS EKS)
│   └── environments/prod/  # Production Terraform configs
│
├── charts/                 # 36 Helm charts (Kubernetes)
│   ├── universal-app/      # Standard microservice chart
│   ├── maestro/            # Agent runtime deployment
│   └── neo4j/              # Graph database StatefulSet
│
├── scripts/                # 200+ operational scripts
│   ├── ci/                 # CI validation scripts
│   ├── evidence/           # Compliance evidence generation
│   └── cluster-bootstrap.sh # K8s Day 1 setup
│
├── .github/workflows/      # 138 CI/CD workflows
│   ├── ci-core.yml         # 🟢 PRIMARY GATE (blocks PRs)
│   ├── ci-security.yml     # Security scans
│   └── deploy-aws.yml      # Automated deployment
│
├── docs/                   # Documentation
│   ├── runbooks/           # Operational procedures
│   ├── governance/         # Compliance artifacts
│   └── AWS_DEPLOYMENT.md   # Infrastructure guide
│
└── TECHNICAL_AUDIT_REPORT_2026-01-20.md  # 🟢 READ THIS FIRST!
```

### Key Concepts

**1. Tech Stack:**
- **Frontend:** React + TypeScript + Material-UI + Zustand
- **Backend:** Node.js + Express + Apollo GraphQL + Prisma ORM
- **Databases:** Neo4j (graph), PostgreSQL (relational), Redis (cache/queue)
- **AI/ML:** Python + PyTorch + FastAPI + HuggingFace Transformers
- **Infrastructure:** AWS EKS + Terraform + Helm
- **CI/CD:** GitHub Actions (138 workflows)

**2. Monorepo Management:**
- **Package Manager:** pnpm (NOT npm or yarn)
- **Workspaces:** `packages/*`, `apps/*`, `server`, `client`
- **Install:** Always use `pnpm install --frozen-lockfile` (respects lockfile)
- **Scripts:** Run from root: `pnpm <script>` or `pnpm --filter <package> <script>`

**3. Agent System (Core Feature):**
- **Maestro:** Agent orchestration engine (`server/src/maestro/`)
- **Conductor:** Agent coordination and validation (`server/src/conductor/`)
- **Policy Engine:** OPA integration for governance (`server/src/policies/`)
- **Provenance Ledger:** Immutable audit log (`packages/prov-ledger*/`)
- **⚠️ Current Status:** Epic 1 (Glass Box Governance) in progress, ~60% complete

**4. Data Flow:**
```
User → Frontend (apps/web)
     → API Gateway (apps/api)
     → GraphQL Resolvers (server/src/graphql)
     → Business Logic (server/src/services)
     → Databases (Neo4j + Postgres + Redis)
```

**5. Agent Task Flow:**
```
Agent Task Submitted
     → Maestro (server/src/maestro/MaestroService.ts)
     → Policy Check (OPA)
     → Execute or PENDING_APPROVAL
     → Conductor Validation (⚠️ currently stubbed)
     → Provenance Logging
     → Completion or Error
```

---

## 🧭 Your First Task (30-60 Minutes)

### Beginner: Fix a TODO

1. Find a TODO in a subsystem you're interested in:
   ```bash
   rg "TODO" server/src/graphql --type ts | head -10
   ```

2. Pick one that looks approachable (e.g., "TODO: Add input validation")

3. Read surrounding code to understand context

4. Implement the fix

5. Write a test:
   ```bash
   # Create test file next to implementation
   touch server/src/graphql/__tests__/myFeature.test.ts
   ```

6. Run tests:
   ```bash
   pnpm test:unit
   ```

7. Commit with conventional commit format:
   ```bash
   git commit -m "fix(graphql): implement TODO for input validation

   - Add Joi schema for request validation
   - Add test coverage
   - Fixes: TOD-123"
   ```

### Intermediate: Add a Feature

1. Read the [ROADMAP.md](./ROADMAP.md) to understand current priorities

2. Pick a story from Epic 1 or Epic 2

3. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

4. Implement the feature following existing patterns

5. Write comprehensive tests (unit + integration)

6. Update documentation

7. Open a PR with detailed description

### Advanced: Debug a Production Issue

1. Check [RUNBOOKS/](./RUNBOOKS/) for common issues

2. Access logs:
   ```bash
   kubectl logs -f deployment/summit-api -n production
   ```

3. Use observability tools:
   - Grafana: http://grafana.summit.ai
   - Prometheus: http://prometheus.summit.ai

4. Reproduce locally using production data (sanitized)

5. Fix and add regression test

6. Follow incident response playbook

---

## 🔧 Common Development Tasks

### Running Tests

```bash
# All tests (slow, ~10 min)
pnpm test

# Unit tests only (fast, ~2 min)
pnpm test:unit

# Integration tests (medium, ~5 min)
pnpm test:integration

# E2E tests (slow, ~15 min)
pnpm test:e2e

# Specific test file
pnpm test server/src/maestro/__tests__/MaestroService.test.ts

# Watch mode (re-run on file change)
pnpm test --watch
```

### Linting and Formatting

```bash
# Lint all files
pnpm lint

# Fix lint errors automatically
pnpm lint --fix

# Format code
pnpm format

# Typecheck
pnpm typecheck
```

### Database Operations

```bash
# Postgres migrations
pnpm db:pg:migrate          # Run pending migrations
pnpm db:pg:rollback         # Rollback last migration
pnpm db:pg:status           # Show migration status

# Neo4j migrations
pnpm db:neo4j:migrate

# Reset databases (⚠️ DESTRUCTIVE)
pnpm db:reset

# Seed test data
pnpm db:seed
```

### Building

```bash
# Build all workspaces
pnpm build

# Build specific package
pnpm --filter @summit/maestro-core build

# Build for production
NODE_ENV=production pnpm build
```

### Debugging

```bash
# Run server in debug mode
node --inspect server/dist/index.js

# Attach VS Code debugger (F5)
# Use launch.json configuration: "Attach to Node"

# Debug tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📖 Essential Reading

**Read First (Priority Order):**
1. [TECHNICAL_AUDIT_REPORT_2026-01-20.md](./TECHNICAL_AUDIT_REPORT_2026-01-20.md) - Comprehensive repo analysis
2. [ROADMAP.md](./ROADMAP.md) - Current priorities (Epic 1 & 2)
3. [SECURITY.md](./SECURITY.md) - Security policies and threat model
4. [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
5. [docs/governance/](./docs/governance/) - Governance and compliance

**Architecture Docs:**
- [docs/AWS_DEPLOYMENT.md](./docs/AWS_DEPLOYMENT.md) - Infrastructure setup
- [infra/README.md](./infra/README.md) - DevOps guide
- [ARCHITECTURE_MAP.generated.yaml](./ARCHITECTURE_MAP.generated.yaml) - System map

**Operational Docs:**
- [docs/runbooks/](./docs/runbooks/) - Emergency procedures
- [RUNBOOKS/](./RUNBOOKS/) - Common operational tasks
- [SECURITY/cve-exceptions.md](./SECURITY/cve-exceptions.md) - CVE risk assessment

---

## 🚧 Known Issues & Gotchas

### 🔴 CRITICAL: Semantic Validator Stubs

**Location:** `server/src/conductor/validation/semantic-validator.ts:100-305`

**Issue:** All validation methods return `0.0` (no actual validation occurs)

**Impact:** Agent prompt injection attacks are NOT prevented

**What to do:**
- Feature flag `SEMANTIC_VALIDATION_ENABLED` is set to `false` by default (safe)
- **DO NOT** enable in production
- See audit report for full details

### ⚠️ High TODO/Technical Debt Count

- **2,004 TODO/FIXME markers** across codebase
- **3,375 stub implementations**
- Hotspots: `server/src/conductor/` (53 TODOs), `server/src/services/` (39 TODOs)
- **What to do:** Pick low-hanging fruit, create Jira tickets for larger work

### ⚠️ 409 Remote Branches

- Extremely high branch count (234 from AI agents)
- Risk of merge conflicts
- **What to do:** Branch lifecycle policy now automated (deletes after 30 days)

### ⚠️ 226 Dependabot Vulnerabilities

- 1 CRITICAL, 155 HIGH, 18 MODERATE, 52 LOW
- 4 CVEs explicitly ignored (requires investigation)
- **What to do:** See [SECURITY/cve-exceptions.md](./SECURITY/cve-exceptions.md)

---

## 🆘 Getting Help

### Internal Resources

- **Slack:** #summit-dev (development questions)
- **Slack:** #summit-oncall (production issues)
- **GitHub Issues:** Tag with `help-wanted` or `question`
- **Documentation:** Search `docs/` directory first
- **Technical Debt:** See [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) (coming soon)

### External Resources

- **Neo4j Docs:** https://neo4j.com/docs/
- **React Docs:** https://react.dev/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **AWS EKS Guide:** https://docs.aws.amazon.com/eks/

### Emergency Contacts

- **On-Call Engineer:** Check PagerDuty rotation
- **Security Issues:** security@summit.ai (24/7)
- **Infrastructure Issues:** ops@summit.ai

---

## ✅ Onboarding Checklist

Track your progress:

- [ ] Completed Quick Start (30 min)
- [ ] Read Technical Audit Report
- [ ] Understood codebase architecture
- [ ] Can run tests locally
- [ ] Can start dev servers
- [ ] Completed first TODO fix
- [ ] Opened first PR
- [ ] PR reviewed and merged
- [ ] Read ROADMAP.md and understand current priorities
- [ ] Know where to find runbooks and documentation
- [ ] Added to Slack channels (#summit-dev, #summit-oncall)
- [ ] Set up AWS CLI and kubectl (if doing infra work)
- [ ] Completed security training (SECURITY.md)
- [ ] Know how to access production logs and metrics

---

**Welcome to the team! 🚀**

Questions? Reach out in #summit-dev or tag @engineering-team in GitHub issues.
