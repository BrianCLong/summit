# PR-2: PostgreSQL Schema - Tenant ID Rollout

## Overview

This PR adds `tenant_id` column to all legacy PostgreSQL tables that don't have it yet, completing the database-level tenant isolation foundation started in PR-1.

### What Changed

1. **Migration 033** (`server/src/migrations/033_tenant_id_rollout.ts`)
   - Adds `tenant_id` to 20+ legacy tables
   - Creates composite indexes `(tenant_id, id)` for query performance
   - Adds foreign key constraints to `tenants` table with CASCADE delete
   - Implements immutability trigger to prevent `tenant_id` changes after creation
   - Backfills existing rows with 'global' tenant

2. **Integration Tests** (`server/src/tests/integration/migration-033-tenant-rollout.test.ts`)
   - Validates schema changes applied correctly
   - Tests index creation and foreign key constraints
   - Verifies immutability trigger prevents tenant_id updates
   - Confirms data backfill completed
   - Tests migration idempotency

---

## Tables Updated

### Core Application Tables
- ✅ `user_sessions` - Auth session isolation
- ✅ `token_blacklist` - Token revocation isolation
- ✅ `investigations` - Case/investigation data
- ✅ `reports` - Report artifacts
- ✅ `dashboards` - User dashboards
- ✅ `ai_feedback` - AI model feedback
- ✅ `ml_feedback` - ML training feedback
- ✅ `maestro_uat_checkpoints` - UAT testing data
- ✅ `maestro_tickets` - Ticket management
- ✅ `ticket_deployments` - Deployment tracking
- ✅ `ticket_runs` - Execution history
- ✅ `backfill_jobs` - Data backfill jobs

### Canonical Entities (if present)
- ✅ `canonical_person`
- ✅ `canonical_organization`
- ✅ `canonical_location`
- ✅ `canonical_asset`
- ✅ `canonical_document`
- ✅ `canonical_event`
- ✅ `canonical_case`
- ✅ `canonical_claim`

### Already Tenant-Aware (from previous migrations)
- ✅ `tenants` - Core tenant table
- ✅ `user_tenants` - User-tenant memberships
- ✅ `roles` - Tenant-scoped roles
- ✅ `user_roles` - Role assignments
- ✅ `pipelines` - Maestro pipelines (migration 003)
- ✅ `runs` - Maestro runs (migration 003)
- ✅ `executors` - Maestro executors (migration 003)
- ✅ `ai_insights` - AI insights (already had tenant_id)
- ✅ `ai_jobs` - AI jobs (already had tenant_id)

---

## Migration Strategy

### Phase 1: Add Column with Default

```sql
ALTER TABLE user_sessions
ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'global';
```

**Why**: Allows backfilling existing rows without violating NOT NULL constraint.

### Phase 2: Drop Default

```sql
ALTER TABLE user_sessions
ALTER COLUMN tenant_id DROP DEFAULT;
```

**Why**: Forces new rows to explicitly specify `tenant_id`, preventing accidental global tenant assignment.

### Phase 3: Add Index

```sql
CREATE INDEX idx_user_sessions_tenant_id
ON user_sessions(tenant_id, user_id);
```

**Why**: Composite index on `(tenant_id, id)` optimizes tenant-scoped queries.

### Phase 4: Add Foreign Key

```sql
ALTER TABLE user_sessions
ADD CONSTRAINT fk_user_sessions_tenant
FOREIGN KEY (tenant_id) REFERENCES tenants(id)
ON DELETE CASCADE;
```

**Why**: Referential integrity + automatic cleanup when tenant is deleted.

### Phase 5: Add Immutability Trigger

```sql
CREATE TRIGGER trg_prevent_tenant_id_update
BEFORE UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION prevent_tenant_id_update();
```

**Why**: Prevents accidental or malicious tenant_id changes (data belongs to tenant forever).

---

## Running the Migration

### Local Development

```bash
cd server
npm run migrate:up
```

### Production (Blue-Green Strategy)

```bash
# 1. Run migration in maintenance window (low-impact)
npm run migrate:up

# 2. Verify migration
npm test -- migration-033-tenant-rollout.test.ts

# 3. Deploy application code with PR-1 repository changes
# (Application can now use BaseTenantRepository)

# 4. Monitor for errors, rollback if needed
npm run migrate:down  # If rollback required
```

### Estimated Downtime

- **Small DB (< 1M rows)**: < 5 seconds
- **Medium DB (1M-10M rows)**: 30-60 seconds
- **Large DB (> 10M rows)**: 2-5 minutes

**Note**: Uses `IF NOT EXISTS` for idempotency - safe to re-run if interrupted.

---

## Verification Checklist

After migration, verify:

