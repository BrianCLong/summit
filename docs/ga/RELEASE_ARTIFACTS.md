# GA Release Artifacts

This document defines the canonical build outputs for a General Availability (GA) release of the Summit platform. It serves as the single source of truth for what constitutes a release, where artifacts are located, and how they are versioned.

## Core Principles

1.  **Immutability**: Once a release is tagged (e.g., `ga/v1.2.3`), the generated artifacts are locked and must not be changed. Any modification requires a new release.
2.  **Traceability**: Every artifact must be traceable to a specific Git commit hash and version tag.
3.  **Reproducibility**: A fresh checkout at a specific GA tag must produce byte-for-byte identical artifacts when the build process is re-run.

## Release Directory Structure

All GA release artifacts are placed in the `dist/release/` directory. The structure is as follows:

```
dist/release/
├── server/
│   └── summit-server.tar.gz
├── client/
│   └── summit-client.tar.gz
├── cli/
│   └── summit-cli.tar.gz
├── sbom/
│   ├── server.json
│   ├── client.json
│   └── cli.json
├── provenance/
│   ├── server.json
│   ├── client.json
│   └── cli.json
└── manifest.json
```

## Artifact Naming Conventions

-   **Artifacts**: Artifacts are packaged as gzipped tarballs (`.tar.gz`). The naming convention is `<component_name>.tar.gz`.
-   **SBOMs & Provenance**: The corresponding SBOM and provenance files are named `<component_name>.json` and placed in their respective directories.

## Canonical Artifacts

| Component | Artifact Path              | SBOM Path              | Provenance Path              | Description                                      |
| :-------- | :------------------------- | :--------------------- | :--------------------------- | :----------------------------------------------- |
| **Server**  | `server/summit-server.tar.gz` | `sbom/server.json`     | `provenance/server.json`     | The main backend application server.             |
| **Client**  | `client/summit-client.tar.gz` | `sbom/client.json`     | `provenance/client.json`     | The web-based user interface.                    |
| **CLI**     | `cli/summit-cli.tar.gz`       | `sbom/cli.json`        | `provenance/cli.json`        | The command-line interface for administration.   |

## Release Manifest

The `manifest.json` file is the root of a release. It contains a list of all artifacts with their versions, hashes, and references to their corresponding SBOM and provenance files. Its structure is validated against the `manifest.schema.json`.
