# Model Artifacts Security

Model files are pinned via SHA-256 hashes listed in `server/models/checksums.json`.
The CI workflow `sbom-models.yml` verifies these checksums and fails on mismatch.

## Storage
- Artifacts stored in a read-only, signed bucket.
- Access requires `MODEL_BUCKET_URL` and `MODEL_BUCKET_SIG` environment variables.

## Verification
- `DEEPFAKE_MODEL_PATH` environment variable points to the ONNX file.
- At load, `OnnxDeepfakeDetector` compares the file hash to `checksums.json`.
- Mismatched hashes prevent model execution.

## Operational Guidance
- Update `checksums.json` when adding new models.
- Rotate bucket credentials quarterly.
- Keep CPU-only fallback available to avoid GPU driver supply-chain risks.