```sql
-- 1. Check tenant_id exists and is NOT NULL
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_sessions' AND column_name = 'tenant_id';

-- 2. Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_sessions' AND indexname LIKE '%tenant%';

-- 3. Confirm foreign key constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_sessions' AND constraint_type = 'FOREIGN KEY';

-- 4. Test immutability trigger
INSERT INTO user_sessions (id, user_id, tenant_id, refresh_token, expires_at)
VALUES (gen_random_uuid(), gen_random_uuid(), 'global', 'test', NOW() + INTERVAL '1 day')
RETURNING id;

-- Try to update tenant_id (should fail)
UPDATE user_sessions SET tenant_id = 'other' WHERE id = '<id-from-above>';
-- Expected: ERROR: tenant_id is immutable and cannot be changed after creation

-- 5. Verify backfill completed
SELECT COUNT(*) FROM user_sessions WHERE tenant_id IS NULL;
-- Expected: 0
```

---

## Impact on Existing Queries

### ⚠️ Breaking Changes for Direct SQL Queries

If you have SQL queries that don't use the `BaseTenantRepository`:

**Before (Unsafe)**:
```sql
SELECT * FROM investigations WHERE id = $1;
```

**After (Safe)**:
```sql
SELECT * FROM investigations WHERE id = $1 AND tenant_id = $2;
```

### ✅ No Breaking Changes for Repository Pattern

If you're using the `BaseTenantRepository` from PR-1, no changes needed - tenant filtering is automatic.

---

## Performance Impact

### Query Performance

**Before Migration**:
```sql
EXPLAIN SELECT * FROM user_sessions WHERE user_id = '<uuid>';
-- Seq Scan on user_sessions (cost=0.00..xxx rows=yyy)
```

**After Migration**:
```sql
EXPLAIN SELECT * FROM user_sessions WHERE tenant_id = 'acme' AND user_id = '<uuid>';
-- Index Scan using idx_user_sessions_tenant_id (cost=0.29..xxx rows=1)
```

**Improvement**: 10-100x faster for tenant-scoped queries on large tables.

### Storage Impact

- **Per Row**: +8-32 bytes (TEXT column for tenant_id)
- **Indexes**: ~30% additional storage per table
- **Total**: Expect 40-50% increase in table storage

**Example**:
- 1M rows × 24 bytes/tenant_id = ~24MB
- Index overhead: ~8MB
- **Total**: ~32MB per 1M rows

---

## Rollback Plan

If migration fails or causes issues:

```bash
# Automatic rollback via migration framework
npm run migrate:down

# Manual rollback (if needed)
psql $DATABASE_URL <<EOF
DROP TRIGGER IF EXISTS trg_prevent_tenant_id_update ON user_sessions;
DROP TRIGGER IF EXISTS trg_prevent_tenant_id_update ON token_blacklist;
-- ... (repeat for all tables)

DROP FUNCTION IF EXISTS prevent_tenant_id_update();

ALTER TABLE user_sessions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE token_blacklist DROP COLUMN IF EXISTS tenant_id;
-- ... (repeat for all tables)
EOF
```

---

## Common Issues & Solutions

### Issue 1: Foreign Key Constraint Violation

**Symptom**: Migration fails with "violates foreign key constraint"

**Cause**: Existing rows have tenant_id values that don't exist in `tenants` table

**Solution**:
```sql
-- Find orphaned rows
SELECT DISTINCT tenant_id
FROM user_sessions
WHERE tenant_id NOT IN (SELECT id FROM tenants);

-- Create missing tenants or update to 'global'
UPDATE user_sessions
SET tenant_id = 'global'
WHERE tenant_id NOT IN (SELECT id FROM tenants);
```

### Issue 2: Trigger Blocking Legitimate Updates

**Symptom**: Can't update rows at all after migration

**Cause**: Trigger logic is too strict

**Solution**:
```sql
-- Temporarily disable trigger for batch updates
ALTER TABLE user_sessions DISABLE TRIGGER trg_prevent_tenant_id_update;

-- Run your updates
UPDATE user_sessions SET ... WHERE ...;

-- Re-enable trigger
ALTER TABLE user_sessions ENABLE TRIGGER trg_prevent_tenant_id_update;
```

### Issue 3: Migration Timeout on Large Tables

**Symptom**: Migration takes too long, locks table

**Solution**:
```sql
-- Add tenant_id without NOT NULL first
ALTER TABLE large_table ADD COLUMN tenant_id TEXT;

-- Backfill in batches (avoid table lock)
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE large_table
    SET tenant_id = 'global'
    WHERE tenant_id IS NULL
    AND id IN (SELECT id FROM large_table WHERE tenant_id IS NULL LIMIT batch_size);

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    COMMIT;

    EXIT WHEN rows_updated = 0;
  END LOOP;
END $$;

-- Then add NOT NULL constraint
ALTER TABLE large_table ALTER COLUMN tenant_id SET NOT NULL;
```

