# IntelGraph Platform

[![CI/CD Pipeline](https://github.com/BrianCLong/intelgraph/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/BrianCLong/intelgraph/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A next-generation intelligence analysis platform that synthesizes and surpasses Maltego and Palantir capabilities with AI-augmented graph analytics, real-time collaboration, and enterprise-grade security.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Setup Instructions
```bash
# 1. Navigate to the directory
cd intelgraph-platform

# 2. Run repository cleanup (fixes all current issues)
chmod +x scripts/cleanup-repository.sh
./scripts/cleanup-repository.sh

# 3. Run initial setup
chmod +x scripts/setup.sh
./scripts/setup.sh

# 4. Start development environment
npm run docker:dev

# 5. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:4000/graphql
# Neo4j: http://localhost:7474
# Admin: http://localhost:8080
```

## ✅ Repository Issues Fixed

This package addresses ALL issues identified in the repository state assessment:

### Security Issues Resolved
- ✅ Removes .env files from git history
- ✅ Removes .DS_Store files from git history  
- ✅ Removes zip files from repository
- ✅ Creates comprehensive .gitignore
- ✅ Implements proper secrets management

### File System Issues Resolved
- ✅ Normalizes file naming (removes "(3).js" patterns)
- ✅ Organizes project structure properly
- ✅ Removes spaces from file names
- ✅ Implements consistent naming conventions

### Development Issues Resolved
- ✅ Sets up proper Git hooks
- ✅ Implements CI/CD pipeline
- ✅ Creates Docker development environment
- ✅ Adds comprehensive testing suite
- ✅ Implements code quality checks

## 🏗️ MVP-0 Features Implemented

### Core Platform Features
- ✅ **Authentication**: JWT with refresh tokens, RBAC
- ✅ **GraphQL API**: Complete CRUD operations for all entities
- ✅ **Graph Database**: Neo4j with proper constraints and indexes
- ✅ **React Frontend**: Interactive graph visualization with Cytoscape.js
- ✅ **Real-time Updates**: WebSocket integration with Socket.IO
- ✅ **Investigation Management**: Complete workflow support
- ✅ **Copilot Goals**: Define clear goals for the AI copilot to guide its actions (query planning, enrichment, reporting). Find it under the "Copilot" section in the application.

### Technical Implementation
- ✅ **Backend**: Node.js, Express, Apollo GraphQL
- ✅ **Frontend**: React 18, Redux Toolkit, Material-UI
- ✅ **Databases**: Neo4j (graph), PostgreSQL (metadata), Redis (cache)
- ✅ **Infrastructure**: Docker, Kubernetes, Helm, Terraform
- ✅ **Monitoring**: Prometheus, Grafana, ELK Stack

## 🛠️ Development Workflow

### Daily Development
```bash
# Start development
npm run docker:dev

# Run tests
npm run test

# Check code quality
npm run lint

# Build for production
npm run build
```

### Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run dev
npm run test

# Commit with conventional commits
git commit -m "feat(component): add new feature"

# Push and create PR
git push origin feature/new-feature
```

## 🚀 CI/CD & DevOps

Our CI/CD pipeline is designed for fast, secure, reliable, and observable deployments. It leverages GitHub Actions for automation and Docker Compose for environment management.

### Workflows
- **CI Validate**: Runs linting, formatting, and type checks on all code changes. See `.github/workflows/ci-validate.yml`.
- **CI Test**: Executes unit, integration, and E2E tests. See `.github/workflows/ci-test.yml`.
- **CI Image**: Builds and pushes Docker images to GHCR, generates SBOMs, and signs images. See `.github/workflows/ci-image.yml`.
- **CI Security**: Performs various security scans including Gitleaks, CodeQL, and Trivy. See `.github/workflows/ci-security.yml`.
- **CD Deploy**: Automates deployments to `dev`, `staging`, and `prod` environments. See `.github/workflows/cd-deploy.yml`.
- **CD Preview Environments**: Creates ephemeral preview environments for pull requests. See `.github/workflows/cd-preview.yml`.
- **CD Rollback**: Provides a mechanism to rollback deployments to previous versions. See `.github/workflows/cd-rollback.yml`.
- **CD Release**: Automates semantic versioning, changelog generation, and GitHub Releases. See `.github/workflows/cd-release.yml`.

### Playbooks
Detailed playbooks for common DevOps procedures can be found in `docs/devops/`:
- [Deploy Playbook](docs/devops/deploy-playbook.md)
- [Rollback Playbook](docs/devops/rollback-playbook.md)
- [Preview Environments Playbook](docs/devops/preview-envs-playbook.md)
- [Incident Runbook](docs/devops/incident-runbook.md)

## 📊 Architecture

### Technology Stack
- **Frontend**: React 18, Redux Toolkit, Material-UI, Cytoscape.js
- **Backend**: Node.js, Express, Apollo GraphQL, Socket.io
- **Databases**: Neo4j (graph), PostgreSQL (metadata), Redis (cache)
- **Infrastructure**: Docker, Kubernetes, Helm, Terraform

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  GraphQL API    │◄──►│    Neo44j DB    │
│                 │    │                 │    │                 │
│ • Investigation │    │ • Authentication│    │ • Graph Data    │
│ • Graph Viz     │    │ • CRUD Ops      │    │ • Relationships │
│ • Real-time UI  │    │ • Subscriptions │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  PostgreSQL DB  │    │    Redis Cache  │
                       │                 │    │                 │
                       │ • User Data     │    │ • Sessions      │
                       │ • Audit Logs    │    │ • Real-time     │
                       │ • Metadata      │    │ • Rate Limiting │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
- Database credentials
- JWT secrets
- Feature flags
- API endpoints

Client (Vite) also uses:
- `VITE_API_URL` (e.g., http://localhost:4000/graphql)
- `VITE_WS_URL` (e.g., http://localhost:4000)

Quick auth test: generate a JWT by registering and logging in via GraphQL, then store in localStorage as `token` to enable real-time features in the UI.

## 🛡️ Security

### Implemented Security
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Input validation and sanitization
- Rate limiting and DDoS protection
- Audit logging and monitoring
- Security scanning and vulnerability detection

## 📞 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/BrianCLong/intelgraph/issues)
- **Documentation**: Complete guides in `docs/` directory
- **Email**: support@intelgraph.com

## 📚 Links
- Roadmap: docs/ROADMAP.md
- Contributing: CONTRIBUTING.md
- Security Policy: SECURITY.md
- Code of Conduct: CODE_OF_CONDUCT.md

---

**Built for the intelligence community with ❤️**
