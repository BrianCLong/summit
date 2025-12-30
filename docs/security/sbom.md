# Software Bill of Materials (SBOM)

This document describes how we generate SBOMs, the policies we evaluate against them, and how to reproduce the same steps locally.

## What we generate in CI

Pull requests targeting `main` now produce a CycloneDX SBOM and upload it as a build artifact. The pipeline:

1. Installs [Syft](https://github.com/anchore/syft) on the runner.
2. Runs [`scripts/generate-sbom.sh`](../../scripts/generate-sbom.sh) to emit `artifacts/sbom/sbom.json` in CycloneDX JSON format.
3. Executes a warn-only policy evaluation via [`scripts/sbom-policy-check.mjs`](../../scripts/sbom-policy-check.mjs). Any findings are emitted as GitHub Action warnings but do not fail the build while the check is in adoption mode.
4. Uploads `artifacts/sbom/sbom.json` as the `sbom-cyclonedx` artifact for downstream analysis and compliance evidence.

## Generating locally

### Prerequisites

- Node.js 18+ (for the policy script)
- [Syft](https://github.com/anchore/syft) installed on your PATH

macOS (Homebrew):

```bash
brew tap anchore/syft
brew install syft
```

Linux (curl):

```bash
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
```

### Commands

Generate the SBOM in the standard artifact location:

```bash
bash scripts/generate-sbom.sh .
```

Run the non-blocking policy evaluation against the generated SBOM:

```bash
node scripts/sbom-policy-check.mjs
```

To scan a different path or change the artifact location:

```bash
ARTIFACTS_DIR=my-artifacts bash scripts/generate-sbom.sh ./services/api
SBOM_FILE=my-artifacts/sbom.json node scripts/sbom-policy-check.mjs
```

## How the SBOM is used

- **Supply chain visibility:** The CycloneDX document inventories application and OS dependencies, enabling rapid impact analysis for advisories.
- **License hygiene:** The policy check flags GPL/AGPL/LGPL usage and missing identifiers as warnings to guide remediation.
- **Future gating:** The policy step currently runs in warn-only mode to avoid breaking builds; once coverage stabilizes we can flip it to blocking by removing `continue-on-error` in the workflow.
- **Artifact retention:** SBOM artifacts uploaded from PR workflows provide auditable evidence for compliance reviews and downstream security automation.
