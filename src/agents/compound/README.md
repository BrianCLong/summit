# Compound Loop Evidence (Plan → Work → Assess → Compound)

This module provides deterministic evidence emitters and schema validation for the Summit compound loop.
It is intentionally thin: emit JSON artifacts, validate them against strict schemas, and keep timestamps
isolated to `stamp.json`.

## Evidence bundle

Each run emits:

- `report.json` (plan, work summary, assess rubrics, compound memory updates)
- `metrics.json` (counts, outcomes)
- `stamp.json` (timestamps + git provenance)
- `index.json` (maps Evidence IDs → file paths)

## Determinism rules

- Only `stamp.json` contains timestamps.
- Schemas use `additionalProperties: false`.
- JSON output is stable with 2-space indentation and newline at EOF.

## Governance references

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Evidence schema contract: `docs/governance/evidence-schema.md`
