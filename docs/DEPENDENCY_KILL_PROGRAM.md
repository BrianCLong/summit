# Dependency Kill Program

## Top 10 Coupling Hotspots (Initial Assessment)

Based on a preliminary scan of the `server/src` codebase, the following hotspots have been identified where services are tightly coupled to shared resources or libraries.

| Hotspot                        | Type          | Description                                                                                                | Remediation Plan                                                                                           |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **Prisma Direct Access**       | Shared DB     | Multiple services (e.g., `AnalystDashboardService`, `SOARPlaybookService`) import `PrismaClient` directly. | **Phase 1**: Move all DB access to Repository classes. **Phase 2**: Services use Repositories, not Prisma. |
| **Neo4j Direct Access**        | Shared DB     | Services like `GraphRAGService`, `InfluenceOperationService` import `neo4j-driver` directly.               | **Phase 1**: Centralize Neo4j access in `GraphService` or specific Repositories.                           |
| **Monolithic `utils`**         | Shared Lib    | (Assumed) A large `utils` folder likely contains grab-bag functions used everywhere.                       | Break `utils` into specific packages (e.g., `@intelgraph/time`, `@intelgraph/format`).                     |
| **Express Middleware**         | Framework     | Middleware logic often couples Auth, Logging, and Validation tightly to Express.                           | Abstract middleware logic into framework-agnostic services where possible.                                 |
| **Global Config**              | Config        | `server/src/config` is likely imported everywhere.                                                         | Use dependency injection for configuration.                                                                |
| **Synchronous Event Handling** | Sync Fan-out  | Direct function calls between domains (e.g., User Service calling Email Service).                          | Replace with Async Events (Redis/BullMQ) for side effects.                                                 |
| **Shared Types**               | Code Sharing  | Frontend and Backend sharing types via file copying or monolithic `types` folder.                          | Move shared types to a workspace package `@intelgraph/types`.                                              |
| **Environment Variables**      | Configuration | Scattered `process.env` access.                                                                            | Centralize in a typed Config Service.                                                                      |
| **Testing Mocks**              | Testing       | Manual mocking of globals in every test file.                                                              | Create shared test fixtures/factories.                                                                     |
| **Logging**                    | Observability | `console.log` or direct logger imports.                                                                    | Use a centralized Observability wrapper.                                                                   |

## Strategic Plan

### 1. Replace Shared DB Writes

- **Goal**: No two services write to the same table/node directly.
- **Strategy**: Identify the "Owner" service for each entity. All other services must use an API (Internal or Event) to request changes.

### 2. Contract Tests

- **Goal**: Ensure APIs (Internal & External) don't break consumers.
- **Tooling**: Use Pact or simple Jest integration tests asserting schema.

### 3. Stable Internal APIs

- Define a clear interface for modules in `server/src/modules/`.
- Use TypeScript `interface` definitions to enforce boundaries.

### 4. Dependency Budgets

- Track number of external deps per package.
- Alert on new "heavy" dependencies.

### 5. Monthly Delete Review

- Agenda:
  - Review `madge` circular dependency report.
  - Identify unused exports (knip).
  - Delete 1 unused dependency or file.
