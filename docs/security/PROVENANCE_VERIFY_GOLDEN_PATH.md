# Verify Lanes and Golden Path Provenance

## Objective
Reduce CI wall-clock time by running verification steps in parallel while preserving deterministic, auditor-grade release provenance.

## Structure
1. Verify Fanout (merge train / PR):
   - deps_scan
   - typecheck
   - jest
   Each lane emits evidence artifacts under `evidence/verify/<lane>/`.

2. Golden Path (post-verify):
   - Performs a clean (hermetic) install and rebuild.
   - Generates:
     - SBOM (CycloneDX)
     - Rebuild manifest (paths + SHA256)
     - Provenance bundle referencing verify evidence by SHA256

## Determinism Requirements
- Evidence artifacts MUST NOT embed timestamps except in explicitly non-deterministic runtime metadata files.
- JSON output MUST be stable-rendered with sorted keys and stable list ordering.
- Golden path rebuild MUST NOT reuse node_modules from verify lanes.

## Integrity Checks
- The provenance bundle (`evidence/provenance.json`) MUST include SHA256 digests for every verify artifact referenced.
- CI MUST validate the digests prior to attestation (`scripts/ci/compare_artifact_hashes.mjs`).

## Outputs
- `evidence/verify/**` lane evidence
- `evidence/sbom.cdx.json`
- `evidence/rebuild-manifest.json`
- `evidence/provenance.json` (attested)
