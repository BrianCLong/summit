# Fixtures

Seed data containers for the local integration rig. Populate `small/` for smoke runs and `medium/` for end-to-end rehearsals.

- Keep payloads deterministic and self-contained.
- Prefer JSON or NDJSON where possible; include schema notes alongside binary assets.
- Align with `make e2e-001` so each stage can import its fixtures without manual tweaks.
