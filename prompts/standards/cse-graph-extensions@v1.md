# CSE Graph Extensions Standard Prompt (v1)

## Objective

Define the Cognitive Security Engine (CSE) graph extensions standard, including schema, scoring
requirements, and governance alignment, plus roadmap and standards index updates.

## Scope

- `docs/standards/cognitive-security-engine.md`
- `docs/standards/README.md`
- `schemas/cogwar/cse.graph.v1.schema.json`
- `docs/roadmap/STATUS.json`
- `prompts/standards/cse-graph-extensions@v1.md`
- `prompts/registry.yaml`

## Constraints

- Evidence refs are mandatory for campaign declarations and relationship edges.
- Feature-flag default OFF for ingestion/scoring changes.
- Deterministic outputs only; document required query caps.
- No modification to governance policy files outside scope.

## Evidence Requirements

- Schema validation must succeed for `cse.graph.v1` payloads.
- Roadmap update must reference the new standard and schema.
