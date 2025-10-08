# Flaky Test Quarantine

> Temporary quarantine list for tests that cause CI flapping. Track, deflake, then re-enable.

| Package/Path | Test Name/Pattern | Issue/Notes | Owner | ETA |
|--------------|-------------------|-------------|-------|-----|
| api/tests    | users.e2e.ts      | Times out in CI only | @ops-existing/observability-ci/CODEOWNERS | 2025-10-15 |

**Policy**
- Exclude these from `lane-stable` and `lane-fast` (unit step) via jest pattern or `it.skip`.
- Keep them running in `lane-nightly`.