# CI Operations Playbook

This playbook documents standard operating procedures for maintaining the Summit CI/CD pipeline.

## Standard Procedures

### Clear Stale Caches
If you encounter mysterious build failures or dependency issues, you may need to clear the caches.
1. Bump the cache key prefix in workflows (e.g., from `v1-` to `v2-`).
2. Delete artifacts older than 7 days via the GitHub Actions UI.

### Rehydrate node_modules
To clean and reinstall dependencies from scratch:
```bash
pnpm store prune && pnpm i --prefer-offline --frozen-lockfile
```

### Pin Action SHAs
Always pin GitHub Actions to exact commit digests to ensure supply chain security.
Use the `scripts/ci/pin_actions.mjs` utility to automate this:
```bash
node scripts/ci/pin_actions.mjs
```
A quarterly rotation issue should be created to refresh these pins.

### Runner Types
- Default to `ubuntu-22.04` for all general-purpose jobs.
- Reserve `macos` or `windows` runners for platform-specific tests only.

## Troubleshooting

### Flaky Tests
If a test is identified as flaky:
1. Add its name pattern to `scripts/ci/flake-quarantine.json`.
2. Monitor the quarantine list size; goal is to keep it under 5.
3. Schedule remediation for any test in quarantine for more than 14 days.

### CI Rollback
If a CI change degrades performance or reliability:
1. Median runtime increases by >5%.
2. Cache hit rate drops by >10%.
Trigger the `ci-rollback` workflow manually to revert the last CI-specific commit.
