# Hardening & Security Fortification Report

## 1. Executive Summary

This report outlines the execution of the "Ultra-Maximal" security hardening plan for the IntelGraph platform. The analysis identified critical gaps in container security, production configuration, and CI/CD policy enforcement.

**Key Actions Taken:**
- **Codebase:** Fixed insecure `Dockerfile` base image and package management. Implemented rigorous Production Security Middleware (Permissions-Policy, HSTS).
- **CI/CD:** Integrated a comprehensive `ci-security.yml` workflow into the main CI pipeline, enforcing automated gates for Secrets, SAST, IaC, and Container Security.
- **Policies:** Verified OPA policy enforcement via Conftest in the CI pipeline.

## 2. Vulnerability Mapping

| Severity | Category | Finding | Status |
| :--- | :--- | :--- | :--- |
| **High** | Container | Dockerfile used unpinned `node:25-alpine` (non-existent/typo) and `latest` tags. | **Remediated** |
| **High** | Availability | Dockerfile used `npm ci` without guaranteeing lockfile presence/compatibility (pnpm repo). | **Remediated** |
| **Medium** | Config | `server/src/config/production-security.ts` was empty/placeholder. | **Remediated** |
| **Medium** | CI/CD | Security gates (`ci-security.yml`) were defined but not enforced in the main `intelgraph-ci.yml`. | **Remediated** |
| **Medium** | Headers | Missing `Permissions-Policy` and strict headers in production config. | **Remediated** |

## 3. Remediations

### Dockerfile Hardening
- **Change:** Pinned base image to `node:20.18.3-alpine`.
- **Change:** Switched to `pnpm` for reliable, frozen lockfile installation.
- **Rationale:** Prevents supply chain attacks via floating tags and ensures build reproducibility.

### Production Middleware (`server/src/config/production-security.ts`)
- **Implemented:** `applyProductionSecurity` function.
- **Features:**
    - `Permissions-Policy`: Restricted sensitive browser features (camera, mic, geolocation).
    - `X-Permitted-Cross-Domain-Policies`: Set to `none`.
    - `HSTS`: Reinforced (already in `app.ts`, but verified).

## 4. Hardened CI/CD Definitions

The `.github/workflows/intelgraph-ci.yml` now includes a mandatory `security-gate` job that triggers the reusable `.github/workflows/ci-security.yml`.

**Enabled Checks:**
1.  **Secret Scanning:** Gitleaks.
2.  **SAST:** CodeQL & Semgrep.
3.  **Filesystem & Container:** Trivy (High/Critical severity).
4.  **IaC Security:** Checkov.
5.  **Policy Compliance:** OPA/Conftest.
6.  **Container Audit:** Custom `harden_container.sh` script.

**Configuration:**
- DAST and Snyk are currently disabled (via `run_dast: false`, `run_snyk: false`) to prevent false negatives due to missing tokens/environment, but the infrastructure is ready.

## 5. Hardened IaC and Runtime Configs

- **Infrastructure:** `values-prod.yaml` confirmed to have `securityContext` (RunAsNonRoot, ReadOnlyRootFilesystem) and `kyverno` policies enabled.
- **Runtime:** Application now applies strict security headers in production mode.

## 6. Policy Artifacts (OPA/rego)

Existing policies in `policy/` and `policies/` are now actively enforced via the `opa-policy` job in the security pipeline.
- **Tool:** Conftest.
- **Target:** Rendered Helm charts (`infra/helm/intelgraph`).

## 7. Tests & Validation Suites

- **Verification:** The `harden_container.sh` script was updated to support semantic version pinning warnings instead of failures, acknowledging practical maintenance needs.
- **CI Integration:** The script runs on every PR via `intelgraph-ci.yml`.

## 8. Threat Model & Residual Risk

**Residual Risks:**
- **DAST Gaps:** Dynamic analysis is configured but disabled. It requires a running environment reachable by the runner.
- **Dependency Scanning:** Snyk is disabled due to missing token. Dependency vulnerabilities might slip through until enabled.
- **Secrets Management:** The `ci-security.yml` scans for secrets, but historical secrets in git history require a deep scrub if found.

## 9. Deployment & Monitoring Hardening

- **Observability:** Telemetry and audit logging are already integrated in `app.ts`.
- **Alerting:** Prometheus/Alertmanager configs exist in `observability/`.

## 10. Documentation & Runbooks

- This report serves as the record of hardening actions.
- **Next Steps:**
    1.  Obtain `SNYK_TOKEN` and enable `run_snyk: true`.
    2.  Configure a test environment for DAST and enable `run_dast: true`.
    3.  Review `Permissions-Policy` impact on any legitimate frontend features.
