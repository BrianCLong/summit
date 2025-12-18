# CI Time Budget Optimization

## Profiling summary
- Pipeline: `.github/workflows/ci.yml` (fast-checks, build-test, golden-path, compatibility, security-scan).
- Longest 20% of steps (historically the slowest slices based on job definitions and prior run notes):
  - `pnpm install --frozen-lockfile` (fast-checks, build-test, golden-path, compatibility) — network-bound and repeated per lane.
  - Workspace build + tests (`pnpm -w run build`, `pnpm -w run test`) — CPU-heavy and affected by cache misses.
  - Docker image builds for API and client in `golden-path` — expensive without persistent layer cache.
  - `make up` / smoke in `golden-path` — gated on compose health checks and container start time.
- New **CI runtime profile** job now publishes a step-level timing digest to the run summary so the slowest 20% of steps are automatically highlighted for every run.

## Optimizations implemented (targets 30–50% wall-clock reduction)
- **Persistent Turbo cache** keyed by `pnpm-lock.yaml` + branch ref so incremental builds/tests reuse artifacts across runs instead of per-commit cache misses.
- **Shared Docker layer caches (gha scopes `ci-api` / `ci-web`)** for API and client images, cutting repeated rebuild time in `golden-path` by reusing layers across runs.
- **Automated timing summary** (`ci-time-report` job) surfaces the longest steps and cumulative runtime per workflow run to prioritize further cuts.
- **Lockfile-scoped pnpm cache** via `actions/setup-node` (no duplicate cache steps) reduces overhead while keeping installs warm across jobs.

## How to use the timing report
1. Open a CI run for `.github/workflows/ci.yml`.
2. In the **Summary** tab, review the "CI runtime profile" section added by the `ci-time-report` job.
3. The list shows the top ~20% longest steps with job and step names. Use it to focus on the largest contributors before tuning.

## Next levers to reach the target
- Remove redundant installs by reusing `pnpm store` between jobs via `actions/setup-node` cache (already keyed on the lockfile) and verifying cache hits in logs.
- Use test selection filters (e.g., changed paths) for `golden-path` when non-platform files change.
- Promote remote Turbo caching (or a self-hosted cache) to widen build/test reuse across branches.
- Trim compose health-check waits by tightening timeouts and parallelizing service readiness where safe.
