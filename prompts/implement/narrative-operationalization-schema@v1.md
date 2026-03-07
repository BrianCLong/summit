# Prompt: Narrative Operationalization Schema + Evidence IDs (v1)

## Objective

Implement the narrative-operationalization schema primitives and deterministic Evidence ID utilities for GraphRAG, plus the matching standards documentation and roadmap status update.

## Required Outputs

- Evidence ID utilities with canonicalization + stable hashing.
- Narrative operationalization schema types for narrative artifacts, claims, assumptions, narrative state, and governance artifacts.
- Standards doc: `docs/standards/narrative-operationalization.md`.
- Roadmap status update in `docs/roadmap/STATUS.json`.
- Unit tests verifying Evidence ID stability.

## Constraints

- Deterministic outputs only; no wall-clock timestamps.
- Feature flags remain default OFF.
- Follow existing GraphRAG conventions in `server/src/services/graphrag/`.
- Add tests without `.only()` or `.skip()`.

## Evidence

Provide file citations and list the deterministic test run(s).
