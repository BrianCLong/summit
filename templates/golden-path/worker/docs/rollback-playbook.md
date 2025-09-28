# {{SERVICE_NAME}} Rollback

1. Pause job ingestion.
2. Promote last known good artifact (verified with cosign) using `Makefile deploy`.
3. Re-seed failed jobs from `.evidence/retry-plan.md`.
