# Prompt: deterministic-openlineage-emitter

## Purpose
Implement a deterministic OpenLineage emission layer as a reusable Summit package with schema
validation and a proof integration in an existing pipeline.

## Scope
- packages/lineage-emitter/
- schemas/openlineage-event.schema.json
- src/data-pipeline/
- tests/
- tsconfig.base.json
- package.json
- docs/roadmap/STATUS.json
- agents/examples/

## Constraints
- No network calls.
- No nondeterministic fields in emitted payloads.
- Sort all arrays and object keys deterministically.
- Validate against JSON Schema before emission.
- Emit artifact to artifacts/lineage/<sha>/openlineage.json.

## Success Criteria
- Deterministic OpenLineage event generation with stable IDs.
- Runtime schema validation enforced before emission.
- Pipeline integration emits OpenLineage artifact path.
