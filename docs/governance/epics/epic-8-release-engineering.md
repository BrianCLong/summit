Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 8 — Release Engineering 2.0 (continuous delivery with fewer incidents)

1.  Implement canary + ramp with automated rollback triggers for Tier-0.
2.  Add deploy verification tests that assert Tier-0 journeys post-deploy.
3.  Standardize feature flag governance: owner, expiry, kill switch, audits.
4.  Build release notes automation from tagged epics/PRs (no manual scramble).
5.  Create a release calendar with freeze windows and dependency coordination.
6.  Add “change risk scoring” (blast radius, data migrations, hot paths) to gate reviews.
7.  Run rollback drills quarterly and track time-to-rollback.
8.  Add CI flake-kill program and reduce test runtime (measured).
9.  Implement preview environments with TTL and safe seeded data.
10. Publish weekly “release health” scorecard (CFR, MTTR, rollback count).
11. Delete manual deploy paths and snowflake pipelines.
