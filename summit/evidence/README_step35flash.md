# Step 3.5 Flash Evidence Artifacts

Each run MUST emit:
- `report.json` (human-readable summary)
- `metrics.json` (numbers only)
- `stamp.json` (timestamps live ONLY here)
- `evidence/index.json` (maps Evidence IDs -> files)

Evidence IDs format: `EVD-step35flash-<area>-<nnn>`

## Determinism Rule

No timestamps or random IDs outside `stamp.json`.
All other files must be deterministic (byte-for-byte identical for same inputs).
