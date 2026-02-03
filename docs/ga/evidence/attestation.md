# EV_ATTESTATION_V1 — Build Attestation

## Description
Build Attestations provide a machine-readable proof that a specific commit on `main` matches the inputs that were used in the CI process.

## What it Proves
- **Source Integrity:** confirms that the files hashed in CI match the files in the repository at the given SHA.
- **Dependency Stability:** includes hashes of lockfiles (`pnpm-lock.yaml`).
- **Toolchain Consistency:** records versions of Node and pnpm used during the process.

## Evidence Artifacts
- `attestation.json`: the core deterministic payload.
- `report.json`: validation results.
- `metrics.json`: counts and digests.
- `stamp.json`: linkage to the build run and commit time.

## Storage
Attestations are stored in the provenance bucket at:
`provenance/<sha>/attestation.json`
