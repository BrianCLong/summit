# Release Train

This document describes the "Release Train" pipeline, a unified workflow for building, packaging, verifying, and preparing releases of the platform.

## Overview

The Release Train workflow (`.github/workflows/release-train.yml`) is designed to produce consistent, verified build artifacts. It runs in two modes:

1.  **Dry-Run Mode:** Triggered automatically on Pull Requests. It builds packages and generates compliance artifacts (SBOM, Evidence) but does not publish them.
2.  **Manual Trigger:** Can be manually triggered via GitHub Actions UI (`workflow_dispatch`). This currently functions identically to the dry-run but serves as the skeleton for future automated publication.

## Workflow Steps

### 1. Build & Package

- **Triggers:** Code changes, Manual dispatch.
- **Action:**
  - Installs dependencies (detecting lockfiles).
  - Executes `npm run build` to compile the application (Client and Server).
  - Uploads build artifacts (e.g., `client/dist`, `server/dist`) as GitHub Artifacts.

### 2. Generate SBOM

- **Action:**
  - Uses `syft` to scan the codebase/artifacts.
  - Executes the SBOM generation script (`scripts/compliance/generate_sbom.sh`) if present.
  - Produces CycloneDX JSON SBOMs for all detected modules.
  - Uploads SBOMs as `sbom-artifacts`.

### 3. Generate Provenance

- **Action:**
  - Executes the evidence generation script (`scripts/compliance/generate_evidence.ts`) if present to simulate/generate an auditor evidence bundle.
  - This bundle serves as internal provenance/attestation for the build.
  - Uploads the bundle as `evidence-bundle`.

## Artifacts Produced

| Artifact Name     | Description                                            | Retention |
| :---------------- | :----------------------------------------------------- | :-------- |
| `client-dist`     | Compiled static assets for the Frontend Client.        | 5 days    |
| `server-dist`     | Compiled JavaScript/TypeScript for the Backend Server. | 5 days    |
| `sbom-artifacts`  | CycloneDX SBOMs for all modules.                       | 90 days   |
| `evidence-bundle` | Compliance evidence and control verification data.     | 90 days   |

## Usage

### Running a Dry Run

Simply open a Pull Request against `main`. The "Release Train" workflow will appear in the checks list.

### Triggering a Release Build (Manual)

1.  Go to the "Actions" tab in GitHub.
2.  Select "Release Train" from the left sidebar.
3.  Click "Run workflow".
4.  Select the branch (usually `main`).
5.  Click "Run workflow".

## Future Enhancements

- Integration with `semantic-release` for versioning.
- Container registry publishing (`docker push`).
- NPM registry publishing.
- SLSA provenance generation (level 3).
