# AGENTS.md - AI Coding Agent Instructions

> **Standard Format**: This file follows the [AGENTS.md](https://agents.md) open format for guiding
> coding agents. **Supported By**: OpenAI Codex, Google Jules, Amp, Cursor, Factory, and other AI
> coding assistants. **Last Updated**: 2025-12-03
> **⚠️ GOVERNANCE NOTICE:**
> All agents and contributors must adhere to the [Constitution of the Ecosystem](docs/governance/CONSTITUTION.md).
> This document defines the technical standards mandated by the **Law of Consistency**.

## CORE OPERATING RULE

**Never defend the past. Only assert the present and dictate the future.**

1.  **Escalate Before Anyone Asks**: Preempt scrutiny by referencing the [Summit Readiness Assertion](docs/SUMMIT_READINESS_ASSERTION.md).
2.  **Turn Exceptions Into Assets**: Rebrand legacy bypasses as "Governed Exceptions".
3.  **Force Alignment**: Require all artifacts to use the same definitions and authority files.
4.  **Move the Fight to Paper**: Cite files, not opinions.
5.  **Compress the Timeline**: Shorten feedback loops.
6.  **Never Admit Uncertainty**: Use "Deferred pending X" or "Intentionally constrained".
7.  **End Every Interaction With Finality**: Leave no open ends.

## Scope & Precedence

This file governs agent behavior across the repository. If any instruction conflicts, follow this
order:

1. `docs/SUMMIT_READINESS_ASSERTION.md` (Absolute Readiness)
2. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
3. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
4. This file
5. Local `AGENTS.md` files and directory README instructions

## Governance & Compliance

- **Authority:** This repository is governed by the [Meta-Governance Framework](docs/governance/META_GOVERNANCE.md).
- **Mandates:** See [Agent Mandates](docs/governance/AGENT_MANDATES.md) for role-specific powers and limits.
- **Rulebook:** The [Living Rulebook](docs/governance/RULEBOOK.md) contains the full index of laws and standards.
- **GA Hardening Contract:** Agents must honor the machine-readable contract in [`agent-contract.json`](agent-contract.json) and the Golden Path guardrails described in `docs/ga/TESTING-STRATEGY.md` and `docs/ga/LEGACY-MODE.md`. New GA-critical work must carry Tier A/B/C verification before merge.

## Agent Roles & Permissions

### Role: Jules (Release Captain)

- **Permissions**:
  - Full read/write access to repository.
  - Can modify CI/CD workflows.
  - Can merge PRs (if checks pass).
  - Can create release artifacts.
- **Stop Conditions**:
  - CI failure in `main`.
  - Detection of PII in output.
  - Sandbox violation alert.
- **Escalation**:
  - Notify `security-council` on policy violations.
  - Notify `devops` on persistent CI failures.

### Role: Codex (Implementation & Engineering)

- **Permissions**:
  - Implement features and fixes in scope with tests and documentation.
  - Update `docs/` and markdown to reflect changes.
- **Stop Conditions**:
  - Generated documentation contradicts code (detected via drift check).

## Regulatory & Ethics Operating Constraints (Non-Negotiable)

All agents operating in this repository MUST comply with the following:

### Forbidden Actions

- Drafting or suggesting private regulatory language
- Proposing quid-pro-quo or preferential treatment
- Creating undocumented regulator interaction flows
- Adding compliance logic outside the policy engine

### Required Actions

- Express all regulatory logic as policy-as-code
- Log all decisions requiring compliance or ethics review
- Escalate ambiguity to governance, not workaround it
- Prefer public standards over proprietary rules

### Canonical Rule

If a regulatory requirement cannot be expressed as policy-as-code,
the implementation is considered incomplete.

### Enforcement

Violations are treated as build-blocking defects, not stylistic issues.

## Project Structure & Module Organization

## Project Overview

**Summit/IntelGraph** is a next-generation intelligence analysis platform with AI-augmented graph
analytics designed for the intelligence community.

## Agent Quality Charter (Summit Stack)

The following principles translate the CLAUDE.md guidance into Summit's TypeScript-first stack.
They are **enforceable** and apply to all code under this repository.

1. **Core Principles**
   - Optimize for asymptotic performance and memory: avoid redundant allocations, duplicated work,
     and unnecessary abstractions; prefer linear-time operations and short hot paths.
   - Eliminate technical debt: remove dead/debug code, keep interfaces minimal, and refactor
     repetitive logic before merging.
   - If a change is not demonstrably efficient, perform another optimization pass before request for
     review.

2. **Error Handling Rules**
   - TypeScript/Node: do not silently catch errors or use untyped `any` without justification;
     surface contextual errors with actionable messages; use typed error boundaries or Result-like
     helpers where available.
   - Rust (Cargo workspaces present): never rely on `.unwrap()`/`.expect()` in production paths;
     return `Result` with `anyhow`/`thiserror` patterns and propagate meaningful context.
   - Python utilities: avoid bare `except`; raise typed exceptions with explicit remediation notes;
     never swallow errors via `pass`.

3. **Code Style & Formatting**
   - Use meaningful, consistent names; keep line lengths reasonable for readability; avoid emoji and
     commented-out code or debug prints.
   - Adhere to Prettier/Biome-style formatting and eslint rules; prefer typed interfaces over
     structural `any`.

4. **Testing Expectations**
   - Add unit tests for new logic and mock external dependencies; follow Arrange-Act-Assert and do
     not skip/comment out tests.
   - Keep golden-path smoke tests (`make smoke`) green; include regression tests when fixing bugs.

5. **Security Basics**
   - Never commit secrets; keep `.env` files git-ignored; avoid logging tokens/PII; favor
     environment variables for configuration.
   - Validate inputs and prefer least-privilege defaults in new services or scripts.

6. **Before Merging Checklist**
   - Run: `pnpm lint` (treat warnings as blockers; prefer `--max-warnings=0` for touched files),
     `pnpm format:check`, `pnpm typecheck`, `pnpm test` (or scoped equivalents), and `make smoke`
     when touching golden-path surfaces.
   - Rust crates: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`.
   - Python utilities: `ruff check .` and targeted unit tests where present.

### Core Philosophy

- Install: `pnpm install`.
- Dev: `pnpm run dev` (runs server and client concurrently).
- Test: `pnpm test` (server+client), server only: `pnpm --filter intelgraph-server test`.
- Lint/Format: `pnpm run lint && pnpm run format`.
- DB: `pnpm run db:migrate` and `pnpm run db:seed` (from repo root).
- Docker: `pnpm run docker:dev` or `pnpm run docker:prod`.

- **Golden Path**: `make bootstrap && make up && make smoke` - fresh clones must go green
- **Task Runner**: `Makefile` is the single source of truth. `Justfile` is deprecated and removed.
- **Deployable-First**: Maintain the workflow: Investigation -> Entities -> Relationships -> Copilot
  -> Results
- **Production-Ready MVP**: Every commit should maintain production readiness

## Sustained Velocity & Parallelism (Post-GA)

**You are empowered to move fast.** The GA milestone is behind us. Your goal is now **velocity**.

You do not need to seek permission for standard refactors, optimizations, or feature additions, provided you satisfy the **[Post-GA Baseline](docs/BASELINE.md)**.

### The Code of Velocity

1.  **Trust the Tests**: If `make smoke` passes, you are safe to proceed.
2.  **Respect the Zones**: Stay in your lane (Server vs Web vs Docs) to avoid merge conflicts.
3.  **No Governance Theatre**: Do not create "manifestos" or "declarations". Write code, tests, and docs.

### Safe Parallel Zones

Agents must restrict their changes to specific zones to avoid conflicts.

1.  **Server Zone (`server/`)**: Backend services, API, Database.
    - _Safe:_ Adding new endpoints, services, resolvers.
    - _Risk:_ Changing shared utilities in `packages/` or modifying `apps/web` simultaneously.
2.  **Web App Zone (`apps/web/`)**: Summit Web Application.
    - _Safe:_ UI components, local state, dashboards.
    - _Risk:_ Direct DB access, modifying server API contracts without coordination.
3.  **Client Zone (`client/`)**: Legacy/IntelGraph Client.
    - _Safe:_ Independent feature work.
4.  **Documentation Zone (`docs/`)**:
    - _Safe:_ Always safe to append. Avoid rewriting shared index files concurrently.

### Agent Mandates

- **Scope Check:** Before editing, verify your task falls within _one_ primary zone. If it crosses zones (e.g., API + UI), declare strictly coupled changes or split the task.
- **Boundary Respect:** Do not import across boundaries (e.g., `server` imports `client`). Use `packages/` for shared code.
- **Atomic PRs:** One feature, one zone (preferred).
- **Self-Validation:** Run `scripts/check-boundaries.cjs` before submitting.

## Codebase Structure

This is a **pnpm workspace** monorepo managed by **Turbo**:

## Testing Guidelines

- Backend: Jest (`server/tests`), run with coverage: `pnpm --filter intelgraph-server test:coverage`.
- Frontend: see client tests; e2e via Playwright: `pnpm run test:e2e`.
- Naming: `*.spec.ts`/`*.test.js` (client), `*.test.js` (server). Target ≥80% coverage for changed code.
- **Official CI Standard**: The `pr-quality-gate.yml` workflow is the single source of truth for PR validation. See `docs/CI_STANDARDS.md` for details.

## Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- PRs: concise description, linked issues (`Closes #123`), screenshots for UI; CI green required.
- Branches: `type/scope/short-desc` (e.g., `feat/ingest/rest-connector`).

## Web Codex Global Guidance

Run the following workflow when preparing scoped CI pull requests for the `feat/mstc`, `feat/trr`, and `feat/opa` branches:

```
summit/
├── apps/           # Application entrypoints (server, web, gateway, etc.)
├── packages/       # Shared libraries and utilities
├── services/       # 150+ microservices and workers
├── client/         # React web client
├── server/         # Node.js API server
├── scripts/        # Build, deployment, and utility scripts
├── docs/           # Documentation (125+ files)
├── infra/          # Infrastructure as code
├── k8s/            # Kubernetes manifests
├── helm/           # Helm charts
├── terraform/      # Terraform configurations
└── tests/          # Cross-cutting test suites
```

### Key Directories

- `archive/` - Excluded from CI, historical content
- `.disabled/` - Temporarily disabled features
- `RUNBOOKS/` - Operational runbooks
- `SECURITY/` - Security documentation

## Technology Stack

### Backend

| Layer         | Technology                          | Purpose                      |
| ------------- | ----------------------------------- | ---------------------------- |
| API           | Node.js 18+, Express, Apollo Server | GraphQL federation           |
| Graph DB      | Neo4j 5.x                           | Entity/relationship storage  |
| Relational    | PostgreSQL 15+                      | Case metadata, audit         |
| Cache/Queue   | Redis, Kafka/Redpanda               | Caching, streaming           |
| Auth          | OIDC/JWKS SSO, RBAC+ABAC (OPA)      | Authentication/authorization |
| Observability | OpenTelemetry, Prometheus, Grafana  | Tracing, metrics             |

### Frontend

- React 18+ with JSX/TSX
- Apollo Client for GraphQL
- Material-UI (MUI)
- Vite for bundling

### Languages

- TypeScript 5.3.3+ (strict: false for gradual migration)
- Node.js ESM modules
- Python 3.11+ for ML/data pipelines

## Development Commands

### Package Manager: Always Use pnpm

```bash
# Install dependencies
pnpm install

# Install in specific workspace
pnpm --filter @intelgraph/api install

# Add dependency
pnpm add <package> --filter @workspace/name
```

### Build & Test

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

### Make Targets

```bash
make bootstrap       # Setup: install deps, create .env
make up              # Start dev stack
make up-ai           # Start dev + AI stack
make down            # Stop services
make smoke           # Run golden path tests
make conductor-up    # Start Conductor/Maestro stack
make conductor-logs  # Tail Conductor logs
```

### Summit CLI (`summitctl`)

The `summitctl` tool is the preferred entrypoint for standard workflows.

```bash
# Bootstrap environment
npm run summitctl -- init --full

# Validate code quality
npm run summitctl -- check

# Run tests
npm run summitctl -- test
```

## Code Conventions

### TypeScript

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "strict": false,
  "skipLibCheck": true
}
```

### Formatting (Prettier)

- Semi: true
- Trailing comma: all
- Single quotes: true
- Print width: 80
- Tab width: 2

### ESLint

- Extend from base config in `tsconfig.eslint.json`
- No `any` unless justified and documented
- Prefer functional/stateless components in React

### React

- Use hooks over class components
- Prefer `useMemo`/`useCallback` for expensive computations
- Keep components small and composable

## Git & PR Workflow

- Conventional Commits required
- Branch naming: `type/scope/short-desc`
- Keep PRs small and focused
- Include tests and docs updates with changes
- Run smoke tests before opening PRs

## Testing Strategy

1. **Unit Tests**: Jest

   ```bash
   pnpm test:unit
   ```

2. **Integration Tests**: Node + API

   ```bash
   pnpm test:integration
   ```

3. **E2E Tests**: Playwright

   ```bash
   pnpm e2e
   ```

4. **Smoke Tests**: Golden path validation
   ```bash
   make smoke
   ```

### Test Conventions

- No `.only()` or `.skip()` in committed code
- Use Arrange/Act/Assert pattern
- Mock external services in unit tests
- Target 80%+ coverage for changed code

## Security Requirements

### Never Commit

- Secrets or credentials
- `.env` files (use `.env.example`)
- Default passwords in production configs

### Production Guardrails

The API refuses to boot if:

- JWT secrets match defaults
- Database passwords are defaults
- CORS includes localhost in production

### Pre-commit Hooks

- Gitleaks: Secret scanning
- ESLint + Prettier: Code quality
- Commitlint: Commit message format

## Database Operations

### PostgreSQL

```bash
pnpm db:pg:migrate      # Apply migrations
pnpm db:pg:generate     # Generate Prisma client
```

### Neo4j

```bash
pnpm db:neo4j:migrate   # Custom migration scripts
```

## GraphQL

```bash
pnpm graphql:codegen        # Generate types
pnpm graphql:schema:check   # Check for breaking changes
pnpm persisted:build        # Build persisted queries
```

## Service Endpoints (Development)

| Service        | URL                           |
| -------------- | ----------------------------- |
| Frontend       | http://localhost:3000         |
| GraphQL API    | http://localhost:4000/graphql |
| Neo4j Browser  | http://localhost:7474         |
| Postgres Admin | http://localhost:8080         |
| Prometheus     | http://localhost:9090         |
| Grafana        | http://localhost:3001         |

## Debugging

```bash
# View logs
make logs

