# Prompt 1: Monorepo + Dev Env Bootstrap

## Role
Senior Platform Engineer (TypeScript-first)

## Context
You're bootstrapping IntelGraph's trunk-based monorepo for a next-generation intelligence analysis platform with AI-augmented graph analytics.

## Task
Scaffold a pnpm-based monorepo with packages for:
- `api-gateway`
- `services/ingest`
- `services/graph`
- `webapp`
- `libs/*` (shared libraries)

Include:
- Dockerfiles for each service
- `docker-compose.yml` for local development
- Kubernetes Helm charts for production deployment
  - Single-region primary write + read replicas toggles
  - Environment-specific values (dev/staging/prod)

## Guardrails
- **Runtime**: Node 20+
- **Language**: TypeScript strict mode
- **Code Quality**: ESLint + Prettier configured
- **Git Hooks**: Pre-commit hooks for linting and formatting
- **Commit Style**: Conventional commits
- **Branching**: Trunk-based development
- **Release Cadence**: Weekly releases

## Deliverables

### 1. Repository Structure
- [ ] pnpm workspace configuration (`pnpm-workspace.yaml`)
- [ ] Base `package.json` with workspace scripts
- [ ] Directory structure for all services and libs
- [ ] Base Dockerfiles for each service
- [ ] `docker-compose.yml` for local development stack
- [ ] Helm charts in `helm/` directory with values for dev/staging/prod

### 2. Developer Experience
- [ ] `Makefile` or `Taskfile` with common commands
- [ ] `README.md` with:
  - Developer quickstart guide
  - Service overview
  - Deployment instructions
  - Canary deployment and rollback summary

### 3. Build & Tooling
- [ ] TypeScript configuration (`tsconfig.json`, `tsconfig.base.json`)
- [ ] ESLint configuration (flat config for ESLint v9+)
- [ ] Prettier configuration
- [ ] Husky pre-commit hooks
- [ ] Commitlint for conventional commits

## Acceptance Criteria
- ✅ `make dev` runs the entire local development stack end-to-end
- ✅ `pnpm -r build` successfully builds all workspaces
- ✅ `helm template` validates without errors for all environments
- ✅ Docker images build successfully locally
- ✅ All git hooks trigger correctly on commit

## Related Files
- `/home/user/summit/CLAUDE.md` - Project conventions and standards
- `/home/user/summit/pnpm-workspace.yaml` - Existing workspace config
- `/home/user/summit/turbo.json` - Turbo build configuration

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 1: Monorepo Bootstrap"

# Or use the slash command (if configured)
/bootstrap-monorepo
```

## Notes
- Follow the golden path philosophy: `make bootstrap && make up && make smoke`
- Ensure all changes maintain production readiness
- Keep the monorepo structure aligned with existing conventions in CLAUDE.md
