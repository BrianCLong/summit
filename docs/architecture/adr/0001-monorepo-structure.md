# ADR-0001: Monorepo Structure with pnpm Workspaces and Turborepo

**Date:** 2024-01-10
**Status:** Accepted
**Area:** Infrastructure
**Owner:** Platform Engineering
**Tags:** monorepo, pnpm, turborepo, build-system, dx

## Context

Summit/IntelGraph is a complex intelligence analysis platform with:

- **30+ applications** in `apps/` (API servers, web frontends, analytics engines)
- **340+ shared packages** in `packages/` (utilities, types, components)
- **300+ microservices** in `services/` (domain-specific processing)
- **Multiple language runtimes** (TypeScript/Node.js primary, Python for ML)

Development challenges we faced:

1. **Dependency management**: Shared code between services requires versioning coordination
2. **Build times**: Full rebuilds take 15+ minutes without caching
3. **CI costs**: Running all tests on every PR wastes compute
4. **Code sharing**: Copy-paste between services leads to drift and bugs
5. **Onboarding friction**: New developers struggle to understand project structure

The platform requires:

- Fast incremental builds (< 2 minutes for typical changes)
- Efficient CI with only affected packages tested
- Shared type definitions across frontend and backend
- Consistent tooling (linting, formatting, testing)
- Support for mixed Node.js and Python workloads

## Decision

### Core Decision

We use **pnpm workspaces** for package management and **Turborepo** for build orchestration in a unified monorepo structure.

### Key Components

- **pnpm 9.12+**: Workspace package manager with content-addressable storage
- **Turborepo 2.3+**: Build system with incremental caching and task parallelization
- **TypeScript Project References**: `tsconfig.build.json` orchestrates compilation
- **ESLint Flat Config**: Unified linting across all packages
- **Conventional Commits**: Enforced by commitlint for semantic versioning

### Implementation Details

**Workspace Structure** (defined in `pnpm-workspace.yaml`):

```yaml
packages:
  - "apps/*" # Application entrypoints
  - "packages/*" # Shared libraries
  - "services/*" # Microservices
  - "agents/*" # AI/orchestration agents
  - "contracts/*" # API contracts
  - "tools/*" # Development utilities
  - "server" # Legacy API server
  - "client" # Legacy web client
```

