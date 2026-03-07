# CI/CD Workflow Inventory & Analysis

## Overview

This document inventories the 250+ workflows identified in the `.github/workflows` directory as part of the Q1 2026 Sprint Plan for CI/CD Rationalization.

## Analysis

**Total Workflows:** ~250
**Primary Issues:** Duplication, lack of path filters, potential for consolidation.

## Top Workflows Targeted for Optimization (Quick Win 1)

The following workflows have been identified as high-volume/critical and are prioritized for immediate optimization (adding path filters):

1. **`ci.yml` (intelgraph-ci)**
   - **Type:** Monolithic CI
   - **Triggers:** Push/PR to main
   - **Action:** Add `paths-ignore` for docs.

2. **`ci-main.yml` (CI Main - Green Lock Strategy)**
   - **Type:** Integration/Smoke
   - **Triggers:** Push/PR to main, Merge Group
   - **Action:** Add `paths-ignore`.

3. **`server-ci.yml`**
   - **Type:** Server-specific CI
   - **Status:** Already has `paths: 'server/**'`. Good.

4. **`client-ci.yml`**
   - **Type:** Client-specific CI
   - **Status:** Already has `paths: 'client/**'`. Good.

5. **`security.yml`**
   - **Type:** Security Scanning (Trivy, Gitleaks)
   - **Action:** Add `paths-ignore`.

6. **`test-coverage.yml`**
   - **Type:** Comprehensive Coverage
   - **Action:** Add `paths-ignore`.

## Categories

### CI/CD Core

- `ci.yml`
- `ci-main.yml`
- `server-ci.yml`
- `client-ci.yml`
- `build.yml`
- `deploy.yml`

### Security

- `security.yml`
- `codeql.yml`
- `trivy.yml`
- `gitleaks.yml`

### Testing

- `test-coverage.yml`
- `e2e.yml`
- `k6.yml`

### Utility/Automation

- `auto-merge-ready.yml`
- `stale.yml`
- `release.yml`

## Consolidation Plan

Future steps will involve merging `ci.yml` and `ci-main.yml` into a unified pipeline and archiving unused files in `.github/workflows/.archive/`.
