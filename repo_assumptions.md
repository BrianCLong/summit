# Repo Reality Check (OMB M-26-05)

## Verified Structure
- ✅ `docs/security/`: Exists
- ✅ `docs/ci/REQUIRED_CHECKS_POLICY.yml`: Exists
- ✅ `.github/workflows/`: Exists
- ✅ `package.json` / `pnpm-lock.yaml`: Node.js environment verified.
- ✅ Existing scanners: Trivy, Gitleaks, Semgrep, CodeQL found in `ci-security.yml`.

## Assumptions
- ⚠️ CI environment has access to OIDC for provenance (assumed for GitHub Actions).
- ⚠️ Release process uses `dist/` as the primary artifact staging area.

## Must-not-touch
- Production infrastructure files (Terraform, K8s manifests) unless explicitly required.
- Core required checks in `docs/ci/REQUIRED_CHECKS_POLICY.yml` (only add new ones via established process).

## Performance Budgets (Enforced)
- SBOM generation: p95 ≤ 2 min
- Evidence verification: ≤ 30 sec
- Drift job: ≤ 5 min
