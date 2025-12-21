# Dependency Governance Policy

This policy enforces license compliance, vulnerability management, and supply chain controls for all Summit services.

## License Policy

- **Allowlist:** MIT, Apache-2.0, BSD-2-Clause/3-Clause, ISC, MPL-2.0 (for build-only tools), CC0 for assets.
- **Denylist:** GPL-3.0, AGPL-3.0, SSPL, BUSL, JSON License, and any license marked **Proprietary** or **Unknown**.
- **Copyleft Handling:** Weak copyleft (MPL-2.0, LGPL-2.1/3.0) allowed only for tooling and tests; **never** in runtime or distributed artifacts.
- **Exceptions:** Must use `tools/security/dependency-governance/exception-template.md`, include ticket link, approving manager sign-off, and sunset date. Exceptions expire automatically in CI once the date passes.

## CVE Policy

- **Severity Thresholds:**
  - **Critical/High:** Block PR merge unless a tracked exception exists.
  - **Medium:** Allowed only if CVE budget not exceeded and remediation is scheduled within 14 days.
  - **Low:** Tolerated with monitoring.
- **CVE Budget:** Per service tier, defined in `tools/security/dependency-governance/cve-policy.yml`. When exceeded, CI fails with actionable remediation hints.

## Dependency Integrity Controls

- **Lockfile Enforcement:** `pnpm-lock.yaml` and any service-specific lockfiles must be present and unchanged relative to manifest versions. CI fails if lockfiles are missing or carry uncommitted modifications.
- **Pinned Runners and Containers:** GitHub Actions and container images must pin digests/tags. CI lints workflow files for floating `latest` tags.
- **Reproducibility:** Builds must use `pnpm --frozen-lockfile` (or equivalent) in CI. Any `postinstall` scripts must be deterministic and non-networking.

## Enforcement Workflow

1. License and CVE scans execute on every PR via `.github/workflows/security-governance.yml`.
2. Violations produce SARIF + text artifacts and block merge.
3. Exceptions are evaluated via `tools/security/dependency-governance/run_checks.py --exceptions exceptions.yaml` and must carry signed approvals.
4. All findings create tickets automatically using the `SECURITY_TICKETING_WEBHOOK` secret (disabled by default in CI).

## Evidence & Reporting

- Failing PR sample: `test-results/security/dependency-gate-failure.txt` demonstrates a blocked merge for AGPL and Critical CVE.
- Dashboards: `docs/security/security-dashboard.md` describes top vulnerable dependency tracking and time-to-fix reports powered by exported SARIF.

## Maintenance

- Review allow/deny lists quarterly.
- Update CVE budgets during tier reviews.
- Validate policy drift by running `pnpm exec ts-node tools/security/dependency-governance/run_checks.ts --policy tools/security/dependency-governance` locally before release.
