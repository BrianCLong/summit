# Database & Migrations Guide

## Overview

The Summit platform uses **PostgreSQL** as its primary relational store. This document describes how to configure the database, run migrations, and write data access code.

## Configuration

Database configuration is centralized in `server/src/db/config.ts`. It loads settings from environment variables.

### Key Environment Variables

| Variable             | Default          | Description                               |
| -------------------- | ---------------- | ----------------------------------------- |
| `DATABASE_URL`       | -                | Full connection string (overrides others) |
| `POSTGRES_HOST`      | `postgres`       | Hostname                                  |
| `POSTGRES_PORT`      | `5432`           | Port                                      |
| `POSTGRES_USER`      | `intelgraph`     | User                                      |
| `POSTGRES_PASSWORD`  | `devpassword`    | Password                                  |
| `POSTGRES_DB`        | `intelgraph_dev` | Database Name                             |
| `PG_WRITE_POOL_SIZE` | `20`             | Max connection pool size                  |

## Migrations

We use a custom, SQL-based migration runner located in `server/scripts/db_migrate.cjs` (which delegates to `server/src/db/migrate.js`).

### Running Migrations

To migrate the database to the latest version (both Postgres and Neo4j):

```bash
# From server directory
npm run db:migrate
```

### Creating a New Migration

1. Create a new SQL file in `server/src/db/migrations/postgres/`.
2. Name it sequentially or with a timestamp prefix, e.g., `013_add_new_feature.sql` or `20250521_add_feature.sql`.
3. Add your SQL (e.g., `CREATE TABLE`, `ALTER TABLE`).
4. **Important:** Use `IF NOT EXISTS` or safe checks where possible to ensure idempotency.

Example `013_example.sql`:

```sql
CREATE TABLE IF NOT EXISTS example_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_example_tenant ON example_items(tenant_id);
```

## Data Access

We use the `pg` driver wrapped in a managed pool (`ManagedPostgresPool`).

### Usage

```typescript
import { getPostgresPool } from "../db/postgres";

// Simple Query
const result = await getPostgresPool().query("SELECT * FROM runs WHERE id = $1", [runId]);

// Transaction
await getPostgresPool().withTransaction(async (client) => {
  await client.query("INSERT INTO ...");
  await client.query("UPDATE ...");
});
```

### Multi-Tenancy

**All** queries accessing tenant-scoped data (runs, tasks, etc.) **MUST** include `tenant_id` in the `WHERE` clause.

Correct:

```typescript
const result = await pool.query("SELECT * FROM runs WHERE id = $1 AND tenant_id = $2", [
  id,
  tenantId,
]);
```

Incorrect:

```typescript
// DANGEROUS: Returns run even if it belongs to another tenant!
const result = await pool.query("SELECT * FROM runs WHERE id = $1", [id]);
```

## Testing

Integration tests should:

1. Ensure the DB is migrated (`npm run db:migrate` in CI).
2. Use the `getPostgresPool` mock or real instance depending on test type.
3. Clean up data if running against a real DB.
