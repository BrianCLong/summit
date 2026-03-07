# Parallelization Boundaries

To enable sustained velocity and safe parallel development, the **Summit** monorepo is divided into distinct **Parallelization Boundaries**.

## Core Boundaries

Work within these boundaries can proceed in parallel with minimal coordination. Crossing these boundaries requires explicit interface updates and careful review.

### 1. Server (`server/`)

- **Scope:** Backend API, Database interactions (Postgres/Neo4j), Business Logic, Services.
- **Safe Parallel Tasks:** Adding new services, updating resolvers, optimizing queries, internal refactoring.
- **Forbidden:** Importing from `client/` or `apps/web/`. Direct dependency on frontend state.

### 2. Client - Legacy (`client/`)

- **Scope:** React Web Client (IntelGraph Client).
- **Safe Parallel Tasks:** UI components, client-side state, data visualization.
- **Forbidden:** Importing from `server/` (except shared types if explicitly allowed), direct DB access.

### 3. Web App - Summit (`apps/web/`)

- **Scope:** Summit Web Application (Vite/React).
- **Safe Parallel Tasks:** New UI features, dashboard widgets, routing updates.
- **Forbidden:** Importing from `server/`, direct DB access.

### 4. Shared Packages (`packages/`)

- **Scope:** Shared utilities, types, and standalone libraries.
- **Safe Parallel Tasks:** Adding new utility functions, updating shared types.
- **Constraint:** Changes here may impact multiple consumers (`server`, `client`, `apps/web`). _High Impact Area_.

## Interface Contracts

Communication between boundaries must occur via defined interfaces:

- **API Layer:** GraphQL Schema defines the contract between Server and Clients. Breaking changes require coordination.
- **Shared Types:** `packages/types` (or similar) defines shared data structures.

## Boundary Enforcement

- **Forbidden Imports:**
  - `server` code **MUST NOT** import from `client` or `apps`.
  - `client` and `apps` **MUST NOT** import from `server` (except for generated types).
  - `packages` **SHOULD NOT** depend on `server`, `client`, or `apps` (circular dependency risk).

## Working in Parallel

1.  **Identify your Boundary:** Determine if your task is Server-only, Client-only, or Shared.
2.  **Stay Local:** Keep changes within the boundary whenever possible.
3.  **Coordinate Interfaces:** If you must change an interface (e.g., GraphQL schema), announce it and treat it as a blocking dependency for dependent workstreams.
