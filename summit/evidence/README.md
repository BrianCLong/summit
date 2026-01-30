# Summit Evidence Bundles

Deterministic evidence artifacts for CI + audit.

Bundle layout (per run):
  summit/evidence/runs/<run_name>/
    report.json
    metrics.json
    stamp.json   # timestamps allowed ONLY here
    index.json   # maps Evidence IDs -> files

See schemas in summit/evidence/schemas/.
