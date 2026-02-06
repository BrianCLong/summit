# Evidence Schema (Narrative Intel v1)

## Scope
This document defines the minimum JSON schema contract for narrative evidence bundles. The
contract enforces deterministic artifacts, prohibits timestamps outside of `stamp.json`, and
requires explicit evidence IDs.

## Required Files
Each evidence entry folder MUST contain:

- `report.json` (semantic narrative summary)
- `metrics.json` (quantitative metrics with stable keys)
- `stamp.json` (hash + provenance timestamp)

The bundle MUST include `evidence/index.json` to map evidence IDs to folder paths.

## Evidence IDs
Format: `EVD-<ITEMSLUG>-<AREA>-<NNN>`

Example: `EVD-narrative-io-interpretive-defaults-EVIDENCE-001`

## Timestamp Policy
- `stamp.json` is the **only** file allowed to include timestamp-like fields such as
  `timestamp`, `generated_at`, `generatedAt`, or `ts`.
- `report.json` and `metrics.json` must not contain those fields.

## Schema Files
The canonical JSON schemas live in:

```
src/graphrag/narratives/evidence/schemas/
```

They are validated by `.github/scripts/verify-evidence.ts` and by unit tests against deterministic
fixtures.
