# SBOM Generation

This document describes how to generate Software Bill of Materials (SBOM) for the project.

## Overview

The SBOM generation is automated via GitHub Actions in the `.github/workflows/sbom.yml` workflow. It runs on push to `main` and generates an SPDX JSON report using [Syft](https://github.com/anchore/syft).

## Running Locally

To generate an SBOM locally, you need to have `syft` installed.

### Installation

**macOS (Homebrew):**
```bash
brew tap anchore/syft
brew install syft
```

**Linux (curl):**
```bash
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
```

### Usage

To scan the current directory and generate an SBOM in SPDX JSON format:

```bash
syft . -o spdx-json=sbom.spdx.json
```

To view the SBOM in a human-readable table format:

```bash
syft .
```

## Interpreting Output

The SBOM contains a list of all dependencies detected in the repository, including:
- NPM packages
- Python packages
- Go modules
- Rust crates
- OS packages (if running in a container)

### Key Fields

- **name**: The name of the package.
- **version**: The version of the package.
- **type**: The ecosystem (e.g., `npm`, `python`, `go`).
- **purl**: Package URL, a standard identifier for the package.
- **license**: License information detected for the package.

## CI Workflow

The workflow `.github/workflows/sbom.yml` performs the following steps:
1.  Checkouts the code.
2.  Runs `anchore/sbom-action` to generate `sbom.spdx.json`.
3.  Uploads the generated file as an artifact named `sbom-spdx-json`.

Artifacts are retained for 14 days.
