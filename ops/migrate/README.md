# Async Migrations

Run migrations in a controlled, async fashion to minimize impact during scale-out events.

1. Set `PG_URL` with credentials pointing to the target database.
2. Execute `./async-migrate.sh` from this directory.
3. Monitor logs for failures; rerun is idempotent because scripts are sorted.
