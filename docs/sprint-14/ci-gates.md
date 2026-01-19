# Sprint 14 CI Gates & Pipeline

This document defines the CI/CD gates that every change in Sprint 14 must pass to be eligible for merging and release.

## Pipeline Stages

### 1. Verification (On PR Open/Update)

Triggered by `pull_request` events to `main` and `release/0.14.0`.

*   **Linting & Formatting**:
    *   `pnpm lint`: Runs ESLint, Prettier (JS/TS), and Ruff (Python).
    *   **Gate**: Must pass with 0 errors.
*   **Unit Tests**:
    *   `pnpm test`: Runs Jest/Vitest for frontend and backend.
    *   **Gate**: 100% pass rate.
    *   **Coverage Gate**: Minimum 85% statement coverage for `intelgraph-server` and core libraries.
*   **Security Scans**:
    *   `trivy fs`: Scans filesystem for vulnerabilities.
    *   `gitleaks`: Scans for hardcoded secrets.
    *   **Gate**: 0 Critical/High vulnerabilities.
*   **Policy Simulation**:
    *   `make policy-sim`: Runs OPA tests against Rego policies.
    *   **Gate**: 100% pass rate for authz logic.

### 2. Build & Publish (On Merge)

Triggered by `push` to `main` or release tags.

*   **Docker Build**:
    *   Builds images for `intelgraph-server`, `prov-ledger`, `web`, `gateway`.
    *   **Gate**: Build success.
*   **Image Scan**:
    *   `trivy image`: Scans built images.
    *   **Gate**: 0 Critical vulnerabilities.
*   **Artifact Push**:
    *   Pushes to container registry with commit SHA and `latest` (on main).

### 3. Preview Environment (On PR Label `preview`)

*   **Deploy**:
    *   Deploys a transient namespace in the dev cluster using Helm.
    *   Includes: Neo4j, Postgres, Services, Web.
*   **Smoke Test**:
    *   `make k6-smoke`: Runs basic health and critical path checks.
    *   **Gate**: All smoke tests pass (p95 < 2s).

### 4. Release Candidate Gates (On Tag `v*`)

*   **E2E Regression**:
    *   Full Playwright suite running against the staging environment.
    *   **Gate**: 100% pass rate.
*   **Performance Baseline**:
    *   `k6 run load-test.js`: Simulates Graph query load.
    *   **Gate**: Graph query p95 latency < 1.5s under 50 RPS.
*   **SLO Check**:
    *   Verifies no SLO burn in Staging during the test window.

## Automated Checks in GitHub Actions

| Job Name | Description | Gate Type |
| :--- | :--- | :--- |
| `ci/lint` | Code style and static analysis | **Blocking** |
| `ci/test` | Unit and Integration tests | **Blocking** |
| `security/audit` | Dependency audit and secret scan | **Blocking** |
| `ci/policy` | OPA policy verification | **Blocking** |
| `ci/build` | Docker build verification | **Blocking** |
| `perf/k6` | Performance threshold check | **Non-Blocking** (Report only on PR, Blocking on Release) |

## Manual Gates

*   **Code Review**: Required approval from code owner.
*   **Product Sign-off**: Required for UI changes (Screenshot/Demo verification).
*   **Security Review**: Required for changes to `opa/`, `auth/`, or `crypto/`.
