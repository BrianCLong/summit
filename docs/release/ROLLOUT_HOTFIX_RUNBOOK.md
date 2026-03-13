# Release Rollout & Hotfix Runbook

## Standard Rollout
1. Merge to `main`.
2. Tag release via GitHub Actions.
3. Deploy to `staging` (automated).
4. Run validation (`make smoke`).
5. Promote to `production` via deployment gate approval.

## Hotfix Process
1. Create `hotfix/<ticket-id>` branch from `main`.
2. Apply minimal code changes required to resolve issue.
3. Open PR directly to `main` (bypass standard sprint cycle).
4. Obtain expedited approval.
5. Deploy immediately after CI pass.