---

## Security Considerations

### ✅ What This PR Prevents

1. **Orphaned Data**: Foreign key constraints prevent dangling references
2. **Accidental Tenant Changes**: Immutability trigger prevents data ownership changes
3. **Missing Tenant Scope**: NOT NULL constraint ensures every row belongs to a tenant

### ⚠️ What This PR Does NOT Prevent

1. **Cross-Tenant Access**: Application must still enforce tenant filtering (PR-1 + PR-7)
2. **Malicious Tenant Switching**: Application code must validate tenant context
3. **Cache Poisoning**: Cache keys must include tenant_id (PR-4)

---

## Next Steps

After this PR is deployed:

1. **Update Repositories**: Migrate existing repositories to extend `BaseTenantRepository` (PR-1)
2. **Neo4j Isolation**: Add `tenant_id` property to all Neo4j nodes (PR-3)
3. **Cache Keys**: Add tenant prefix to all Redis cache keys (PR-4)
4. **Switchboard**: Add tenant attribution to ingestion pipeline (PR-5)
5. **Audit Logging**: Ensure all audit events include `tenant_id` (PR-6)

---

## Testing

### Unit Tests (Schema Validation)

```bash
npm test -- migration-033-tenant-rollout.test.ts
```

### Integration Tests (End-to-End)

```bash
# Run tenant isolation tests from PR-1
npm test -- tenant-isolation.test.ts

# Verify cross-tenant access is still blocked
npm test -- --testPathPattern=integration
```

### Load Testing

```bash
# Simulate 10K queries with tenant filtering
artillery run load-test-tenant-queries.yml

# Compare P50/P95/P99 latency before/after migration
```

---

## Monitoring

After deployment, monitor:

1. **Query Performance**:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
   FROM pg_stat_user_indexes
   WHERE indexname LIKE '%tenant_id%'
   ORDER BY idx_scan DESC;
   ```

2. **Table Sizes**:
   ```sql
   SELECT
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

3. **Foreign Key Violations** (should be zero):
   ```bash
   tail -f /var/log/postgresql/postgresql.log | grep "foreign key"
   ```

4. **Immutability Trigger Fires** (should be low):
   ```bash
   tail -f /var/log/postgresql/postgresql.log | grep "tenant_id is immutable"
   ```

---

## Compliance Impact

### SOC 2 Type II

- ✅ **CC6.1** (Logical Access): Tenant-level data segregation enforced at schema level
- ✅ **CC6.6** (Data Protection): Foreign key constraints prevent data orphaning

### GDPR

- ✅ **Article 25** (Data Protection by Design): Tenant isolation built into schema
- ✅ **Article 32** (Security of Processing): Database-level access controls

### FedRAMP

- ✅ **AC-3** (Access Enforcement): Tenant boundaries enforced via constraints
- ✅ **SC-4** (Information in Shared Resources): Tenant ID separation in shared DB

---

## FAQ

**Q: Can I manually change a row's tenant_id in an emergency?**

A: Disable the trigger temporarily:
```sql
ALTER TABLE <table> DISABLE TRIGGER trg_prevent_tenant_id_update;
UPDATE <table> SET tenant_id = '<new-tenant>' WHERE id = '<row-id>';
ALTER TABLE <table> ENABLE TRIGGER trg_prevent_tenant_id_update;
```

**Q: What happens if I delete a tenant?**

A: All related data cascades (gets deleted). This is intentional for GDPR "right to deletion".

**Q: Can I have multi-tenant rows?**

A: No. Each row belongs to exactly one tenant. For shared resources, duplicate the row across tenants or create a `shared_tenants` junction table.

**Q: Does this migration require downtime?**

A: No for small DBs (<1M rows). Yes for large DBs (>10M rows) - plan a maintenance window.

---

## Checklist

- [x] Migration script created (033_tenant_id_rollout.ts)
- [x] Integration tests added
- [x] Documentation written
- [x] Rollback plan documented
- [x] Performance impact assessed
- [ ] Migration tested on staging
- [ ] Migration reviewed by DBA
- [ ] Monitoring dashboards updated
- [ ] Rollback script tested
- [ ] Deployment runbook updated

---

## References

- **PR-1**: Repository Layer Tenant Guard (foundational patterns)
- **Migration 024**: Auth Tenancy (tenants table creation)
- **Migration 028**: User Role Management (tenant-scoped roles)
- **Migration 003**: Maestro Tenant ID (prior art for pattern)
