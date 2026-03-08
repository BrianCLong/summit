# CI Reproducibility Gate Design Specification

## Goal
To ensure that every release produced by the Summit CI pipeline is bit-for-bit reproducible and verifiable against a signed build manifest.

## Manifest Schema (`run-manifest.json`)
```json
{
  "version": "1.0",
  "build": {
    "id": "github-run-id",
    "timestamp": "iso-8601",
    "commit": "sha"
  },
  "environment": {
    "node_version": "v20.x",
    "pnpm_version": "8.x",
    "os": "ubuntu-latest"
  },
  "inputs": {
    "pnpm_lock_hash": "sha256",
    "source_blueprint_hash": "sha256"
  },
  "outputs": {
    "artifacts": [
      { "path": "server/dist/index.js", "hash": "sha256" }
    ]
  }
}
```

## Deterministic Hash Contract
1. **Source Hash**: Includes `pnpm-lock.yaml`, `package.json`, and core config files.
2. **Environment Normalization**: Node/pnpm versions must be pinned.
3. **Build Reproducibility**: Build artifacts must match hashes in the manifest when re-run in a clean environment.

## Replay Strategy
1. Fetch `run-manifest.json` from the release artifact.
2. Re-run build using `scripts/ci/repro-verify.sh`.
3. Compare hashes using `node scripts/ci/run-manifest.js --verify`.

## Integration
- Integrated into `main-validation.yml`.
- Required for all Golden Path releases.
