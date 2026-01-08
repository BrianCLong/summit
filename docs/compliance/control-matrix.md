# Compliance Control Mapping (Phase 1)

This matrix captures the initial, high-value controls tied to existing security automation and documentation. It is intentionally scoped for scaffolding; future iterations should expand the library and link to runbooks, dashboards, and control owners.

| Control ID                             | Description                                                           | Implementation artifacts                                                                                                                                      | Evidence source                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| SOC2 CC6.1 / ISO 27001 A.9.1           | Logical access and code ownership enforced for critical repositories. | `CODEOWNERS`; `.github/workflows/rbac-drift.yml` (policy drift alerts); `policies/opa/` (authorization policies).                                             | GitHub workflow run logs and uploaded drift reports; `scripts/security/baseline-check.sh` report output. |
| SOC2 CC6.7 / ISO 27001 A.12.6          | Secrets management and secret-leak prevention in CI/CD.               | `.gitleaks.toml`; `.github/workflows/gitleaks.yml`; `docs/secrets-management.md`; `scripts/security/secrets-baseline.sh`.                                     | Gitleaks workflow logs and SARIF uploads; `scripts/security/secrets-baseline.sh` JSON report.            |
| NIST 800-53 SA-11 / ISO 27001 A.14.2.8 | Secure build pipeline checks for dependencies and container security. | `.github/workflows/security-scan.yml`; `.github/workflows/dependency-review.yml`; `docs/security/security-pipeline.md`; `scripts/security/baseline-check.sh`. | Workflow run logs and uploaded audit reports; compliance runner JSON/markdown outputs.                   |

## How to extend

- Add new rows to this document summarizing the control and mapping.
- Append structured entries to `compliance/control-matrix.yml` (id, name, category, evidence scripts).
- Ensure every evidence script produces machine-readable output in `artifacts/` for downstream reporting.
- Keep mappings small and testable; prefer existing CI jobs or lightweight scripts for early coverage.
