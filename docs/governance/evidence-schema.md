# Evidence Schema (Narrative IO v1)

This document defines the minimal evidence bundle contract for Narrative IO Lane 1. It is the
canonical reference for evidence index structure, per-evidence file requirements, and timestamp
containment rules for auditability.

## Scope

- Applies to `evidence/index.json` and all evidence files referenced by the index.
- Enforced by the `verify-evidence` gate and fixture tests.

## Required Files

Each evidence entry listed in `evidence/index.json` MUST provide:

- `report.json` (semantic summary)
- `metrics.json` (quantitative metrics)
- `stamp.json` (timestamp + provenance)

## Timestamp Containment Rule

Timestamp-like fields are permitted **only** inside `stamp.json`. The following keys are treated as
timestamp-like and must not appear elsewhere:

- `timestamp`
- `generated_at`
- `generatedAt`
- `generated_at_utc`
- `ts`

## Schema Sources

The canonical JSON Schemas live at:

- `src/graphrag/narratives/evidence/schemas/evidence-index.schema.json`
- `src/graphrag/narratives/evidence/schemas/report.schema.json`
- `src/graphrag/narratives/evidence/schemas/metrics.schema.json`
- `src/graphrag/narratives/evidence/schemas/stamp.schema.json`

## Verification

Use `.github/scripts/verify-evidence.ts` to validate evidence bundles locally or in CI:

```bash
pnpm exec ts-node --esm .github/scripts/verify-evidence.ts
```

The verifier enforces schema conformance and the timestamp containment rule. Violations are
blocking by default.