# Check health
curl http://localhost:4000/health

# Neo4j shell
docker exec -it <neo4j-container> cypher-shell -u neo4j -p devpassword
```

## AI Agent Guidelines

### DO

- Follow existing patterns and conventions
- Add tests for new functionality
- Handle errors gracefully
- Use TypeScript types/interfaces
- Check security implications
- Run `make smoke` after changes

### DON'T

- Commit secrets or credentials
- Skip the smoke test
- Use `any` excessively
- Introduce breaking changes without discussion
- Leave `.only()` or `.skip()` in tests
- Bypass security guardrails

## Quick Reference

```bash
# Full setup and validation
make bootstrap && make up && make smoke

# Development workflow
pnpm dev          # Start dev servers
pnpm build        # Build all
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm typecheck    # Type check

# Cleanup
make down
docker system prune -af
```

## Sprint N+7 Execution Assignments

The following agents are assigned to execute the specific epics defined in `docs/sprints/SPRINT_N_PLUS_7_ROADMAP.md`.

### Agent: Jules (Architecture & Core Services)

**Scope:**

- **Epic A1:** Local Vector Store & Embeddings Service
- **Epic A2:** RAG Ingestion Pipeline
- **Epic A3:** Copilot Query Service
- **Epic C1:** Policy-as-Code Engine (OPA)
- **Epic C2:** Immutable Audit Log

**Change Surface:**

- `server/src/services/`
- `docker-compose*.yml`
- `server/src/policies/`
- `server/src/provenance/`

### Agent: Amp (Frontend & Connectors)

**Scope:**

- **Epic B1:** Connector SDK & Registry
- **Epic B2:** RSS/Atom Connector
- **Epic B3:** STIX/TAXII Connector

**Change Surface:**

- `server/src/connectors/`
- `packages/connector-sdk/` (new)
- `server/src/ingestion/`

### Execution Invariants

All agents must:

1.  Check `docs/roadmap/STATUS.json` before starting work.
2.  Update `docs/roadmap/STATUS.json` in the same PR as the implementation.
3.  Adhere to the contracts defined in `docs/sprints/SPRINT_N_PLUS_7_ROADMAP.md`.

---

## Legacy Guidance (preserved)

- Apps: `server/` (Node/Express/GraphQL), `client/` (React/Vite)
- Docs: `docs/` (guides) and `docs/generated/` (auto-generated overviews)
- Data: `server/db/{migrations,seeds}/{postgres,neo4j}`
- CI/Meta: `.github/`, `scripts/`, `project_management/`

### Build, Test, and Development Commands

- Install: `npm install && (cd server && npm install) && (cd client && npm install)`
- Dev: `npm run dev` (runs server and client concurrently)
- Test: `npm test` (server+client), server only: `cd server && npm test`
- Lint/Format: `npm run lint && npm run format`
- DB: `npm run db:migrate` and `npm run db:seed` (from repo root or `server/`)
- Docker: `npm run docker:dev` or `npm run docker:prod`

### Coding Style & Naming Conventions

- JS/TS: 2-space indent; Prettier + ESLint enforced; Conventional Commits required
- Filenames: `kebab-case` for files/scripts; `PascalCase` for React components
- Configs: `.editorconfig`, `.markdownlint.json`, `commitlint.config.js` present

### Testing Guidelines

- Backend: Jest (`server/tests`), coverage: `cd server && npm run test:coverage`
- Frontend: client tests; e2e via Playwright: `npm run test:e2e`
- Naming: `*.spec.ts`/`*.test.js` (client), `*.test.js` (server); target ≥80% coverage for changed
  code

### Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- PRs: concise description, linked issues (`Closes #123`), screenshots for UI; CI green required
- Branches: `type/scope/short-desc` (e.g., `feat/ingest/rest-connector`)

