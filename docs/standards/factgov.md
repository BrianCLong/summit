# FactGov Standards

## Import/Export Matrix

| Direction | Component | Description |
| :--- | :--- | :--- |
| **Imports** | Summit ABAC | Uses `authDirective` and `context.user` for permission checks. |
| **Imports** | Postgres | Uses `server/src/config/database.ts` pool for transactional data. |
| **Imports** | GraphQL | Extends the root `Query` and `Mutation` types. |
| **Exports** | Marketplace Entities | Agencies, Vendors, Validators exposed via GraphQL. |
| **Exports** | Artifacts | deterministic award recommendation JSONs. |

## Module Structure (`server/src/modules/factgov/`)

*   `types.ts`: TypeScript interfaces mirroring the DB schema.
*   `repo.ts`: Data access layer. SQL queries reside here.
*   `service.ts`: Business logic (matching, rules).
*   `resolvers.ts`: GraphQL resolvers.
*   `schema.ts`: GraphQL type definitions (SDL).

## Non-goals (MWS)
*   No full Stripe billing implementation.
*   No cooperative contract API sync.
*   No real-time "chat" features (use standard Summit messaging if needed).

## Determinism
*   All artifacts (award recommendations, audit trails) must be generated deterministically.
*   Timestamps in artifacts must be separated into a `runtime_meta` field or file, not embedded in the hashable content.
