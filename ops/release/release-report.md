# Release Report

This log centralizes automated release signals appended by CI/CD gates. The database migration gate writes structured entries for every schema change, recording the per-step timestamps, deployment IDs, schema refs, and the captured command output.

## Database migration gate
- Pipeline entry point: `./ops/db/migration-pipeline-step` (callable from any working directory).
- Actions: pre-flight plan, shadow verification, migration apply, and post-migration verification using repo-local binaries (override via `MIGRATION_CMD` / `VERIFICATION_CMD`).
- Enforcement: exits non-zero on any failed check to block promotion, after logging the captured output or any unexpected gate errors.
- Reporting: appends Markdown blocks to this file (override with `RELEASE_REPORT_PATH`).
- Context: propagate `DEPLOYMENT_ID` and `SCHEMA_CHANGE_REF` env vars so the report maps to the correct release artifact.

## Logged runs
Entries from automation append below this line.