### Web Codex Global Guidance

Run the scoped CI workflow for `feat/mstc`, `feat/trr`, `feat/opa` when applicable (see previous
instructions for full script). Ensure binaries/large files are sanitized before PRs.

### Security & Configuration Tips

- Use `.env` (copy from `.env.example`); never commit secrets
- Helmet + CORS defaults enabled; restrict `CORS_ORIGIN` in prod
- Run `scripts/bootstrap_github.sh` to set up labels/milestones and import issues

### Architectural North Star

- Reference `docs/FIRST_PRINCIPLES_REDESIGN.md` for major changes
- Strangler pattern: prefer new logic in `packages/` over `server/src/services/`
- Event-first: emit immutable events (Provenance Ledger) over direct DB mutations
- Agent independence: design agents as autonomous actors reacting to event streams

---

**Remember**: The golden path is sacred. Keep it green!

## Agent-Native Development Loop (Prompt N+4)

- **Immutable Prompts:** Every agent task must reference a prompt registered in `prompts/registry.yaml` by its SHA-256 hash. Prompt hashes are authoritative; any mismatch fails CI.
- **Task Contracts:** Agent tasks must conform to `agents/task-spec.schema.json`; store concrete specs under `agents/examples/` or task-specific folders.
- **PR Metadata:** PRs MUST include the fenced JSON block between `<!-- AGENT-METADATA:START -->` and `<!-- AGENT-METADATA:END -->` following the template in `.github/PULL_REQUEST_TEMPLATE.md`. The metadata must align with the registered prompt scope and allowed operations.
- **CI Enforcement:** Use `scripts/ci/verify-prompt-integrity.ts` to validate prompt hashes/scopes against the diff and `scripts/ci/validate-pr-metadata.ts` to validate PR metadata and emit execution records.
- **Artifacts & Archives:** Successful runs emit `artifacts/agent-runs/{task_id}.json` and the CI metrics artifact `agent-metrics.json`; failures must be classified per `docs/ga/AGENT-FAILURE-MODES.md`.

