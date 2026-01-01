# Data Integrity Evidence

This file captures deterministic graph production evidence for the ingest → entity resolution → canonical graph → simulation overlay flow. Record every run so auditors can verify reproducibility and confirm the overlay never mutates the canonical snapshot.

## Deterministic Run Log

| Run ID | Input Dataset | Commands Executed | Canonical Hash (SHA256) | Overlay Hash (SHA256) | Timestamp (UTC) | Notes |
| ------ | ------------- | ----------------- | ----------------------- | --------------------- | --------------- | ----- |
|        |               |                   |                         |                       |                 |       |

Use stable seeds and pinned container/tool versions. Repeat the run at least twice to prove the canonical hash remains constant.

## Recommended Procedure

1. Prepare inputs
   - Pin dataset version and store under `simulated_ingestion/` or an S3 object with a fixed version ID.
   - Export environment variables required for the ingest/ER pipeline.
2. Execute deterministic pipeline
   - Ingest → ER: `make ingest-er-deterministic` (or equivalent command used by the team).
   - Export canonical snapshot: `make canonical-export` → store in `docs/CERTIFICATION/artifacts/integrity/canonical.graphml` (or `.json`).
   - Apply simulation overlay: `make overlay-apply` using the exported canonical snapshot.
3. Compute hashes
   - Canonical: `sha256sum docs/CERTIFICATION/artifacts/integrity/canonical.graphml > docs/CERTIFICATION/artifacts/integrity/canonical.sha256`
   - Overlay: `sha256sum docs/CERTIFICATION/artifacts/integrity/overlay.graphml > docs/CERTIFICATION/artifacts/integrity/overlay.sha256`
4. Validate invariants
   - Canonical hash must remain identical across repeated runs with the same input.
   - Overlay must not change canonical hash; only overlay hash may differ if overlay inputs change.
   - Record any invariant checks (e.g., node/edge counts, schema fingerprints) below.

## Invariants Proven

Document the invariants validated during the deterministic run. Examples include:

- Canonical graph hash matches across N runs.
- Overlay application does not alter canonical hash.
- Node/edge counts match expected schema fingerprint.
- Failed edges/records count is zero (or documented).

## Artifact Layout (expected)

```
docs/CERTIFICATION/
├── integrity.md
└── artifacts/
    └── integrity/
        ├── canonical.graphml
        ├── canonical.sha256
        ├── overlay.graphml
        └── overlay.sha256
```

Store hashes alongside the exported snapshots. If artifacts are too large for the repo, attach them as CI artifacts and record the URLs and hashes in the run log above.
