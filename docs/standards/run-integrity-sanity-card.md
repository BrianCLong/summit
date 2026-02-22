# Run Integrity Sanity Card

## Overview
The Run Integrity Gate ensures that evidence data ingestion is consistent across the primary stores: Postgres (Relational) and Neo4j (Graph). It verifies that for a given `runId`, the same set of evidence items exists in both stores with identical content.

## Key Principles
1.  **UUIDv7 Run IDs**: All runs must be identified by a UUIDv7, which provides time-ordered sorting and compatibility with OpenLineage.
2.  **Deterministic Canonicalization**: Content is hashed using a strict canonicalization ruleset (sorted keys, specific null handling) to ensure `hash(postgres_row) == hash(neo4j_node)`.
3.  **Single Predicate**: The gate enforces `AggregateDigest(Postgres) == AggregateDigest(Neo4j)`.

## Canonicalization Rules
*   **Format**: `id||payload_json||metadata_json`
*   **Payload/Metadata**: JSON objects with keys sorted alphabetically.
*   **Nulls**: Represented as empty strings in the concatenated string (e.g., `id|||meta` if payload is null).

## Artifacts
*   `report.json`: Summary of the check (Status, Counts, Aggregates).
*   `evidence_delta.json`: List of mismatched IDs and their digests (only produced on failure).
*   `stamp.json`: Volatile execution metadata (Runner, Timestamp).

## CI Integration
The check runs via GitHub Actions (`run_integrity.yml`).
*   **Warn Mode**: Reports failures but does not break the build (default for branches).
*   **Enforce Mode**: Breaks the build on failure (default for main/tags).
