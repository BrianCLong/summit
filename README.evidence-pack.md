# Evidence Pack (PR UX)

This workflow posts a small verification summary to the PR’s **GitHub Step Summary** and attaches an `evidence-<PR>.tar.gz` bundle containing:
- `provenance.slsa.json`
- `sbom.spdx.json` (or `bom.cyclonedx.json`)
- `openlineage_run.json`
- `ci_runtime.json` (runtime + sparklines)

## Why
Reviewers see trustworthy signals inline, then download a full, audit-ready pack when needed.

## Configure (optional)
- `OPENLINEAGE_URL`, `OPENLINEAGE_NAMESPACE` → repo/environment variables.
- Provide signed build artifacts in `dist/` to enable cosign verification.

## Rollback / Disable
- Delete `.github/workflows/evidence-pack.yml` (full removal), or
- Set `on: pull_request` → `on: workflow_dispatch` to pause.

## Success Metrics
A) Artifact bundle attached on 100% of PRs
B) Verification-pass rate (cosign + JSON schema) ≥ 98%
C) Reviewer median time-to-decision ↓ ≥ 20%
D) Artifact download / evidence-inspection rate trending up
