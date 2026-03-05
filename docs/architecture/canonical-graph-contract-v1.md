# Canonical Graph Contract v1

This contract defines the minimum governed schema for Summit graph writes.

## Primitives
- `Entity`
- `Event`
- `Relationship`
- `Evidence`
- `Claim`
- `Narrative`

## Required Fields (all primitives)
- `id`: globally unique identifier
- `type`: ontology-qualified type
- `time`: primary event/claim timestamp (ISO-8601)
- `confidence`: normalized float in `[0.0, 1.0]`
- `source_refs`: non-empty references to source/evidence objects
- `provenance`: extraction/transformation lineage object

## Policy Invariants
1. Graph boundary rejects writes that omit required fields.
2. Claims MUST include at least one `source_ref` and provenance metadata.
3. Derived artifacts MUST persist lineage to parent claims/evidence.
4. Ontology version tag MUST accompany each write (`ontology_version`).

## Versioning
- Version IDs follow `vMAJOR.MINOR`.
- Breaking type/relationship changes increment `MAJOR`.
- Backward-compatible expansions increment `MINOR`.

## Migration Discipline
- Every contract change requires:
  - migration spec,
  - rollback notes,
  - evidence of validator pass.
