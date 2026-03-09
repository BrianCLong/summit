# GA Readiness & Release Checklist

This document details the CI gates, merge queue requirements, and rollback steps needed before declaring General Availability (GA) for Summit.

## Pre-Release CI Gates
- **Build Pass:** All core build targets (`pnpm build`) must pass cleanly.
- **Tests Green:** Unit, integration, and E2E tests must pass 100%.
- **Linting & Hygiene:** No outstanding lint errors or formatting violations (`pnpm lint`).
- **Security Scans:** Docker images and dependencies must pass vulnerability scanning with 0 critical/high issues.

## Merge Queue Discipline
- All PRs must use the auto-merge queue.
- Rebase and re-test is required if main advances.
- No direct pushes to main under any circumstances.

## Rollback Steps (Summary)
1. **Identify Failure:** Confirm via observability dashboards or alerts.
2. **Revert PR/Commit:** Use `git revert <commit>` to create a clean rollback PR.
3. **Fast-Track Rollback PR:** Bypass standard wait times but still require CI pass and 1 approval.
4. **Deploy Rollback:** Merge to main and let CI/CD auto-deploy.
5. **Verify Recovery:** Check metrics to confirm system stability.
