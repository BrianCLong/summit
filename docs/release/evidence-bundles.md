# Evidence Bundles

Evidence bundles package everything required to reproduce, verify, and audit a release train. Bundles are produced automatically by GitHub Actions and attached to every published release tag.

## Contents
- **Release metadata:** `release-metadata.json` and `release-metadata.yaml` conforming to `release-metadata.schema.*`.
- **SBOM:** SPDX JSON generated from the repository at the release commit.
- **Checksums:** SHA256 digests for every evidence file and the final archive.
- **Release notes:** Snapshot of the GitHub Release body at publish time.
- **Provenance hooks:** Workflow run identifiers and commit SHAs for reproducibility.

## Generation Workflow
- Workflow: `.github/workflows/release-train-evidence.yml`.
- Triggers: `release` (published) and manual `workflow_dispatch` for dry runs.
- Key steps:
  1. Checkout the tagged commit with full history.
  2. Generate SBOM via `syft`.
  3. Build `release-metadata.json` and `release-metadata.yaml` using repository context and validate against `docs/release/release-metadata.schema.json`.
  4. Capture release notes from the GitHub event payload.
  5. Tar and checksum the evidence directory, upload as a workflow artifact, and attach to the GitHub Release.

## Consumption
1. Download `release-evidence-<tag>.tar.gz` from the GitHub Release assets.
2. Verify checksum:
   ```bash
   sha256sum -c release-evidence-<tag>.tar.gz.sha256
   ```
3. Inspect metadata:
   ```bash
   cat release-metadata.json | jq '.release'
   ```
4. Validate against the schema (optional locally):
   ```bash
   python -m jsonschema -i release-metadata.json docs/release/release-metadata.schema.json
   ```

## Expectations
- Every GA release tag ships with a corresponding evidence bundle.
- Evidence artifacts are immutable and tied to a commit SHA plus pipeline run ID.
- The schema ensures consistent structure so downstream audit tooling can ingest bundles without manual normalization.
