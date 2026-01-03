# Evidence Index — Security & Governance Gates

This index enumerates the security and governance CI controls and their evidence sources. It is
the primary reference for compliance evidence collection and readiness claims.

## CI Security Gates

| Control                                      | Workflow evidence                                                      | Local verification                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Dependency review (PR)                       | `.github/workflows/dependency-review.yml`                              | `pnpm audit --prod`                                                   |
| SAST (CodeQL + Semgrep)                      | `.github/workflows/ci-security.yml`                                    | CodeQL runs in CI; Semgrep equivalent: `npx semgrep ci --config p/ci` |
| Secret scanning (Gitleaks)                   | `.github/workflows/ci-security.yml`, `.github/workflows/ci-verify.yml` | `gitleaks detect --source . --config .gitleaks.toml`                  |
| Dependency vulnerability scan (Snyk + Trivy) | `.github/workflows/ci-security.yml`                                    | `pnpm audit --prod`                                                   |
| Policy enforcement (OPA/Conftest)            | `.github/workflows/ci-security.yml`, `.github/workflows/ci-verify.yml` | `opa check policies/ && opa test policies/ -v`                        |

## Governance Gates

| Control                               | Workflow evidence                         | Local verification                        |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Governance policy evaluation          | `.github/workflows/governance-engine.yml` | `npx tsx scripts/ci/evaluate-policies.ts` |
| GA risk gate (dependency review, OPA) | `.github/workflows/ga-risk-gate.yml`      | `./scripts/check-ga-policy.sh`            |
