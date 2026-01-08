# Provenance and SBOM Generation

This document outlines the process for generating SLSA provenance and SBOMs for this project's build artifacts. Our process is built on the principle of a single source of truth for what constitutes a release artifact, which is defined by the `scripts/release/build-artifacts.ts` script.

## What is a "Real Artifact"?

A "real artifact" in this repository is a file that is produced as a result of the canonical build process (`pnpm build`). These artifacts are the distributable assets that are deployed to our environments. The `scripts/release/build-artifacts.ts` script is responsible for orchestrating the build, collecting these artifacts, and creating a manifest that describes them.

The output of this script is a `dist/` directory containing:

- The build artifacts.
- A `manifest.json` file with artifact checksums and build metadata.
- A `checksums.txt` file for easy verification.
- An `sbom.json` file.

## How to Run the Build Locally

You can run the build and artifact generation process locally by executing the `build-artifacts.ts` script:

```bash
pnpm exec tsx scripts/release/build-artifacts.ts
```

### Dry Run

To simulate the process without actually running the build or creating files, use the `--dry-run` flag:

```bash
pnpm exec tsx scripts/release/build-artifacts.ts --dry-run
```

### Custom Output Directory

To specify a different output directory, use the `--out-dir` flag:

```bash
pnpm exec tsx scripts/release/build-artifacts.ts --out-dir /tmp/my-artifacts
```

## Where to Find Artifacts in GitHub Actions

The build artifacts, including the `dist/` directory, the SBOM, and the SLSA provenance attestation, are uploaded as artifacts in the `slsa-provenance` workflow on GitHub Actions. You can find them in the "Artifacts" section of the workflow run summary.

## How Verification Works

The `slsa-provenance` workflow includes a `verify` job that runs after the provenance is generated. This job performs the following checks:

1.  **Checksum Verification**: It downloads the `dist/` directory and verifies the integrity of the artifacts by running `sha256sum -c checksums.txt`. This ensures that the artifacts were not corrupted during the upload/download process.
2.  **SLSA Provenance Verification**: It uses the `slsa-verifier` tool to verify the SLSA attestation. This confirms that the provenance is valid and that it corresponds to the build that produced the artifacts.

### Common Failure Modes

- **Checksum Mismatch**: This indicates that an artifact was modified after it was built and checksummed.
- **Invalid SLSA Attestation**: This can happen if the provenance was tampered with or if there is a mismatch between the expected and actual build process.
