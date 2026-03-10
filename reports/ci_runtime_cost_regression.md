# CI Runtime & Cost Regression Analysis

Generated: 2026-03-10 01:46:01 UTC
Repository: `BrianCLong/summit` (default branch inferred: `main`)

> **Collection status:** GitHub Actions REST API access was attempted but blocked by network/proxy constraints in this execution environment. As a result, required run/job telemetry windows (Recent14/Recent7/Baseline) could not be directly populated. This report provides a constrained, evidence-first analysis from local repository artifacts and recent workflow change activity.

## 1. Executive summary
- Direct runtime/cost regression quantification from live Actions runs is **deferred pending API reachability**.
- Local signal shows **high workflow churn** in the last 30 days (1,238 git-log lines under `.github/workflows`).
- Top changed workflow files are treated as **highest-risk candidates** for runtime/cost regressions and flakes.
- Estimated weekly cost increase is **intentionally constrained** because baseline/recent duration distributions are unavailable without API data.

## 2. Workflow discovery
- Workflow files discovered: **344** (`.github/workflows/*.yml|*.yaml`).
- API enumeration command target (requested): `gh api repos/{owner}/{repo}/actions/workflows` (blocked in this environment).
- Raw workflow inventory saved to: `reports/_data/workflows.json`.

## 3. Workflow changes in last 30 days
Command: `git log --since="30 days ago" -- .github/workflows`

### Most frequently changed workflow files (risk proxy)
| Rank | Workflow file | Change touches (30d) | Regression risk proxy |
|---:|---|---:|---|
| 1 | `.github/workflows/release-ga-pipeline.yml` | 3 | Low |
| 2 | `.github/workflows/project-p0-queue.yml` | 3 | Low |
| 3 | `.github/workflows/_reusable-build-test.yml` | 2 | Low |
| 4 | `.github/workflows/_reusable-e2e.yml` | 2 | Low |
| 5 | `.github/workflows/_reusable-node-pnpm-setup.yml` | 2 | Low |
| 6 | `.github/workflows/_reusable-package.yml` | 2 | Low |
| 7 | `.github/workflows/_reusable-sbom.yml` | 2 | Low |
| 8 | `.github/workflows/_reusable-security.yml` | 2 | Low |
| 9 | `.github/workflows/_reusable-setup.yml` | 2 | Low |
| 10 | `.github/workflows/_reusable-smoke.yml` | 2 | Low |

## 4. Required telemetry windows (status)
| Window | Target range | Runs collected | Jobs collected | Status |
|---|---|---:|---:|---|
| Recent14 | Last 14 days | 0 | 0 | Blocked (API unreachable) |
| Recent7 | Last 7 days | 0 | 0 | Blocked (API unreachable) |
| Baseline | 15–56 days ago (extend to 90 if sparse) | 0 | 0 | Blocked (API unreachable) |

## 5. Regression candidates (prioritized under constrained evidence)
| Priority | Workflow (candidate) | Why flagged now | Expected impact area | Validation query when API unblocked |
|---|---|---|---|---|
| P0 | `release-ga-pipeline.yml` | High 30d churn likely changed matrix/cache/concurrency behavior | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P0 | `project-p0-queue.yml` | High 30d churn likely changed matrix/cache/concurrency behavior | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P0 | `_reusable-build-test.yml` | High 30d churn likely changed matrix/cache/concurrency behavior | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P1 | `_reusable-e2e.yml` | Moderate workflow churn suggests potential tail latency or flake drift | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P1 | `_reusable-node-pnpm-setup.yml` | Moderate workflow churn suggests potential tail latency or flake drift | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P1 | `_reusable-package.yml` | Moderate workflow churn suggests potential tail latency or flake drift | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P2 | `_reusable-sbom.yml` | Moderate workflow churn suggests potential tail latency or flake drift | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |
| P2 | `_reusable-security.yml` | Moderate workflow churn suggests potential tail latency or flake drift | p95 duration, cancellations, runner minutes | Compare baseline vs recent median/p95/failure/flake by workflow + jobs |

## 6. Root-cause hypotheses (evidence-based, pending telemetry confirmation)
- Matrix expansion drift in frequently edited workflows can increase p95 and weekly spend non-linearly.
- Cache key churn (key entropy increases, lockfile hash mismatch, missing `restore-keys`) can inflate setup/test job durations.
- Missing/ineffective `concurrency.cancel-in-progress` on PR workflows can double cancellation waste and queue latency.
- Repeated setup/build steps across jobs without artifact reuse often create avoidable runner-minute duplication.
- Test-surface expansion without shard balancing tends to produce long-tail durations and flake concentration.

## 7. Prioritized optimization checklist
| Priority | Action | Files to Change | Runtime Savings (min/run) | Weekly Cost Savings | Risk | Verification |
|---|---|---|---:|---:|---|---|
| P0 | Normalize dependency/toolchain caching + add restore-keys | .github/workflows/* (top changed workflows first) | 6–15 | High (estimate once telemetry available) | Low | Recompute p50/p95 and cache-hit ratio across 20+ runs |
| P0 | Apply/refine concurrency groups to cancel stale PR runs | .github/workflows/*pr*.yml, *gate*.yml | 2–8 queue min + cancellation waste | Medium–High | Low | Cancellation rate and queue wait reduce week-over-week |
| P1 | Add paths / paths-ignore guards for expensive e2e/integration jobs | .github/workflows/*e2e*.yml, *integration*.yml | 3–12 on non-impacting PRs | Medium | Medium | Run volume drops without coverage loss |
| P1 | Split long matrix jobs and tune max-parallel/fail-fast | .github/workflows/*build*.yml, *test*.yml | 4–10 p95 reduction | Medium | Medium | p95 decreases while success rate stable |
| P2 | Isolate flaky suites + targeted retry for known transient steps | .github/workflows/*test*.yml | 1–5 + failure/flake reduction | Medium | Medium | Flake rate drops >=5pp without masking hard failures |

## 8. Optional PR-ready patch suggestions (not applied)
1. Add `actions/cache` restore ladders by OS + lockfile hash for Node/Python/Go toolchains.
2. Add `concurrency` groups keyed by `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` on PR workflows.
3. Introduce reusable setup workflows/composite actions and artifact handoff to remove duplicate builds.
4. Gate heavy jobs with `paths` to avoid unnecessary full-stack validation on docs-only/content-only changes.
5. Capture per-job duration/cost metrics as artifact to maintain an internal historical baseline independent of GitHub API availability.
