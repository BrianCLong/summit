# Schema Registry & Versioning

The **Schema Registry** documentation establishes the lifecycle, backwards-compatibility guarantees, and migration policies for Summit's unified data model. It defines how schemas evolve across the platform without causing data loss or downstream breakages.

## Versioning Policy

All schemas defined within Summit (both JSON Schema and GraphQL) adhere to strict semantic versioning rules enforced via CI/CD gates.

- **Major Versions (`v1`, `v2`)**: A major version bump is required for *backwards-incompatible* changes. These are deployed side-by-side with existing schemas to allow services time to migrate.
- **Minor Versions (`v1.1`, `v1.2`)**: Minor versions imply *backwards-compatible additions*. Older consumers will silently ignore newly added properties, while new producers can write them.
- **Patch Versions**: Patches are reserved for typo fixes in documentation properties, non-functional changes, or corrections to non-essential metadata arrays. They do not alter structural guarantees.

### Guarantees

A schema change is considered **breaking** (and therefore requires a new major version or new endpoint) if it:

- Removes or renames an existing field.
- Changes the data type of an existing field.
- Makes an optionally defined field strictly required.
- Alters the semantic meaning of an existing field such that downstream components processing it would derive incorrect context.

## Migration & Deprecation

When a schema is superseded by a newer major version, it enters the **Deprecation Window**.

1. **Announcement**: The deprecation is announced via Architecture Decision Records (ADR) and the internal developer portal.
2. **Parallel Processing**: Both the old and new schema versions are actively processed. Services mapping between versions must ensure non-destructive downstream writes.
3. **Migration Scripts**: SQL or script-based database migrations are implemented (e.g., in `server/scripts/sql/`) to backfill the deprecated properties into the new structures.
4. **Sunsetting**: Once metrics indicate zero usage of the deprecated schema version, the endpoint or validation layer is hard-failed, and the legacy schema files are archived to `schemas/archive/`.

## Directory Conventions

- `schemas/`: Root repository for cross-cutting operational and evidence schemas.
- `api-schemas/`: Definitions explicitly typed for API boundaries (GraphQL/REST).
- `domain-model/`: Foundational entities defining the graph and domain objects (e.g. `domain-model/v1/entities/case.schema.json`).
- `services/<service>/schemas/`: Internal, service-scoped schemas not directly exposed to the edge or central message buses.
