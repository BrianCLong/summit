# GA Evidence Bundle: SBOM + SLSA Provenance

Implement deterministic, audit-ready evidence bundling for CI and releases.

## Scope

- Scripts in `scripts/ci/` for SBOM generation, provenance capture, bundle assembly, and verification.
- Policy and schema docs under `docs/ga/`.
- CI wiring in `.github/workflows/ci-core.yml`.
- Repo wiring updates in `package.json`, `agent-contract.json`, and `docs/roadmap/STATUS.json`.

## Requirements

- CycloneDX JSON SBOMs (lockfile-derived fallback).
- SLSA provenance statement and deterministic manifest.
- Dependency-free verifier for offline validation.
- CI job that generates, verifies, and uploads bundle artifacts.
