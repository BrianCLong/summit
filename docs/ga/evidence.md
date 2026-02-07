# Evidence System v0 (IntelGraph Watchboard)

This document defines the deterministic evidence bundle used by the IntelGraph Watchboard v0
pipeline. Evidence bundles are write-once artifacts that support reproducible validation in CI.

## Contract

Evidence bundles MUST include the following files per run directory:

- `report.json`
- `metrics.json`
- `stamp.json` (the only file allowed to contain timestamps)

The root index `evidence/index.json` maps Evidence IDs to files. Evidence IDs follow the format:

```
EVD-IO-SITREP20260206-<AREA>-<NNN>
```

## Schemas

Schemas are defined at:

- `src/graphrag/evidence/schemas/report.schema.json`
- `src/graphrag/evidence/schemas/metrics.schema.json`
- `src/graphrag/evidence/schemas/stamp.schema.json`

The schema contract prohibits additional properties to keep evidence payloads stable and
predictable.

## Determinism

- Do not emit timestamps outside `stamp.json`.
- Use stable key ordering for JSON serialization.
- Regenerate `report.json` and `metrics.json` deterministically from the same inputs.

## Writer

The evidence writer is implemented in `src/graphrag/evidence/writeEvidence.ts` and writes the
bundle plus the root index. To disable writes in CI or development, set the kill switch:

```
EVIDENCE_WRITE=0
```

When disabled, the writer returns without writing any files.

## Evidence Index Shape

Example root index:

```json
{
  "entries": [
    {
      "evidence_id": "EVD-IO-SITREP20260206-INGEST-001",
      "files": [
        "evidence/SITREP-2026-02-06/report.json",
        "evidence/SITREP-2026-02-06/metrics.json",
        "evidence/SITREP-2026-02-06/stamp.json"
      ]
    }
  ]
}
```
