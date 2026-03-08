# Runbook: DB Migrations and Rollback

Standard procedures for schema evolutions across Summit Platform databases.

## 1. PostgreSQL Migrations

We use Prisma/Knex for relational schema management.

### Apply Migrations
```bash
# Apply pending migrations to the database
npm run db:migrate
```

### Rollback
```bash
# Rollback the last migration (Knex-specific)
cd server && npx knex migrate:rollback --knexfile packages/db/knex/knexfile.cjs
```

## 2. Neo4j Schema Management

Neo4j schema (Indexes and Constraints) is managed via the `indexManager.ts`.

### Verify Indexes
Indexes are verified automatically at startup. To run manually:
```bash
# Check and create missing Neo4j indexes
npm run db:migrate:neo4j
```

## 3. Safe Migration Practices

1. **Pre-Migration Backup**: Always take a snapshot of the DB before applying schema changes.
2. **Maintenance Window**: For destructive changes (DROP TABLE/COLUMN), schedule a maintenance window and enable `SAFE_MODE=true`.
3. **Verification**: Run `npm run schema:validate` after migration to ensure runtime schema matches expectations.

## 4. Rollback Strategy

In the event of a migration failure:
1. **Identify**: Check `server.log` for SQL/Cypher errors.
2. **Reverse**: Use the rollback command for the specific DB.
3. **Restore**: If schema rollback fails, restore from the pre-migration backup.
4. **Notify**: Post an incident update to the engineering channel.
