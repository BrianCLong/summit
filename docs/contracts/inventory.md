# Public Interfaces Inventory

This document lists the public interfaces of the IntelGraph platform and defines their stability guarantees.

## Interfaces

### 1. GraphQL API

- **Endpoint**: `/graphql`
- **Schema**: Defined in `server/src/graphql/schema.ts` (and federated services).
- **Stability**: **Stable**.
  - Do not remove fields or types.
  - Do not change nullability (Nullable -> Non-nullable is breaking).
  - Use `@deprecated` directive for deprecations.

### 2. REST API

- **Endpoint**: `/api/v1`
- **Routes**: Defined in `server/src/routes`.
- **Public Routes**: `server/src/routes/public.ts` (Health, Readiness).
- **Stability**: **Stable**.
  - URL structure must not change.
  - Response JSON structure must be backward compatible.

### 3. Events (Provenance Ledger)

- **Channel**: Kafka / Redis PubSub.
- **Schema**: Defined in `services/prov-ledger/schemas`.
- **Stability**: **Immutable**.
  - Events written to the ledger are permanent.
  - Schemas must be additive.

### 4. Configuration

- **Source**: Environment Variables (`.env`, `k8s` secrets).
- **Definition**: `server/src/config` and `src/config` in services.
- **Stability**: **Managed**.
  - Renaming variables requires a migration period (support both).

## "Do Not Break" Rules

1.  **Additive Only**: Always add new fields/endpoints rather than modifying existing ones.
2.  **Consumer First**: Assume clients (web, mobile, SDKs) use every field.
3.  **Parallel Run**: For major changes, support the old and new path simultaneously for at least one release cycle.
4.  **Contract Tests**: Changes to public interfaces must pass contract tests (see `tests/contracts`).
