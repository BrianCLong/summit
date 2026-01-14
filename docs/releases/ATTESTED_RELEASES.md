# Attested Releases (GA)

## Overview

The attested release pipeline produces verifiable, deterministic release bundles for GA tags
(`vX.Y.Z`). Each run builds publishable packages, generates SBOMs, creates an evidence bundle,
attests artifacts with GitHub OIDC, and attaches assets to the GitHub Release.

## How to cut a release

1. Ensure the target commit is on `main` and has passed the required release gates.
2. Create and push a GA tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The `release-attested` workflow runs automatically on the tag.

## Release assets produced

Each GA tag generates a deterministic asset bundle under:

```
artifacts/release/<tag>/
```

Contents:

- `packages/*.tgz`: tarballs for each publishable workspace package.
- `sbom/*.sbom.json`: per-workspace SBOMs.
- `sbom/monorepo.sbom.json`: aggregated monorepo SBOM.
- `evidence/`: evidence bundle directory (manifest + `evidence-<sha>.zip`).
- `manifest.json`: asset manifest with hashes, sizes, and metadata.
- `manifest.sha256`: checksum for `manifest.json`.
- `notes.md`: release notes stub with verification instructions.

All assets are attached to the GitHub Release for the tag.

## Offline verification

Download the release assets bundle and run:

```bash
pnpm release:verify -- --dir artifacts/release/<tag>
```

Verification checks:

- SHA-256 hashes and sizes match the manifest.
- SBOM JSON is present and parseable.
- Evidence bundle passes `scripts/evidence/verify_evidence_bundle.mjs`.
- Tag/commit linkage is enforced in CI when `GITHUB_REF`/`GITHUB_SHA` are set.
- Attestations are verified with the GitHub CLI when available.

To bypass attestation checks in a disconnected environment:

```bash
pnpm release:verify -- --dir artifacts/release/<tag> --no-require-attestations
```

## Attestations

The workflow uses GitHub OIDC-based attestations (`actions/attest-build-provenance`) to produce
verifiable provenance for release assets. Attestations are verified with:

```bash
gh attestation verify <asset-path> --repo <owner>/<repo>
```

## Enabling publishing safely (Trusted Publishing)

Publishing is disabled by default. To enable:

1. Configure npm Trusted Publishing for each package in npm (OIDC via GitHub Actions).
2. Set the repository variable `PUBLISH_ENABLED=1`.
3. Ensure tags are created from commits reachable from `main`.

When enabled, the workflow publishes via:

```
pnpm -r publish --access public --no-git-checks
```

No long-lived secrets are required when npm Trusted Publishing is configured.
