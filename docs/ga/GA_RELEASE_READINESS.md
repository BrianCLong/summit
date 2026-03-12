# Summit GA Release Readiness

## Release Surface

Summit GA release artifacts are generated from the controlled release surface in `.repoos/release/release-surface.json`, covering core services, container definitions, deploy components, and build entrypoints.

## Artifact Integrity

Deterministic release outputs are:

- `release/manifest.json`
- `release/sbom.json`
- `release/provenance.json`

These artifacts are verification inputs for `scripts/release/verify-release.mjs` and are validated as hash-linked subjects in provenance.

## SBOM Coverage

SBOM generation is automated through `scripts/release/generate-release-artifacts.mjs`.

- Primary engine: `syft` CycloneDX JSON output.
- Fallback mode: deterministic CycloneDX assembly from package metadata.
- Output path: `release/sbom.json`.

## Provenance Attestation

`release/provenance.json` provides SLSA-style attestation fields:

- source commit SHA
- builder workflow identity
- digest subjects for manifest/SBOM/release surface
- lockfile dependency fingerprint

## Verification Process

Verification command:

```bash
node scripts/release/verify-release.mjs
```

Verifier output:

- `.repoos/evidence/release-verification-report.json`

The verifier fails on missing artifacts, digest mismatch, provenance contract violations, and non-deterministic timestamp keys.

## Rollback Procedure

Rollback execution is governed by `release/rollback-spec.md` and requires:

1. rebuild from prior known-good commit,
2. verification pass before promotion,
3. documented recovery + evidence linkage.
