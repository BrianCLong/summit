# Claude Code CLI - Summit/IntelGraph Repo Contract

> **Canonical guide for AI-assisted development in the Summit monorepo.**
> Follow this contract to ship atomic, green PRs with evidence attached.

---

## Golden Path Commands

These are the **only** commands needed to validate a fresh clone or verify changes before PR.

| Command          | Intent                                           | When to Run                     |
| ---------------- | ------------------------------------------------ | ------------------------------- |
| `make bootstrap` | Install all dependencies (Node + Python)         | Fresh clone, after pulling main |
| `make up`        | Start dev stack (Docker Compose)                 | Before running services locally |
| `make smoke`     | Full smoke test (bootstrap + up + health checks) | Fresh clone validation          |
| `make ga`        | **GA Gate** - Lint, tests, security, provenance  | Before every PR merge           |

### Command Details

```bash
# Fresh clone workflow (must pass before writing code)
make bootstrap    # Install pnpm deps + Python venv
make up           # Start containers
make smoke        # Validate everything works

# Before PR (must pass for merge)
make ga           # Runs full GA gate with evidence collection
```

### Failure Triage

| Failure                 | Likely Cause                     | Fix                                        |
| ----------------------- | -------------------------------- | ------------------------------------------ |
| `bootstrap` fails       | Missing Node 20+ or Python 3.11+ | Check `node -v` and `python3 --version`    |
| `up` fails              | Docker not running               | Start Docker Desktop, then `make up`       |
| `up` hangs              | Port conflict                    | `make down && docker ps` to find conflicts |
| `smoke` fails on health | Service crashed                  | `docker compose logs <service>`            |
| `ga` lint fails         | Code style issues                | `pnpm lint:fix` or `make format`           |
| `ga` test fails         | Broken tests                     | Run `pnpm test -- --verbose` for details   |

**When `make ga` fails:** Use the [GA Red Playbook](playbooks/ga-red-playbook.md) for detailed triage, or run `/ga-triage` for guided diagnosis.

---

## Repo Map

This monorepo contains 380+ directories. Here's where "real work" lives:

### Core Application

| Directory   | Purpose                        |
| ----------- | ------------------------------ |
| `client/`   | React frontend (Vite)          |
| `server/`   | Express/Apollo backend API     |
| `packages/` | Shared libraries and utilities |
| `services/` | Microservices (standalone)     |

### APIs & Schemas

| Directory      | Purpose                         |
| -------------- | ------------------------------- |
| `api/`         | REST API routes                 |
| `apis/`        | External API integrations       |
| `api-schemas/` | OpenAPI/JSON Schema definitions |
| `graphql/`     | GraphQL schemas and resolvers   |

### Infrastructure & Ops

| Directory    | Purpose                         |
| ------------ | ------------------------------- |
| `compose/`   | Docker Compose files            |
| `charts/`    | Helm charts for K8s             |
| `terraform/` | Infrastructure as Code          |
| `ops/`       | Operational scripts and tooling |

### Orchestration & Pipelines

| Directory        | Purpose                        |
| ---------------- | ------------------------------ |
| `.maestro/`      | Maestro orchestration configs  |
| `.orchestrator/` | Pipeline orchestration         |
| `pipelines/`     | Data and ML pipelines          |
| `workflows/`     | GitHub Actions and automations |

### Configuration & Compliance

| Directory     | Purpose                      |
| ------------- | ---------------------------- |
| `config/`     | Application configuration    |
| `configs/`    | Environment-specific configs |
| `RUNBOOKS/`   | Operational runbooks         |
| `SECURITY/`   | Security policies and guides |
| `compliance/` | Compliance documentation     |
| `audit/`      | Audit logs and evidence      |

### CLI & Tools

| Directory  | Purpose            |
| ---------- | ------------------ |
| `cli/`     | CLI tools          |
| `tools/`   | Developer tooling  |
| `scripts/` | Automation scripts |

---

## PR Discipline

### Atomic PRs (Required)

Every Claude-authored PR must be:

1. **Single-purpose** - One feature, one bugfix, or one refactor
2. **Self-contained** - All related changes in one PR
3. **No drive-by refactors** - Don't "improve" unrelated code
4. **Testable** - Include or update tests
5. **Green** - Must pass `make ga` before merge

Every PR **MUST** include the following sections using the template: [.prbodies/claude-evidence.md](../.prbodies/claude-evidence.md)

### Commit Message Format

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build
Scope: client, server, api, graphql, <package-name>, etc.
```

Examples:

```
feat(client): add entity relationship visualization
fix(server): resolve N+1 query in investigations resolver
docs(api): update authentication endpoint documentation
```

---

## Workflow Reference

See `.claude/workflows/` for copy-paste prompts:

| Workflow                    | Use Case                     |
| --------------------------- | ---------------------------- |
| `workflow-bugfix.md`        | Fixing reported bugs         |
| `workflow-feature-small.md` | Small feature additions      |
| `workflow-docs.md`          | Documentation updates        |
| `workflow-security-fix.md`  | Security vulnerability fixes |
| `workflow-ga-red.md`        | When GA gate is failing      |

---

## Quick Reference Commands

```bash
# Development
make dev              # Start dev servers
make test             # Run all tests
make lint             # Run linters
make format           # Format code

# Validation
make smoke            # Full smoke test
make ga               # GA gate (required before PR)
make claude-preflight # Fast local checks

# Infrastructure
make up               # Start Docker stack
make down             # Stop Docker stack
make logs             # View container logs

# Database
make db-migrate       # Run migrations
make db-seed          # Seed test data
```

---

## AI Assistant Guardrails

### DO

- Follow existing patterns in the codebase
- Add tests for new functionality
- Use TypeScript strict types
- Handle errors gracefully
- Run `make ga` before committing
- Use the evidence template for PRs

### DON'T

- Commit secrets or credentials
- Skip the GA gate
- Introduce breaking changes without discussion
- Use `any` type excessively
- Commit with `.only()` or `.skip()` in tests
- Make drive-by refactors in unrelated files

---

## Resources

- [Workflow Templates](workflows/) - Repeatable PR workflows
- [GA Red Playbook](playbooks/ga-red-playbook.md) - When `make ga` fails
- [Areas Map](areas.md) - Intent-to-directory mapping
- [Evidence Template](../.prbodies/claude-evidence.md) - PR body template
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
- [docs/ONBOARDING.md](../docs/ONBOARDING.md) - Developer onboarding

---

**The GA gate is sacred. Keep it green.**
