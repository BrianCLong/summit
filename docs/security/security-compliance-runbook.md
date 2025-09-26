# Security Compliance Runbook

## Overview
The **Security Compliance Checks** GitHub Actions workflow enforces automated
policy and vulnerability controls whenever a pull request is opened or updated
and on merges to `main`. The pipeline covers two layers:

1. **OPA policy enforcement** – Helm charts are rendered and evaluated with
   Conftest using the `kubernetes.compliance` policy package.
2. **Trivy vulnerability scanning** – Helm charts are scanned for
   misconfigurations and key Docker images are built and scanned for
   vulnerabilities.

Both stages must pass for merges protected by the workflow.

## Workflow topology
- **Location:** `.github/workflows/security-compliance.yml`
- **Triggers:** `pull_request` (opened, synchronize, reopened,
  ready_for_review) and `push` to `main`.
- **Jobs:**
  - `conftest` renders each Helm chart discovered under `infra/helm` and runs
    `conftest test` with policies from `policies/opa/kubernetes`.
  - `trivy` depends on `conftest`, installs Trivy, scans Helm charts with
    `trivy config`, then builds two baseline Docker images (`.` and `server/`)
    and executes `trivy image`.
- **Concurrency:** A single workflow per ref via
  `security-compliance-${{ github.ref }}` ensures the latest run wins.

## Policy package
- **Source:** `policies/opa/kubernetes/workload.rego`
- **Rules enforced:**
  - Containers must run as non-root (pod-level or per-container security
    context).
  - Containers must set `readOnlyRootFilesystem: true`.
  - Container images must pin a tag or digest and may not use the `latest`
    mutable tag.
- **Extensibility:** Additional `deny` rules can be appended to the same
  package. Each rule emits human-readable violation messages surfaced in the
  workflow logs.

## Trivy coverage
- **Helm charts:** Every chart beneath `infra/helm` is scanned with
  `trivy config --severity HIGH,CRITICAL --helm-chart <path>`.
- **Docker images:** The workflow builds images for the repository root
  `Dockerfile` and `server/Dockerfile`. Adjust the associative array in the
  `Build & scan Docker images with Trivy` step to add more contexts. Images are
  tagged `ghcr.io/summit/<name>:ci-<sha>` for isolation and removed after the
  scan completes.

## Responding to failures
1. **Identify the failing job:** Open the workflow run and inspect the failing
   step for the Conftest or Trivy job.
2. **OPA violations:** Review the `deny` messages to determine which manifest
   and container triggered the rule. Update the Helm values/templates to comply
   or, if a temporary exception is required, discuss adding a scoped policy
   override.
3. **Trivy findings:**
   - *Config scan:* Adjust the chart to remediate HIGH/CRITICAL
     misconfigurations.
   - *Image scan:* Upgrade dependencies in the Dockerfile or add fixed package
     versions. Rebuild locally with `docker build` and re-run
     `trivy image --severity HIGH,CRITICAL <image>` before pushing changes.
4. **Re-run pipeline:** Push the remediation branch or trigger a rerun from the
   GitHub UI after addressing issues.

## Local testing
- **Conftest:**
  ```bash
  # Render your chart and test locally
  helm template myrelease infra/helm/mychart > /tmp/mychart.yaml
  conftest test /tmp/mychart.yaml --policy policies/opa/kubernetes
  ```
- **Trivy config:**
  ```bash
  trivy config --severity HIGH,CRITICAL --helm-chart infra/helm/mychart
  ```
- **Trivy image:**
  ```bash
  docker build -f server/Dockerfile -t summit-server:dev server
  trivy image --severity HIGH,CRITICAL summit-server:dev
  ```

## Maintenance checklist
- Review Trivy release notes quarterly and bump the installer version in the
  workflow.
- Update the Docker image target list when new services are introduced.
- Expand the OPA policy package as new baseline controls are required.
