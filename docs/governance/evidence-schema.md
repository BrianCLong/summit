# Evidence Schema Contract (Compound Loop)

This contract standardizes the evidence artifacts for compound-loop execution. It is the single source
of truth for schema expectations and determinism rules.

## Required artifacts

- `report.json` (semantic: plan/work/assess/compound)
- `metrics.json` (quantitative: counts/outcome)
- `stamp.json` (hash + provenance timestamps)
- `index.json` (Evidence ID map)

## Determinism rules

- `additionalProperties: false` for all schemas.
- Only `stamp.json` may contain timestamp values.
- JSON output must be stable (2-space indentation, newline at EOF).

## Schema locations

- `src/agents/compound/evidence/schemas/report.schema.json`
- `src/agents/compound/evidence/schemas/metrics.schema.json`
- `src/agents/compound/evidence/schemas/stamp.schema.json`
- `src/agents/compound/evidence/schemas/index.schema.json`

## Evidence IDs

Evidence IDs use: `EVD-CLAUDE-COMPOUND-<AREA>-<NNN>`.
