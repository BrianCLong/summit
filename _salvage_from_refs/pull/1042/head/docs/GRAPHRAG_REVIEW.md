# GraphRAG Repository Review

This document summarizes the current state of the `intelgraph` repository with a focus on readiness for a production GraphRAG implementation.

## Service Inventory

- **graph-service** – Python microservice responsible for graph analytics utilities.
- **ingestion** – Handles document and media ingestion; entry point for creating graph nodes from raw data.
- **ml** – Mixed collection of ML prototypes and training scripts; overlaps with `intelgraph_ai_ml`.
- **nlp-service** – Minimal service intended for language processing and extraction tasks.
- **server** – Node/Express GraphQL API exposing GraphRAG endpoints (`graphragResolvers.ts`, `graphrag.schema.graphql`).
- **frontend** – React application that already issues GraphRAG queries through `GraphRagAnswer`.
- **ingestion** and **graph-service** appear twice in various folders (e.g. `intelgraph_ai_ml` vs `ml`), suggesting drift and potential duplication.

## Graph Storage & Access

- Neo4j is configured as the primary graph store (`docker-compose.yml`, `neo4j-driver` usage in `GraphRAGService.ts`).
- Graph schema and resolvers live in `server/src/graphql/` and `server/src/services/GraphRAGService.ts`.
- GraphRAG service uses Zod‑validated requests/responses and caches subgraphs in Redis.

## Security Posture

- Secret management enforced via `.sops.yaml` and `.secrets.baseline`.
- Pre‑commit hooks (`.pre-commit-config.yaml`) integrate `gitleaks` to prevent secret leaks.
- No secrets were found in the repository during review.

## CI / Testing / Linting

- GitHub Actions present under `.github/` (not exhaustively reviewed).
- Linting relies on ESLint and Ruff; formatting via Prettier.
- Jest tests exist for GraphRAG schema validation but overall test coverage is unclear.

## Risks & Gaps for GraphRAG

| Risk                                                  | Impact                                     | Mitigation                                  |
| ----------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Neo4j indexes/constraints not defined                 | Query performance & data integrity issues  | Add idempotent migrations for nodes/edges   |
| Ingestion pipeline incomplete                         | Graph may lack real entities/relationships | Implement document → entity extraction path |
| Duplicate ML directories (`ml` vs `intelgraph_ai_ml`) | Maintenance overhead                       | Consolidate or deprecate outdated folders   |
| Limited automated tests around GraphRAG resolvers     | Regressions in retrieval API               | Add unit & smoke tests for GraphRAG queries |

## Proposed Minimal GraphRAG Slice

1. **Ingestion Job** – Parse markdown/JSONL documents, extract entities & relations, upsert into Neo4j.
2. **Community Summaries** – Run periodic Louvain clustering, store per‑community summaries.
3. **GraphQL Retrieval API** – Extend `graphRagAnswer` to include subgraph context and summaries.
4. **Frontend Hook** – Add button in investigation view to trigger a GraphRAG query and display answer + evidence.

This slice provides end‑to‑end GraphRAG functionality while keeping scope small and aligned with the golden path workflow.
