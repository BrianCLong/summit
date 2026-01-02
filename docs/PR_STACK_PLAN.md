# PR Stack Plan for #15380 (Sprint 2026.02: Hard Gates and Safer Defaults)

## #15380 Decomposition Map

| Bucket                       | Files                                                                   | Overlap Risk | Status             | Branch Name                         | Tests Run              |
| :--------------------------- | :---------------------------------------------------------------------- | :----------- | :----------------- | :---------------------------------- | :--------------------- |
| **A) Dependency Monitoring** | `.github/dependabot.yml`, `.github/workflows/dependency-monitoring.yml` | Low          | **READY**          | `pr1-dependency-monitoring`         | N/A (Config only)      |
| **B) Performance Baseline**  | `k6/`, `.github/workflows/perf-baseline.yml`                            | Low          | **READY**          | `pr2-perf-baseline`                 | Checked file existence |
| **C) Onboarding**            | `docs/get-started/`, `scripts/bootstrap.sh`                             | None         | **SKIPPED**        | `pr3-onboarding` (No changes found) | N/A                    |
| **D) packages/memory**       | `packages/memory/`                                                      | Medium       | **READY**          | `pr4-packages-memory`               | `jest` (Passed)        |
| **E) Codex-owned**           | Coverage, Fuzzing, CI-core                                              | High         | **LEFT IN #15380** | N/A                                 | N/A                    |

## Execution Log

1.  **Dependency Monitoring**: Extracted `.github/dependabot.yml` and `.github/workflows/dependency-monitoring.yml`.
2.  **Performance Baseline**: Extracted `k6/` and `.github/workflows/perf-baseline.yml`.
3.  **Onboarding**: Checked `docs/get-started/` and `scripts/bootstrap.sh`, found identical to main.
4.  **packages/memory**: Extracted `packages/memory`. Ran tests successfully (`1 passed, 2 total`).

## Note on Codex

I have explicitly avoided touching any files related to coverage, fuzzing, or core CI workflows (like `ci.yml` or coverage configs) to prevent overlap with #15365.
