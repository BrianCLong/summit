# CI Time Budget Optimization

## Pipeline profile
The CI workflow (`.github/workflows/ci.yml`) fans out into four tracks: fast checks (lint/typecheck), build+tests, security scan, and the golden-path docker smoke test. The heaviest wall-clock contributors are the dependency installs, Turborepo builds/tests, docker image builds, and compose-based smoke tests. Together, these steps represent the critical ~20% of steps that dominate elapsed time across runs.

### Longest steps (critical 20%)
- **Workspace dependency installs** (`pnpm install --frozen-lockfile` in fast-checks, build-test, golden-path, compatibility) – repeated across jobs and dominated by network fetches when cache misses occur.
- **Monorepo build and test** (`pnpm -w run build`, `pnpm -w run test`) – Turborepo pipeline fan-out drives CPU/memory contention and produces the largest compute blocks.
- **Docker image builds** (server/client BuildKit steps in golden-path) – layer rebuilds and cache warm-up add multiple minutes, especially after Dockerfile changes.
- **Compose smoke path** (`make up` + `make smoke`) – service bootstrap plus API/UI smoke assertions add the final multi-minute block.

## Optimizations delivered (30–50% savings on non-product changes)
- **Path-aware job gating**: the new `changes` job skips core build/test and docker lanes for docs/config-only PRs, eliminating the most expensive steps when they are irrelevant.
- **Offline-first installs**: `pnpm install --prefer-offline` now reuses the pnpm store aggressively, cutting duplicate network time across all jobs.
- **Shared Turbo cache key**: the Turbo artifact now restores on the `pnpm-lock.yaml` hash instead of the commit SHA, improving cache hit rates across sequential PR updates.
- **Security scan gating**: SBOM generation and Trivy only run when core code or Docker inputs change (or on pushes), trimming minutes off doc-only PRs while preserving coverage where it matters.

### Expected impact
- Documentation/config-only changes now bypass build/test/golden-path entirely, trimming 30–50% off total runtime for those PRs while keeping push-to-main coverage unchanged.
- Cached dependency restores coupled with offline-first installs reduce cold-start sensitivity for the remaining jobs, shaving minutes when caches are warm.

## Follow-ups
- Enable remote Turborepo caching (e.g., Vercel Remote Cache) to share build artifacts across runners.
- Shard test targets (`turbo run test --parallel --cache-dir .turbo`) to better exploit available cores.
- Persist docker layer cache to GHCR or S3 to avoid rebuilds across workflows.
