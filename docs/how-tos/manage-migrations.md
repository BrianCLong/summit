---
title: "Apply migrations and seed data"
summary: "Run Postgres migrations and seed data from the npm scripts."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "ops"
---

# Apply migrations and seed data

Use the provided npm scripts to keep the database schema current.

## Steps

1. Ensure the database container is running (`docker compose up postgres`).
2. Apply migrations from the repo root:
   ```bash
   npm run db:migrate
   ```
3. Seed development data:
   ```bash
   npm run db:seed
   ```
4. If you need a full reset, chain both:
   ```bash
   npm run db:reset
   ```

## Expected result

- Migrations complete without errors against the Postgres instance defined by `DATABASE_URL`.
- Seeds load sample data suitable for local testing.

## Next steps

- Re-run the [configuration validation](validate-config.md) if connection settings change.
- Continue with the [runbook tutorial](../tutorials/first-runbook.md).
