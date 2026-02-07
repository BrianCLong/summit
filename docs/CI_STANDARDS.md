# CI Standards & Quality Gates

This document defines the official Continuous Integration (CI) process for the IntelGraph Summit platform.

## Philosophy

Our CI philosophy is **Fast, Strict, and Consolidated**.

- **Fast**: We use caching and parallel jobs to keep feedback loops short.
- **Strict**: We enforce high standards (type safety, linting, security, testing) on every PR.
- **Consolidated**: We rely on a single "Quality Gate" workflow rather than many fragmented checks.

## The Official Pipeline: `pr-quality-gate.yml`

All Pull Requests targeting `main` or `develop` must pass the **PR Quality Gate**. This workflow replaces previous ad-hoc checks.

### 1. Static Checks & Security (Parallel)

This is the "Fail Fast" stage. If your code is messy or insecure, we stop here.

- **Lint & Format**: Runs `pnpm run lint`. Ensures code style and best practices.
- **Typecheck**: Runs `pnpm run typecheck`. Ensures strict type safety across the monorepo.
- **Security Audit**: Runs `pnpm run security:audit`. Checks for known vulnerabilities in dependencies.
- **Security Lint**: Runs `pnpm run security:lint`. Static analysis for security patterns.

### 2. Unit Tests

- Runs `pnpm run test:jest` with `JEST_RETRY_TIMES=1` so a single flake self-heals before blocking the build.
- Validates the logic of individual components in isolation.
- Includes both server-side and client-side unit tests.

### 3. Deterministic Build Attestation

- Runs a double-build to prove reproducibility (hash comparison between builds).
- Fails the gate if `package-lock.json` is mutated or build artifacts diverge between runs.

### 4. Integration Suite (merge-blocking)

- Runs `pnpm run test:integration -- --runInBand --retryTimes=1`.
- Executes golden-path smoke validation (`pnpm run test:smoke`) to ensure the end-to-end contract is intact on every merge.
- Uploads evidence artifacts for traceability.

### 5. Smoke Tests (The Golden Path)

This is the "End-to-End" verification.

- **Bootstrap**: Sets up the environment (`make bootstrap`).
- **Build**: Builds Docker images for API and Client.
- **Spin Up**: Starts the full stack (`make up`).
- **Smoke**: Executes `make smoke`, which runs critical path verifications (including Playwright E2E tests).

## How to Run Locally

You should simulate the CI checks locally before pushing.

```bash
# 1. Static Checks
pnpm lint
pnpm typecheck
pnpm security:scan

# 2. Unit Tests
pnpm test

# 3. Smoke Tests (Golden Path)
make bootstrap
make up
make smoke
```

## Troubleshooting CI Failures

- **Lint/Type Errors**: Fix the code. Do not suppress errors unless absolutely necessary (and documented).
- **Security Audit**: Update dependencies (`pnpm update`). If it's a false positive, add an exception to the audit configuration.
- **Smoke Tests**: Check the logs artifact or run `make smoke` locally to reproduce. Ensure your Docker environment is clean (`make down`).

### 6. Canary + Chaos Probes

- Runs `scripts/ci/canary-chaos.sh`, which executes the smoke suite as a canary and the `test:fuzz:graph-guardrails` chaos/fuzz harness with a seeded run for reproducibility.
- Produces `scripts/ci/canary-chaos.log` and `scripts/ci/canary-chaos-summary.json` as promotion evidence.

## Deployment Canary Gates (Promotion Blocking)

Production promotions must pass the canary gates in `.github/workflows/deploy-multi-region.yml`.
The gate runs **after deployment** and **before promotion** and blocks promotion on failure.

## Supply Chain Verification (Deployment Blocking)

Deployments must verify the container signature and SBOM attestations before any region rollout.
`.github/workflows/deploy-multi-region.yml` runs `scripts/ci/verify-sbom-signature.sh` as a
pre-deploy gate that fails closed if verification fails and emits a compliance receipt.

Receipt artifacts:

- Path: `artifacts/compliance-receipts/supply-chain-verification-<timestamp>.json`
- Artifact name: `supply-chain-compliance-receipts`

Local verification example:

```bash
scripts/ci/verify-sbom-signature.sh ghcr.io/org/app@sha256:...
```

### Metrics Gate (Prometheus)

- **Error rate**: `< 1%` over 5 minutes.
- **Latency p95**: `< 500ms` over 5 minutes.
- **Latency p99**: `< 1000ms` over 5 minutes.

### Synthetic Gate (k6)

- **Script**: `k6/slo-probe.js`
- **Thresholds** (enforced by k6):
  - p95 latency `< 200ms`
  - error rate `< 1%`
  - success rate `> 95%`

### Evidence & Logs

- Attach the GitHub Actions run link and any canary summaries to the evidence index:
  [`docs/observability/evidence/README.md`](observability/evidence/README.md).

## Workflow Maintenance

- **Adding Steps**: Only add steps to `pr-quality-gate.yml` if they are critical for _every_ PR. Niche checks should be separate or run on a schedule.
- **Performance**: Monitor execution time. If a job exceeds 10 minutes, investigate optimization (caching, splitting).

## Workflow Hygiene

To maintain a reliable and performant CI fleet, all workflows MUST adhere to these rules:

### 1. Correct Action Sequence (Node + pnpm)

`actions/setup-node` with `cache: 'pnpm'` performs store path resolution using the `pnpm` binary. If `pnpm` is not in the PATH, the step fails immediately.

**Required Pattern:**
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
```

### 2. Infinite Loop Prevention

Workflows that automatically commit or merge changes back into the default branch (e.g., `main`) must NEVER use `push: branches: [main]` as a trigger. This creates an infinite feedback loop that floods the CI queue.

**Use `schedule` or `workflow_dispatch` instead.**

## Release Evidence Pack

Release workflows produce a compliance evidence bundle to support attestations in
`ATTESTATION_SCOPE.md`. The reusable release workflow generates the following
artifacts and packs them into a single archive:

- `sbom.json` (CycloneDX SBOM)
- `vuln-report.json` (Trivy SBOM vulnerability report)
- `attestations/attestation-scope.json` (attestation scope hash + metadata)
- `policy/opa-decisions.json` (OPA policy decision logs)
- `deploy/deploy-metadata.json` (pipeline context metadata)
- `provenance.json` and `evidence-bundles/` manifest output

The release job bundles these into `evidence/pack-<release>.tgz` and uploads it
with the release artifacts.
