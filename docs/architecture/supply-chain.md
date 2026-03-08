# Supply Chain Architecture

This document describes the supply chain security architecture for Summit.

## Overview

The supply chain pipeline ensures that all artifacts deployed to production are:
1. Built from a known source commit.
2. Built in a secure environment.
3. Attested with SBOM and Provenance.
4. Signed.
5. Verified before deployment.

## Evidence Framework

We generate deterministic evidence for every build.
ID Format: `sc-${GIT_SHA}-${CI_RUN_ID}-${TARGET}`

Artifacts:
- `stamp.json`: Basic metadata (commit, workflow, etc).
- `metrics.json`: Build metrics (size, package count).
- `report.json`: Verification results.

## Workflow

1. **Build**: Docker Buildx generates image + SBOM + Provenance.
2. **Attest**: Cosign signs the image and attaches attestations.
3. **Verify**: Policy Controller in Kubernetes enforces valid signatures and attestations.
