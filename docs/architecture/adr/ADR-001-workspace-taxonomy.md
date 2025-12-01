# ADR-001: Workspace Taxonomy and Organization

**Status**: Proposed
**Date**: 2025-11-21
**Deciders**: Architecture Team
**Technical Story**: Monorepo Refactoring Initiative

## Context and Problem Statement

The Summit monorepo has grown to **417 workspaces** with unclear boundaries between `apps/`, `packages/`, and `services/`. This causes:

- Developer confusion about where to place new code
- Duplicated functionality across workspace types
- Incorrect dependencies (apps depending on services, packages with side effects)
- Build inefficiencies due to tangled dependency graph

**Examples of current issues:**
- `apps/server` (26KB stub) vs `server/` (27MB production) - which is canonical?
- `apps/types` contains pure types but is in `apps/` instead of `packages/`
- `packages/prov-ledger` contains server logic but is in `packages/`

## Decision Drivers

- Clear boundaries improve developer onboarding (target: <1 day)
- Proper taxonomy enables better build caching
- Separation of concerns reduces coupling
- Consistent naming enables automated tooling

## Considered Options

### Option 1: Three-Tier Taxonomy (Recommended)

**Structure:**
```
apps/      → User-facing entrypoints only
packages/  → Pure libraries (no side effects, no servers)
services/  → Backend workers and APIs
```

**Rules:**
| Category | Can Import | Cannot Import | Has Side Effects |
|----------|------------|---------------|------------------|
| apps | packages, services (via API) | other apps | Yes (UI, servers) |
| packages | other packages | apps, services | No |
| services | packages, other services (via API) | apps | Yes (servers, workers) |

### Option 2: Four-Tier Taxonomy

Add `libs/` for low-level utilities, keeping `packages/` for domain logic.

**Rejected because:** Adds complexity without clear benefit. The distinction between "libs" and "packages" is subjective.

### Option 3: Domain-Based Organization

Organize by domain (`intel/`, `ml/`, `platform/`) instead of type.

**Rejected because:** Harder to enforce dependency rules. A domain could legitimately contain apps, packages, and services.

## Decision Outcome

**Chosen Option: Option 1 - Three-Tier Taxonomy**

### Workspace Definitions

#### Apps (User-Facing Entrypoints)
- **Purpose**: Deployable applications that users interact with
- **Examples**: `web` (React UI), `gateway` (API gateway), `cli` (command-line tools)
- **Rules**:
  - Must have a `main` or `start` script
  - Must have deployment configuration (Dockerfile, k8s manifest)
  - Should be thin wrappers that compose packages and call services
  - **No business logic** - delegate to packages/services

#### Packages (Pure Libraries)
- **Purpose**: Shared code with no runtime side effects
- **Examples**: `common-types`, `sdk-ts`, `graph-utils`, `ui-components`
- **Rules**:
  - **No servers, workers, or persistent processes**
  - **No database connections** (use dependency injection)
  - **No environment variables at module scope**
  - Must be tree-shakeable
  - Should have 100% test coverage for exported APIs

#### Services (Backend Workers & APIs)
- **Purpose**: Stateful backend processes that handle business logic
- **Examples**: `api` (GraphQL), `auth` (authentication), `ingest` (data pipeline)
- **Rules**:
  - Must expose health check endpoint (`/health`)
  - Must have structured logging (OpenTelemetry)
  - Should communicate via APIs (REST, GraphQL, gRPC), not direct imports
  - Should be independently deployable

### Namespace Conventions

Introduce scoped package names for better organization:

```
@platform/*   Core utilities (types, config, testing)
@domain/*     Domain-specific logic (graph, auth, intel)
@ui/*         UI components and themes
@service/*    Service-specific packages (internal)
```

### Migration Actions

1. **Relocate misplaced packages:**
   - `apps/types` → `packages/@platform/types`
   - `apps/server` (stub) → Archive or delete
   - `packages/prov-ledger` → `services/prov-ledger`

2. **Rename root packages:**
   - `server/` → `apps/api-server` or keep as legacy entrypoint
   - `client/` → `apps/web-client` or keep as legacy entrypoint

3. **Add workspace linting:**
   ```javascript
   // turbo.json or custom script
   "lint:taxonomy": "node scripts/lint-workspace-taxonomy.js"
   ```

## Consequences

### Positive
- Clear mental model for developers
- Better build caching (packages rarely change)
- Easier dependency auditing
- Enables automated enforcement via linting

### Negative
- Migration effort required for misplaced packages
- Some edge cases may not fit cleanly into three categories
- Need to update import paths across codebase

### Risks
- Developers may resist taxonomy enforcement
- Migration may introduce temporary import errors

**Mitigation**: Gradual migration with facade patterns, clear documentation, and tooling support.

## Compliance

All new workspaces must:
1. Follow the taxonomy rules above
2. Pass `pnpm lint:taxonomy` check
3. Include workspace type in `package.json`:
   ```json
   {
     "name": "@intelgraph/my-package",
     "workspaceType": "package"  // or "app" or "service"
   }
   ```

## Related Documents

- [Monorepo Refactoring Plan](../MONOREPO_REFACTORING_PLAN.md)
- [ADR-002: Service Consolidation](./ADR-002-service-consolidation.md)
