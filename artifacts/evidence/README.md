# Evidence bundle staging area

Automated evidence bundles are written here by default as `evidence-<short-sha>-<timestamp>/`.

This directory is intentionally tracked so CI and auditors have a stable, canonical location for generated bundles.

Each bundle should include a `manifest.json` index under `artifacts/evidence/<sha>/` to record hashes,
provenance, and production metadata for verification.
