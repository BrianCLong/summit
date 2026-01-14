# Evidence Bundle Runbook (GA)

## Purpose

The evidence bundle provides deterministic SBOM + SLSA provenance artifacts for
SOC2/ISO audit evidence and internal release validation. It packages everything
needed to verify software composition and build provenance offline.

## Generate Locally

```bash
pnpm ci:evidence:bundle
```

You can also run individual stages:

```bash
pnpm ci:sbom
pnpm ci:provenance
```

Artifacts are written to:

```
artifacts/evidence/<git-sha>/
```

## Verify Offline

```bash
pnpm ci:evidence:verify --bundle artifacts/evidence/<git-sha>
```

This recomputes hashes, validates schema fields, and checks for secret leakage
patterns. Verification fails if any required file is missing or modified.

## Manifest & Receipt Interpretation

- `manifest.json`: deterministic index of hashed files, policy hash, and tooling
  versions. It excludes CI metadata files to preserve determinism.
- `receipt.json`: human-readable summary with generation timestamps and counts.

## Policy Extension

Policy source of truth: `docs/ga/EVIDENCE_BUNDLE_POLICY.yml`.

Common updates:

- **Add new artifact glob**: append to `provenance.artifact_globs`.
- **Add workspace**: append to `sbom.workspaces.include`.
- **Change required files**: update `bundle.required_files` and
  `bundle.required_globs`.

After updates, run:

```bash
pnpm ci:evidence:bundle
pnpm ci:evidence:verify
```

## Known Limitations (Intentionally Constrained)

- SBOM generation is lockfile-derived (CycloneDX JSON only) to avoid external
  tooling and maintain determinism. SPDX output can be added when a deterministic
  generator is available.
- Workspace SBOMs capture direct dependencies from lockfile importers; transitive
  dependencies are present in the monorepo SBOM.
