# Unified Migration Registries

This folder centralizes schema change artifacts across every persistence layer. Each registry folder owns the authoritative globs for drift detection, developer tooling, and CI enforcement:

- `sql/` – relational/PostgreSQL migrations (maps to `server/src/db/migrations/postgres` and legacy top-level SQL files).
- `graph/` – Neo4j and graph database migrations (maps to `server/src/db/migrations/neo4j` and legacy Cypher files under `migrations/`).
- `vector/` – vector database schemas and embedding payload definitions. Vector-aware SQL migrations in `server/src/db/migrations/postgres` are captured here.
- `json/` – JSON/document-store schemas and migration scripts.

Each registry exposes a `registry.json` file that lists the schema glob patterns used by tooling to discover schema definitions and migration artifacts. Existing migrations remain in their historical locations; new work should either land directly in these registry folders or ensure the registry globs include the new path.
