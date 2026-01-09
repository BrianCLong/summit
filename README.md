# Summit (IntelGraph)

Enterprise Intelligence Platform: graph analytics, real-time collaboration, and AI-driven insights for high-stakes environments.

## NEW in v2.0.0 (December 2025)

Summit v2.0.0 consolidates major platform capabilities (infrastructure, AI/ML, security hardening, real-time systems).  
See: Release Notes | Migration Guide | Roadmap.

---

## Quickstart (Golden Path)

Prerequisites: Docker Desktop ≥ 4.x, Node.js 20.11.0 (matches `.tool-versions`), pnpm 9, Python 3.11+.

```bash
# 1) Clone & Bootstrap
git clone https://github.com/BrianCLong/summit.git
cd summit
make bootstrap

# 2) Start the Stack (Docker)
make up

# 3) Verify (Smoke Test)
make smoke
```

### GA Gate (Pre-Flight)

Before submitting PRs or deploying:

```bash
make ga
```

This runs the enforced readiness sequence:

1. Lint & unit tests
2. Clean environment reset
3. Deep health checks
4. End-to-end smoke tests
5. Security scanning

### Release Readiness Artifacts

- **GA Checklist:** `docs/release/GA_CHECKLIST.md` (operator runbook for build, test, security, and rollback)
- **Readiness Report:** `docs/release/GA_READINESS_REPORT.md` (current go/no-go posture and remaining actions)
- **Evidence Index:** `docs/release/GA_EVIDENCE_INDEX.md` (commands run with logs and artifact pointers)
- **Assessor Walkthrough**: `docs/review-pack/WALKTHROUGH.md` (step-by-step guide for external reviewers)

---

## Assessor Dry-Run

To ensure a smooth and reproducible experience for external assessors, this repository includes an automated "dry-run" process. This process, executed via GitHub Actions, follows the `docs/review-pack/WALKTHROUGH.md` to produce a rehearsal bundle.

This helps identify and fix friction points, such as missing prerequisites or ambiguous commands, before an external review.

---

## Service Endpoints (Local)

- Frontend: [http://localhost:3000](http://localhost:3000)
- GraphQL API: [http://localhost:4000/graphql](http://localhost:4000/graphql)
- Neo4j Browser: [http://localhost:7474](http://localhost:7474) (User: `neo4j`, Pass: `devpassword`)
- Adminer: [http://localhost:8080](http://localhost:8080)
- Grafana: [http://localhost:3001](http://localhost:3001)

---

## Architecture (System View)

Summit is built on a modern distributed stack designed for scalability and auditability:

- Frontend: React 18, Vite, Material-UI (`client/`)
- Backend: Node.js, Express, Apollo GraphQL (`backend/`, `api/`)
- Data Layer:
  - Neo4j (graph relationships)
  - PostgreSQL (structured data, audit logs, vectors/embeddings)
  - TimescaleDB (telemetry and metrics)
  - Redis (caching, rate limiting, real-time Pub/Sub)

- Orchestration: Maestro (BullMQ) for background jobs and AI pipelines (`.maestro/`)

See also:

- docs/ARCHITECTURE.md

---

## Repo Map (Where Things Live)

This repository is a large monorepo containing:

1. **Platform Runtime**
   - `client/` — Primary user-facing UI
   - `conductor-ui/` — Admin/Ops UI
   - `backend/` — API runtime services
   - `api/`, `apis/`, `api-schemas/` — API surfaces, schemas, contracts
   - `cli/` — Operator/developer CLI tooling
   - `.maestro/`, `.orchestrator/` — job orchestration, pipelines, worker controls
   - `compose/`, `charts/`, `config/`, `configs/` — infra, deployment & configuration

2. **Governance, Security, Operations**
   - `RUNBOOKS/` — incident playbooks, operational procedures
   - `SECURITY/`, `.security/` — security policies & automation scaffolding
   - `compliance/` — compliance controls and mapping artifacts
   - `audit/` — audit readiness artifacts and evidence workflows
   - `.ci/`, `ci/`, `.ga-check/`, `.github/` — CI and GA readiness gates
   - `__tests__/`, `__mocks__/`, `GOLDEN/ datasets`, `.evidence/` — tests, fixtures, evidence

3. **Agentic Development Tooling**
   - `.agentic-prompts/`, `.agent-guidance/` — standardized prompts and guidance
   - `.claude/`, `.gemini/`, `.jules/`, `.qwen/` — per-agent workflows and configuration
   - `.devcontainer/` — standardized dev environment

4. **AI/ML and Domain Modules**
   - `ai-ml-suite/` plus multiple domain modules (e.g., `cognitive-*`, `active-measures-module/`, etc.)

---

## CI & Quality Gates

Our CI pipeline ("Fast Lane") enforces:

1. Lint (ESLint + Ruff)
2. Verify (deterministic GA verification for critical features)
3. Test (unit/integration)
4. Golden Path (full-stack integration via `make smoke`)
5. Security (SAST, dependency scanning, secret detection)

See: TESTING.md

---

## Contributing

- Follow the Golden Path and GA Gate requirements.
- Prefer small, reviewable PRs with explicit scope.
- If the build breaks, stop and fix it: the Golden Path is enforced.

See:

- CONTRIBUTING.md
- docs/ONBOARDING.md

---

## License

Summit Enterprise Edition: Proprietary (see LICENSE).
Historical Open Source: MIT (see OSS-MIT-LICENSE).
