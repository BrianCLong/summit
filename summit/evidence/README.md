# Summit Evidence System

This folder defines the deterministic evidence contract used by CI and runtime
exporters.

Required per Evidence ID bundle:

- report.json
- metrics.json
- stamp.json (timestamps allowed only here)

Global:

- summit/evidence/index.json maps Evidence IDs to their report/metrics/stamp
  file paths.
