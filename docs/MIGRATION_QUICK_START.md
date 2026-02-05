# Database Migration Quick Start Guide

> **For developers**: Quick reference for working with database migrations in Summit

## TL;DR

```bash
# 1. Create a new migration
./scripts/create-migration.sh \
  --type schema \
  --description "add_user_preferences"

# 2. Edit the generated file
vim db/migrations/20251120_150000_schema_add_user_preferences.sql

# 3. Test locally
docker-compose up -d postgres
psql $DATABASE_URL < db/migrations/20251120_150000_schema_add_user_preferences.sql

# 4. Commit and create PR
git add db/migrations/20251120_150000_schema_add_user_preferences.sql
git commit -m "feat(db): add user preferences table"
git push origin feature/user-preferences

# CI will automatically validate the migration
```

---

## Creating a New Migration

### Step 1: Generate Migration File

Use the migration generator:

```bash
./scripts/create-migration.sh \
  --type <type> \
  --database <database> \
  --description "<description>"
```

**Parameters:**
- `--type`: `schema`, `data`, `security`, or `perf`
- `--database`: `postgresql`, `neo4j`, or `timescale`
- `--description`: Brief description (e.g., `add_email_verification`)
- `--breaking` (optional): Mark as breaking change
- `--depends-on` (optional): Comma-separated migration IDs

**Example:**
```bash
./scripts/create-migration.sh \
  --type schema \
  --database postgresql \
  --description "add_email_verification_column"
```

### Step 2: Edit Migration

The generator creates a template with three phases:

```sql
-- PHASE 1: EXPAND
-- Add new schema elements
BEGIN;
CREATE TABLE user_preferences (...);
CREATE INDEX CONCURRENTLY idx_user_preferences_user_id ON user_preferences(user_id);
COMMIT;

-- PHASE 2: MIGRATE (optional)
-- Backfill or transform data

-- PHASE 3: CONTRACT (optional)
-- Remove old schema elements

-- ROLLBACK
-- Reverse all changes
BEGIN;
DROP TABLE IF EXISTS user_preferences CASCADE;
COMMIT;
```

### Step 3: Test Migration

```bash
# Start test database
docker-compose up -d postgres

# Apply migration
psql $DATABASE_URL < db/migrations/YOUR_MIGRATION.sql

# Verify
psql $DATABASE_URL -c "SELECT * FROM user_preferences LIMIT 1;"

# Test rollback
psql $DATABASE_URL -c "DROP TABLE user_preferences;"
```

### Step 4: Create Pull Request

```bash
git add db/migrations/YOUR_MIGRATION.sql
git commit -m "feat(db): <description>

- Add user preferences table
- Include rollback steps
- Zero-downtime migration

Migration ID: 20251120_150000
Version: 2.1.0"

git push origin feature/user-preferences
```

CI will automatically:
- ✅ Validate migration format
- ✅ Run migration in test environment
- ✅ Test rollback
- ✅ Check for schema drift
- ✅ Generate migration report

---

## Zero-Downtime Patterns

### Adding a Column

#### ❌ Don't (requires downtime):
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL;
```

#### ✅ Do (zero-downtime):
```sql
-- Phase 1: Add nullable column
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Deploy application code (handles NULL gracefully)

-- Phase 2: Backfill (background job)
UPDATE users SET email_verified = TRUE WHERE email IS NOT NULL;

-- Phase 3: Add constraint
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
```

### Creating an Index

#### ❌ Don't (locks table):
```sql
CREATE INDEX idx_users_email ON users(email);
```

#### ✅ Do (no locks):
```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### Renaming a Column

```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);

-- Deploy code that writes to BOTH columns

-- Phase 2: Backfill
UPDATE users SET email_address = email WHERE email_address IS NULL;

-- Deploy code that reads from email_address

-- Phase 3: Drop old column
ALTER TABLE users DROP COLUMN email;
```

### Dropping a Column

```sql
-- Phase 1: Deploy code that stops reading column

-- Phase 2: Drop column (after all instances updated)
ALTER TABLE users DROP COLUMN old_column;
```

---

## Common Tasks

### Check Migration Status

```bash
# PostgreSQL
psql $DATABASE_URL -c "
  SELECT version, database_type, applied_at, migration_id
  FROM schema_versions
  ORDER BY applied_at DESC
  LIMIT 10;
"

# Or use helper function
psql $DATABASE_URL -c "SELECT get_current_schema_version('postgresql');"
```

### List Pending Migrations

```bash
# Find migrations not in migration_history
psql $DATABASE_URL -c "
  SELECT migration_file
  FROM migration_history
  WHERE status = 'pending';
"
```

