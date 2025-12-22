# Golden Path: New Migration

## Checklist

- [ ] **File Name**: Follows timestamp convention (e.g., `YYYYMMDD_name.sql`).
- [ ] **Location**: Placed in `server/src/db/migrations/postgres/` or `server/src/db/migrations/neo4j/`.
- [ ] **Idempotency**: Uses `IF NOT EXISTS` or checks to avoid errors on re-run.
- [ ] **Down Migration**: Includes rollback logic (if supported/required).
- [ ] **Performance**: Includes indexes for new columns used in queries.
- [ ] **Testing**: Verified locally by running migration scripts.
