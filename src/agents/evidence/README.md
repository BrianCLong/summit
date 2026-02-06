# Agent Evidence Bundles

This directory contains the evidence bundle schemas and writers for agent ops
tracing. Bundles are deterministic and deny-by-default:

- Output files are fixed: `report.json`, `metrics.json`, `stamp.json`,
  `evidence/index.json`.
- `report.json` and `metrics.json` contain no timestamps.
- All object keys are sorted before serialization.
- Redaction replaces never-log fields with `[REDACTED]`.

Evidence IDs follow the format `EVD-OMC-<AREA>-<NNN>`.