### Rollback a Migration

```bash
# Manual rollback
psql $DATABASE_URL < db/migrations/YOUR_MIGRATION.sql
# (Execute the rollback section)

# Or use rollback script
./scripts/database/rollback-migration.sh \
  --migration-id "20251120_150000" \
  --dry-run
```

### Generate Schema Snapshot

```bash
# PostgreSQL
pg_dump $DATABASE_URL \
  --schema-only \
  --no-owner \
  --no-privileges \
  > snapshots/schema_$(date +%Y%m%d).sql

# Neo4j
cypher-shell -a $NEO4J_URI -u neo4j -p $NEO4J_PASSWORD \
  "SHOW CONSTRAINTS;" > snapshots/neo4j_constraints.txt
```

---

## Pre-commit Checklist

Before committing your migration:

- [ ] Migration follows naming convention (`YYYYMMDD_HHMMSS_<type>_<description>`)
- [ ] Uses zero-downtime patterns (CONCURRENTLY, NOT VALID, phased approach)
- [ ] Includes rollback steps (tested locally)
- [ ] Has validation queries
- [ ] No direct `DROP COLUMN` or `DROP TABLE` without deprecation
- [ ] Tested locally in Docker environment
- [ ] Commit message follows conventional commits format

---

## Production Deployment

Migrations are automatically deployed by CI/CD:

1. **PR Merged** → Triggers deployment pipeline
2. **Backup Created** → Database backup before migration
3. **Migration Applied** → Zero-downtime script executes
4. **Validation** → Post-migration health checks
5. **Monitoring** → Metrics tracked in Grafana

### Manual Production Migration (Emergency)

```bash
# 1. Backup
./scripts/database/create-backup.sh

# 2. Apply migration
./scripts/database/zero-downtime-migration.sh \
  --no-maintenance-mode \
  --timeout 3600

# 3. Verify
./scripts/database/validate-schema.sh

# 4. Monitor
# Check Grafana dashboard: Database Migrations
```

---

## Troubleshooting

### Migration Fails Locally

```bash
# Check error message
psql $DATABASE_URL < db/migrations/YOUR_MIGRATION.sql

# Common issues:
# 1. Missing dependencies → Check --depends-on
# 2. Syntax error → Validate SQL
# 3. Constraint violation → Check existing data

# Rollback
psql $DATABASE_URL -c "ROLLBACK;"
```

### CI Migration Validation Fails

Check the GitHub Actions workflow for details:
1. Go to PR → Checks → "Migration Dry-Run"
2. Review logs for specific error
3. Fix and push updated migration

### Schema Drift Detected

If CI detects schema drift:
1. Review the drift report artifact
2. Determine if drift is intentional
3. If intentional, update expected schema:
   ```bash
   cp snapshots/postgres_schema.sql db/expected_schema.sql
   git add db/expected_schema.sql
   git commit -m "chore(db): update expected schema"
   ```

---

## Best Practices

### DO ✅

- Use `CREATE INDEX CONCURRENTLY` for indexes
- Add columns as nullable first, backfill, then add NOT NULL
- Use transactions (`BEGIN`/`COMMIT`) for atomic operations
- Include detailed comments in migrations
- Test rollback before deploying
- Use batch updates for large data migrations
- Set reasonable lock timeouts

### DON'T ❌

- Use `DROP COLUMN` immediately (deprecate first)
- Create indexes without `CONCURRENTLY` on large tables
- Run long-running migrations during peak hours
- Skip rollback steps
- Commit untested migrations
- Mix schema and data changes in the same transaction
- Use `ALTER TABLE` on production tables without understanding locks

---

## Resources

- **Full Strategy Doc**: [docs/DATABASE_MIGRATION_STRATEGY.md](./DATABASE_MIGRATION_STRATEGY.md)
- **Zero-Downtime Script**: [scripts/database/zero-downtime-migration.sh](../scripts/database/zero-downtime-migration.sh)
- **Migration Framework**: [server/src/migrations/migrationFramework.ts](../server/src/migrations/migrationFramework.ts)
- **CI Workflow**: [.github/workflows/migration-dryrun.yml](../.github/workflows/migration-dryrun.yml)

---

## Getting Help

- **Slack**: `#database-migrations` channel
- **Documentation**: [docs/DATABASE_MIGRATION_STRATEGY.md](./DATABASE_MIGRATION_STRATEGY.md)
- **Runbooks**: [RUNBOOKS/database/](../RUNBOOKS/database/)
- **Team Lead**: Platform Engineering Team

---

**Remember**: The golden path is sacred. Keep it green! 🟢
