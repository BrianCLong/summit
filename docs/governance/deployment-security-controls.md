Owner: Jules (Release Captain)
Last-Reviewed: 2026-01-24
Evidence-IDs: EVID-CI-HARDENING-001, EVID-SLO-GATE-001
Status: active

# Deployment Security & SLO Controls

## Overview
This document defines the security controls and availability gates enforced during the deployment lifecycle of the Summit platform.

## Controls

### 1. OIDC-Based Cloud Authentication
All GitHub Actions workflows interacting with cloud environments (AWS) must utilize OpenID Connect (OIDC) for authentication. Static, long-lived credentials (IAM Users with Access Keys) are prohibited for CI/CD.

- **Mechanism**: `.github/workflows/_auth-oidc.yml`
- **Enforcement**: Mandatory for all production-bound deployment jobs.

### 2. Pre-Deploy SLO Gate
A deterministic health gate must be evaluated before any promotion to the `prod` environment. This gate assesses system health based on error rates and latency percentiles.

- **Mechanism**: `scripts/ci/predeploy-slo-check.mjs`
- **Gate Evidence**: Captured in `artifacts/gates/predeploy-slo.json`
- **Policy**:
    - Error Rate: < 0.5%
    - P95 Latency: < 200ms
    - P99 Latency: < 500ms
    - Synthetic Checks: Must be 'passed'

### 3. Environment Protection
Production environments must have mandatory status checks and deployment protection rules enabled in GitHub.

## Evidence Collection
Every deployment produces a signed evidence bundle including the SLO gate result, which is linked to the deployment execution ID.
