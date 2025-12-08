**Gate**: PR must include `docs/migrations/plan.md`, `docs/migrations/rollback.md`, and `db/migrations/DRYRUN_RESULT.txt`.

## Automated database migration gate
- CI step: `./ops/db/migration-pipeline-step` (discovers repo-local migrate/verify binaries regardless of working directory).
- Pre-flight: plans migrations and runs shadow verification before apply (override binaries via `MIGRATION_CMD` / `VERIFICATION_CMD`).
- Enforcement: fails fast and blocks deployment on any failed check after logging the captured output; unexpected gate failures are also logged to the release report before exit.
- Post-migration: re-verifies schema drift and critical queries immediately after apply.
- Reporting: appends results to `ops/release/release-report.md` (set `RELEASE_REPORT_PATH`, `DEPLOYMENT_ID`, and `SCHEMA_CHANGE_REF` to customize context).
