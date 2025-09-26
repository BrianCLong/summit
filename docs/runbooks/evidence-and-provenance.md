# Evidence & Provenance

## What to Persist
- CI artifacts under `reports/` → copy to `evidence/ci/<date>/<sha>/`.
- Checksums: compute SHA‑256 for each evidence file; store as `manifest.json`.

## Manifest Entry (example)
```json
{"kind":"ci-evidence","sha":"<sha>","paths":["reports/junit-trajectory.xml","reports/grounding.sarif"],"hash":"<sha256>"}
```

## Provenance Tips

* Attach CI evidence to release assets on tag cut (e.g., `v0.3.1-mc`).
* Keep immutable copies for compliance reviews.
