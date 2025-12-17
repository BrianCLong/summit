# CI/CD Architecture & Optimization Guide

This document outlines the architecture and optimization strategies used in our GitHub Actions pipelines (`.github/workflows`).

## Overview

The CI system is designed for **speed**, **reliability**, and **efficiency**. It uses a "Fast Lane" approach where checks are prioritized by speed and cost.

### Key Workflows

*   `ci.yml`: The main pipeline triggered on PRs and pushes to `main`.
*   `_reusable-*.yml`: Modular workflow components (deprecated/legacy, moving towards Composite Actions).

## Optimization Strategies

### 1. Caching Strategy
We use a multi-layer caching strategy to minimize download and compute times:
*   **Package Manager**: `pnpm` store is cached via the `setup-node` action and our custom setup composite action.
*   **Build Artifacts**: TurboRepo (`.turbo`) cache is persisted to GitHub Actions Cache to skip redundant build tasks.
*   **Docker Layers**: Docker builds use `type=gha` (GitHub Actions Cache) to cache layers, significantly speeding up image builds.
*   **Inter-Job Artifacts**: `build` job uploads compiled code (`dist/`, `build/`) which is downloaded by `test` jobs to avoid rebuilding.

### 2. Parallelization
*   **Job Level**: Independent jobs (`quality`, `build`, `security`, `compatibility`) run in parallel.
*   **Task Level**: `turbo` is used to run `lint`, `typecheck`, and `build` in parallel across the monorepo.
*   **Test Sharding**: Unit tests are sharded across multiple runners using Jest's `--shard` feature, reducing wall-clock time for the test suite.
*   **Test Splitting**: Unit tests and E2E tests run in separate jobs.

### 3. Resource Optimization
*   **Runners**: Heavy jobs (`build`, `test`, `golden-path`) use `ubuntu-latest-8-cores` for faster execution. Lighter jobs use standard runners.
*   **Conditional Execution**: `paths-ignore` and the `changes` job (using `dorny/paths-filter`) ensure that documentation-only changes or changes to unrelated files do not trigger expensive CI jobs.
*   **Fail Fast**: Matrix strategies are configured to fail fast where appropriate, but `compatibility` checks are non-blocking.

### 4. Reliability
*   **Retries**: Flaky tests are handled via `nick-fields/retry` action, automatically retrying failed test commands.
*   **Environment Isolation**: `golden-path` tests run in a fully containerized environment using Docker Compose.

## How to Maintain

### Adding New Packages
When adding a new package to the monorepo, ensure it is included in `turbo.json` pipeline configuration. The CI will automatically pick it up via `pnpm turbo run ...`.

### Troubleshooting
*   **Cache Issues**: If you suspect cache corruption, you can clear the cache via the GitHub Actions UI "Actions" tab -> "Caches".
*   **Flaky Tests**: Check the "Unit Tests" or "E2E Tests" logs. The retry mechanism will show if a test failed once and then passed.

### Local Simulation
You can simulate the CI steps locally:
```bash
# Quality
pnpm turbo run lint typecheck

# Build
pnpm turbo run build

# Unit Tests
pnpm run test:jest

# E2E
pnpm run e2e
```
