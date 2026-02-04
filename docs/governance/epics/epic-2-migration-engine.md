Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 2 — Migration & Backfill Engine (every major change gets a safe path)

1.  Standardize expand/migrate/contract pattern for schema + storage changes.
2.  Build a backfill framework: resumable, rate-limited, tenant-scoped, idempotent.
3.  Add backfill observability: progress, lag, error rates, retries, cost.
4.  Implement “dual-write/dual-read” toggles with clear cutover gates.
5.  Create rollback strategy for every migration (documented, tested).
6.  Build a “dry run” mode that generates a diff report before executing.
7.  Add governance: migration RFC required for Tier-0 domains.
8.  Maintain a migration calendar aligned to releases and freeze windows.
9.  Add customer comms templates for behavior changes caused by migrations.
10. Run quarterly migration game day (backfill stalls + partial failures).
11. Delete one-off scripts after each migration—fold into the engine.
