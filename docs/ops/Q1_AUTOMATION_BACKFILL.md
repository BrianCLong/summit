# Q1 Automation Backfill Map

> **Status**: DRAFT
> **Focus**: Removing manual toil from the Month-1 operating cadence.

| Manual Step | Failure Mode | Proposed Automation | Location | Effort | Priority |
|:---|:---|:---|:---|:---|:---|
| **Update Trust Scorecard** | Scorecard becomes stale; false sense of security. | Script to query gitleaks, coverage, and CI status; update JSON. | `scripts/ops/update_trust_scorecard.ts` | S | **P0** |
| **Verify Repo Hygiene** | Untracked secrets/artifacts leak into release; lockfile drift. | Script checking `git status --porcelain` and lockfile hash. | `scripts/ops/check_repo_hygiene.ts` | S | **P0** |
| **GA Definition Audit** | Required commands removed; locked files changed. | Script parsing `GA_DEFINITION.md` and validating `package.json`. | `scripts/ga/verify_ga_definition.ts` | M | P1 |
| **Evidence Bundle Gen** | Missing artifacts in release; compliance violation. | CI job running existing generation script on tag. | `.github/workflows/release.yml` | S | P1 |
| **Flake Detection** | CI noise; developers ignore red builds. | Script parsing JUnit/TAP reports to identify intermittent fails. | `scripts/ci/detect_flakes.ts` | M | P2 |
| **Dependency Audit** | Vulnerabilities introduced; explicit waivers missed. | CI job running `pnpm audit` with waiver file check. | `scripts/security/audit_deps.ts` | S | P1 |
| **License Check** | Legal liability; incompatible licenses. | Script scanning `node_modules` against allowed list. | `scripts/compliance/check_licenses.ts` | M | P2 |
| **TODO/FIXME Scan** | Technical debt accumulation; released placeholders. | `rg` check for forbidden keywords in docs/release paths. | `scripts/ops/scan_forbidden_terms.ts` | S | P2 |
| **SLO Report Gen** | Operational blindness; missed error budget breach. | Script querying Prometheus/Mimir and generating Markdown report. | `scripts/ops/generate_slo_report.ts` | L | P2 |
| **Contributor Check** | Unsigned CLAs; unauthorized contributors. | GitHub Action checking `CONTRIBUTORS.md` or CLA status. | `.github/workflows/check_cla.yml` | S | P2 |
