# Release Promotion Workflow

This document describes the immutable release promotion pipeline.

## Overview

The workflow follows a "build once, promote many" philosophy.
1. **Build**: A release artifact is built, digested, and signed (or attested). A Release Manifest is generated.
2. **Promote**: The exact same artifact is promoted to downstream environments (Dev -> Staging -> Prod) by referencing its immutable digest.

## Release Manifest

The source of truth for a release is `release/out/release-manifest.json`.
It adheres to the schema defined in `release/schema/release-manifest.schema.json`.

### Structure

```json
{
  "schemaVersion": "1.0.0",
  "gitSha": "...",
  "buildTimestamp": "...",
  "artifacts": [
    {
      "name": "primary-image",
      "type": "docker-image",
      "digest": "sha256:...",
      "uri": "ghcr.io/..."
    }
  ],
  "sbomReference": { ... },
  "evidenceReference": { ... },
  "attestation": {
    "status": "disabled",
    "issueLink": "..."
  }
}
```

## How to Build (CI)

The `Release Build` workflow runs on main branch merges.
It produces a `release-bundle-{SHA}` artifact containing the manifest.

To run locally (manifest generation):

```bash
pnpm release:manifest:generate --sha $(git rev-parse HEAD) --image-digest sha256:mock --image-uri mock-uri
```

## How to Promote

Trigger the `Release Promotion` workflow manually.
**Inputs:**
- `release_ref`: The Git SHA of the commit that was built.
- `target_env`: `dev`, `staging`, or `prod`.

The workflow:
1. Downloads the release bundle.
2. Verifies the manifest schema and integrity.
3. Checks that artifacts exist.
4. "Promotes" (records the action) without rebuilding.

## Verification

The manifest is verified using `scripts/release/verify_release_manifest.ts`.

```bash
pnpm release:manifest:verify
```

## Signing

Currently, signing is stubbed.
To enable:
1. Set up Cosign or similar tool in CI.
2. Update `scripts/release/generate_release_manifest.ts` to capture signatures.
3. Update verification script to validate signatures.
4. Change `attestation.status` to `enabled` in the generator.
