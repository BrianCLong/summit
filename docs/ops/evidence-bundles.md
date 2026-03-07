# Evidence Bundles for Builds & Releases

This document defines the evidence bundle format and how to generate, publish, and verify bundles for every build and release.

## Bundle Contents

Each bundle captures what ran in CI and what artifacts were produced. Mandatory fields:

- **Git context**: full commit SHA, short SHA, branch/ref name, commit message.
- **Workflow metadata**: GitHub Actions run ID and URL, run attempt, workflow name, job name.
- **Test results**: summary string plus optional attached test report digests.
- **Security scans**: summary string plus optional scan report digests.
- **SBOM references**: path + SHA-256 for each SBOM file collected.
- **Artifact digests**: SHA-256 for build outputs (images, packages, tarballs, charts) and optional container image digests.
- **Attestations**: whether cosign signing was attempted, paths to signatures/certificates if present, provenance reference if emitted by CI.

## Format and Storage

- **File format**: JSON (`evidence-bundles/evidence-<full-sha>.json`).
- **Schema** (high level):
  - `version`: bundle schema version.
  - `generatedAt`: ISO8601 timestamp.
  - `git`: commit + branch metadata.
  - `workflow`: CI workflow/run identifiers and URLs.
  - `summary`: brief descriptions for tests and security scans.
  - `artifacts.files`: array of `{ name, path, sha256 }` for produced artifacts and reports.
  - `artifacts.images`: array of `{ name, digest }` for container images.
  - `artifacts.sboms`: array of `{ name, path, sha256 }` for SBOM files.
  - `attestations`: cosign + provenance metadata (if available).
  - `notes`: free-form message for incident/audit context.
- **Signing**: if cosign is available and `EVIDENCE_SIGN=true`, the generator signs the JSON with keyless `cosign sign-blob`, storing signature + certificate next to the bundle.
- **Provenance**: if an external SLSA workflow emits provenance, set `SLSA_PROVENANCE_PATH` to embed that reference in `attestations.provenance`.

## Evidence Collector Script

`scripts/ops/generate-evidence-bundle.ts` ingests environment variables from CI to build the bundle:

- **Inputs**
  - `GITHUB_SHA`, `GITHUB_REF`, `GITHUB_REF_NAME`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, `GITHUB_REPOSITORY`, `GITHUB_SERVER_URL`, `GITHUB_WORKFLOW`, `GITHUB_JOB` (auto-populated by GitHub Actions).
  - `ARTIFACT_PATHS`, `SBOM_PATHS`, `TEST_REPORTS`, `SECURITY_REPORTS` (comma-separated paths to include and hash).
  - `IMAGE_DIGESTS` (comma-separated `name=digest` pairs).
  - `TEST_RESULTS_SUMMARY`, `SECURITY_SCAN_SUMMARY`, `EVIDENCE_NOTES` (free-form context strings).
  - `EVIDENCE_SIGN=true` to attempt cosign signing when the binary is already available; `SLSA_PROVENANCE_PATH` to record a provenance artifact emitted elsewhere in the workflow.
  - CLI flags mirror the env lists: `--artifact=...`, `--sbom=...`, `--test-report=...`, `--security-report=...`.
- **Outputs**
  - `evidence-bundles/evidence-<sha>.json` with all collected fields.
  - Optional `.sig` and `.crt` files if cosign signing is enabled.
- **Invocation**
  - Local example: `GITHUB_SHA=$(git rev-parse HEAD) GITHUB_REF_NAME=$(git rev-parse --abbrev-ref HEAD) TEST_RESULTS_SUMMARY="Local dry run" ts-node scripts/ops/generate-evidence-bundle.ts --artifact=package.json`.
  - CI examples are wired into `ci-cd.yml` and `release.yml` (see below).

## CI Integration

### Continuous Integration (main + PRs)

- Workflow: `.github/workflows/ci-cd.yml` (build-and-test job).
- After tests, the job invokes the generator to capture commit + workflow metadata, and uploads `evidence-bundles/evidence-<sha>.json` as a workflow artifact named `evidence-bundle-<sha>`.

### Release Pipeline (main branch)

- Workflow: `.github/workflows/release.yml`.
- After packaging the release tarball, the workflow runs the generator with `ARTIFACT_PATHS` pointing at the bundle and uploads the resulting evidence JSON as an artifact named `release-evidence-<sha>`.

### Additional Notes

- The generator is fast and non-blocking; missing files are recorded but do not fail the job.
- Cosign/SLSA hooks only run if the tooling is already available in the environment.

## Locating Evidence

- **Per commit**: Navigate to the CI run for the commit and download the `evidence-bundle-<sha>` artifact. The file name inside the archive is `evidence-bundles/evidence-<sha>.json`.
- **Per release/tag**: For release runs on `main`, download the `release-evidence-<sha>` artifact or, if signing is enabled, the adjacent `.sig`/`.crt` files.

## Validating Evidence

1. **Digest checks**
   - For files listed under `artifacts.files` or `artifacts.sboms`, recompute `sha256sum <file>` and compare to the recorded `sha256` value.
2. **Image digests**
   - Compare the `artifacts.images` entries to registry digests (e.g., `crane digest <image>` or `skopeo inspect`).
3. **Signature verification (optional)**
   - If `attestations.cosignSigned` is true, verify with `cosign verify-blob --certificate <bundle>.crt --signature <bundle>.sig <bundle>`. The certificate identity should match the repository workflow OIDC issuer.
4. **Provenance linkage**
   - If `attestations.provenance` points to a provenance file, verify it using your SLSA tooling and confirm the subject matches the recorded artifact digests.

## Using Bundles for Audits

- Attach the bundle JSON (and signatures, if present) to incident reviews or change records.
- The `summary` block provides quick answers for "what tests ran" and "what security checks were enforced"; the `artifacts` lists give direct hash evidence for every shipped asset.
- Because bundles are keyed by commit SHA, evidence can be correlated to tags/releases without ambiguity.

## Retention

Retention of evidence bundles is governed by the [Ops Evidence Retention Policy](../governance/OPS_EVIDENCE_RETENTION_POLICY.md).