**Build Pipeline** (defined in `turbo.json`):

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true
    },
    "lint": {
      "cache": true
    }
  }
}
```

**Golden Path Commands**:

```bash
make bootstrap  # Install deps, setup env
make up         # Start dev stack
make smoke      # Validate golden path
pnpm build      # Build all (with caching)
pnpm test       # Test all (with caching)
```

## Alternatives Considered

### Alternative 1: Polyrepo with npm/yarn

- **Description:** Separate repositories for each service, using npm/yarn
- **Pros:**
  - Clear ownership boundaries per repo
  - Independent deployment pipelines
  - Familiar to most developers
- **Cons:**
  - Cross-repo changes require multiple PRs
  - Dependency version drift between repos
  - No shared build caching
  - Difficult to maintain consistent tooling
  - Breaking changes require coordinated releases
- **Cost/Complexity:** Lower initial complexity, higher long-term maintenance

### Alternative 2: Nx Build System

- **Description:** Nx monorepo tooling with affected commands and caching
- **Pros:**
  - Powerful affected detection
  - Built-in generators and executors
  - Strong Angular/React integration
  - Remote caching available
- **Cons:**
  - Heavier abstraction layer
  - Less flexibility for custom tooling
  - Learning curve for configuration
  - Opinionated project structure
- **Cost/Complexity:** Similar complexity, more prescriptive

### Alternative 3: Lerna (Classic)

- **Description:** Original JavaScript monorepo tool
- **Pros:**
  - Mature ecosystem
  - Good for publishing to npm
  - Familiar to many teams
- **Cons:**
  - No built-in build caching
  - Slower than modern alternatives
  - Less active development (now part of Nx)
  - Limited parallelization
- **Cost/Complexity:** Lower complexity, inadequate for our scale

### Alternative 4: Bazel

- **Description:** Google's polyglot build system
- **Pros:**
  - Hermetic builds
  - Excellent multi-language support
  - Enterprise-grade caching
  - Fine-grained dependency tracking
- **Cons:**
  - Steep learning curve (Starlark)
  - Complex configuration for JavaScript
  - Overkill for our team size
  - Limited community tooling for Node.js
- **Cost/Complexity:** High complexity, appropriate for larger orgs

## Consequences

### Positive

- **10x faster builds**: Turbo caching reduces typical builds from 15 minutes to < 2 minutes
- **Efficient CI**: Only affected packages tested, saving ~60% compute costs
- **Atomic changes**: Cross-cutting refactors in a single PR with atomic commits
- **Shared types**: TypeScript definitions shared between frontend/backend eliminate drift
- **Consistent DX**: All developers use identical tooling and configurations
- **Simplified onboarding**: `make bootstrap && make up && make smoke` works on fresh clones

### Negative

- **Large repository size**: Full clone is ~2GB (mitigated by shallow clones)
- **Merge conflicts**: High activity can cause conflicts in shared files (`pnpm-lock.yaml`)
- **Learning curve**: Team must learn pnpm workspace commands vs npm
- **Dependency hoisting**: Phantom dependencies possible if not careful with package.json
- **IDE performance**: Large projects may slow TypeScript language server

### Neutral

- Requires Docker for full local development (acceptable for our stack)
- Python packages managed separately via Poetry/pip (not in pnpm workspaces)
- Some legacy services still use npm (migration in progress)

### Operational Impact

- **CI/CD**: GitHub Actions with Turbo remote caching reduces pipeline time by ~70%
- **Disk usage**: pnpm's content-addressable storage saves ~50% vs npm
- **Memory**: TypeScript project references require more RAM for LSP
- **Backup**: Monorepo simplifies backup strategy (single source of truth)

## Code References

### Core Implementation

- `pnpm-workspace.yaml` - Workspace package definitions
- `turbo.json` - Turborepo build pipeline configuration
- `package.json` - Root package with scripts and devDependencies
- `Makefile` - Golden path targets (bootstrap, up, smoke)

### Configuration

- `tsconfig.base.json` - Base TypeScript configuration
- `tsconfig.build.json` - Project references for workspace builds
- `eslint.config.js` - ESLint flat configuration
- `.prettierrc` - Prettier formatting rules

### Build Scripts

- `scripts/setup.sh` - Initial environment setup
- `scripts/smoke-test.js` - Golden path validation
- `scripts/wait-for-stack.sh` - Service readiness checks

## Tests & Validation

### Golden Path Tests

- `make smoke` - Validates Investigation -> Entities -> Relationships -> Copilot -> Results
- Test data: `data/golden-path/demo-investigation.json`
- Must pass before any PR merge

### Build Validation

- `pnpm build` - Turbo-cached incremental builds
- `pnpm typecheck` - TypeScript project reference compilation
- `pnpm lint` - ESLint across all packages

### CI Enforcement

- `.github/workflows/ci.yml` - Main CI pipeline with caching
- Pre-commit hooks via Husky (lint-staged, gitleaks)
- Commitlint for conventional commit enforcement

## Related ADRs

- ADR-0007: GraphQL API Design (uses shared schema packages)
- ADR-0012: Copilot GraphRAG Architecture (spans multiple packages)
- ADR-0013: Paved Road Service Template (monorepo service scaffolding)

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo.tools Comparison](https://monorepo.tools/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

## Revision History

| Date       | Author               | Change                                        |
| ---------- | -------------------- | --------------------------------------------- |
| 2024-01-10 | Platform Engineering | Initial version                               |
| 2024-06-15 | Platform Engineering | Updated with Turbo 2.x migration results      |
| 2025-12-06 | Architecture Team    | Migrated to /docs/architecture/adr/ framework |
