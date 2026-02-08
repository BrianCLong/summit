# Prompt: Postgres CDC Blueprint (Docs)

## Objective
Document a deterministic, auditable Postgres CDC blueprint that defines canonical event envelopes,
provenance/evidence handling, and idempotent projection patterns for Postgres, Neo4j, and search
sinks.

## Requirements
- Create a single documentation artifact under `docs/streaming/`.
- Include canonical event schema, evidence semantics, conflict resolution, and operational
  guardrails.
- Provide a projection ledger DDL example.
- Add MAESTRO Security Alignment (layers, threats, mitigations).
- Update `docs/roadmap/STATUS.json` revision note and timestamp.

## Scope
- Allowed paths:
  - `docs/streaming/postgres-cdc-blueprint.md`
  - `docs/roadmap/STATUS.json`
  - `prompts/docs/postgres-cdc-blueprint@v1.md`
  - `prompts/registry.yaml`

## Non-Goals
- No production code changes.
- No policy-as-code modifications.