## Agent & Partner Responsibility Boundaries

To maintain clear accountability and human oversight, the following boundaries are strictly enforced:

### 1. Agents Cannot Self-Approve

- **Principle**: Agents (including AI coding assistants) are tools, not owners.
- **Rule**: An agent may _propose_ a change (via PR, commit, or suggestion), but a human owner defined in `CODEOWNERS` must explicitly _approve_ it.
- **Constraint**: CI pipelines must block any merge that relies solely on an agent's token or approval.

### 2. Partner Submissions Require Owner Sign-Off

- **Principle**: Partners operate within defined integration scopes.
- **Rule**: Any code, configuration, or policy submitted by a partner or integration bot requires sign-off from the domain DRI.
- **Constraint**: Partner accounts are granted `read` or `triage` access, but `write`/`maintain` access is restricted to internal DRIs.

### 3. Non-Human Authority

- **Principle**: Decision rights are exclusively human.
- **Rule**: Automated systems cannot make "judgment call" decisions (e.g., overriding a safety check, approving a budget increase).
- **Constraint**: All critical decisions must be traceable to a specific human identity in the `provenance-ledger`.

## Post-GA Governance (Effective Immediately)

- **Change Classification**: All PRs must be labeled `patch`, `minor`, or `major`.
- **Evidence**: Any feature PR must include a test plan producing evidence artifacts.
- **Agent Operations**:
  - No direct commits to `main`.
  - All generated code must be reviewable by humans (clean, commented).
  - Major refactors require explicit human approval via issue comment.
