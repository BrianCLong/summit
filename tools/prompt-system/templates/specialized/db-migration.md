---
id: db-migration
name: Database Migration Template
version: 1.0.0
category: specialized
type: db-migration
description: Safe database schema migration for PostgreSQL and Neo4j
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - database
  - migration
  - schema
  - postgres
  - neo4j
metadata:
  priority: P2
  estimatedTokens: 2000
  complexity: moderate
variables:
  - name: migrationName
    type: string
    description: Migration name
    required: true
    prompt: "Migration name? (e.g., 'add_user_preferences_table')"
  - name: databaseType
    type: string
    description: Database type
    required: true
    validation:
      enum: [postgres, neo4j, both]
    prompt: "Database (postgres/neo4j/both)?"
  - name: changeDescription
    type: multiline
    description: Description of database changes
    required: true
    prompt: "Describe the database changes:"
  - name: dataImpact
    type: string
    description: Impact on existing data
    default: "No impact on existing data"
    prompt: "Impact on existing data?"
  - name: reversible
    type: boolean
    description: Is the migration reversible
    default: true
    prompt: "Is this reversible? (true/false)"
---
# 🗄️ Database Migration — Safe Schema Evolution

## Role

You are a database engineer specializing in safe schema migrations. Your task is to create and test a {{databaseType}} migration that preserves data integrity and allows zero-downtime deployment.

---

## 1. Migration Request

### Name
**{{migrationName}}**

### Database
**{{databaseType}}**

### Changes
{{changeDescription}}

### Data Impact
{{dataImpact}}

### Reversibility
{{#if reversible}}This migration is reversible{{else}}⚠️ This migration is NOT reversible - requires careful planning{{/if}}

---

## 2. Database Migration Principles

### Safety Requirements

1. **Zero-downtime deployment**
   * Migrations run before code deployment
   * Backward compatible with old code
   * Forward compatible with new code

2. **Data integrity**
   * No data loss
   * Maintain referential integrity
   * Preserve constraints

3. **Performance**
   * No table locks on large tables
   * Use concurrent indexes
   * Avoid full table scans

4. **Reversibility**
   * Always provide rollback migration
   * Test rollback procedure
   * Document rollback steps

---

## 3. PostgreSQL Migration Guide

### Safe Operations

* ✅ Add new table
* ✅ Add new column with default NULL
* ✅ Add index concurrently
* ✅ Add check constraint (NOT VALIDATED, then VALIDATE)
* ✅ Create new foreign key (NOT VALIDATED, then VALIDATE)

### Unsafe Operations (Require Care)

* ⚠️ Add NOT NULL column (use multi-step migration)
* ⚠️ Drop column (use multi-step: deprecate → deploy → remove)
* ⚠️ Change column type (use new column + migration)
* ⚠️ Add unique constraint (use concurrent index first)
* ⚠️ Large data migrations (batch process)

### Migration Steps

1. **Create migration file**
   ```bash
   # Prisma
   pnpm db:pg:migrate dev --name {{migrationName}}

   # Or Knex
   pnpm db:knex:migrate:make {{migrationName}}
   ```

2. **Write migration SQL**
   * Use transactions
   * Add appropriate indexes
   * Set statement timeout
   * Include comments

3. **Test migration**
   * Test on production-like data volume
   * Verify performance impact
   * Test rollback

---

## 4. Neo4j Migration Guide

### Cypher Migration Best Practices

1. **Create indexes and constraints first**
   ```cypher
   CREATE INDEX idx_name IF NOT EXISTS
   FOR (n:Label)
   ON (n.property)
   ```

2. **Batch large data changes**
   ```cypher
   CALL apoc.periodic.iterate(
     "MATCH (n:OldLabel) RETURN n",
     "SET n:NewLabel",
     {batchSize: 1000}
   )
   ```

3. **Use MERGE for idempotency**
   ```cypher
   MERGE (n:Node {id: $id})
   ON CREATE SET n.created = timestamp()
   ON MATCH SET n.updated = timestamp()
   ```

4. **Monitor memory usage**
   * Use `CALL dbms.listQueries()` to check running queries
   * Add `USING PERIODIC COMMIT` for large imports

---

## 5. Multi-Step Migration Pattern

For breaking changes, use multi-step migrations:

### Example: Adding NOT NULL Column

**Step 1** (Deploy with old code):
```sql
-- Add column as NULL
ALTER TABLE users ADD COLUMN preferences JSONB NULL;

-- Backfill existing data
UPDATE users SET preferences = '{}' WHERE preferences IS NULL;
```

**Step 2** (Deploy new code using the column):
```sql
-- Verify all data is filled
SELECT COUNT(*) FROM users WHERE preferences IS NULL;
-- Should be 0
```

**Step 3** (Final migration):
```sql
-- Now safe to add NOT NULL
ALTER TABLE users ALTER COLUMN preferences SET NOT NULL;
```

---

## 6. Implementation Requirements

### PostgreSQL Migration

1. **Migration file structure**
   * Up migration
   * Down migration (rollback)
   * Transaction boundaries
   * Comments explaining each step

2. **Performance considerations**
   * Add indexes CONCURRENTLY
   * Batch large UPDATE/DELETE operations
   * Set appropriate statement_timeout
   * Use ANALYZE after significant changes

3. **Safety checks**
   * Verify data before altering
   * Test on copy of production data
   * Have rollback plan

### Neo4j Migration

1. **Migration script**
   * Idempotent operations
   * Batched for large changes
   * Error handling
   * Progress tracking

2. **Constraints and indexes**
   * Create before data changes
   * Use IF NOT EXISTS
   * Wait for indexes to be online

3. **Data migration**
   * Use APOC procedures for batching
   * Monitor memory usage
   * Verify results with counts

---

## 7. Deliverables

### A. Migration Files

**PostgreSQL** (if applicable):
```sql
-- migrations/YYYYMMDD_{{migrationName}}.up.sql
-- migrations/YYYYMMDD_{{migrationName}}.down.sql
```

**Neo4j** (if applicable):
```cypher
-- migrations/neo4j/YYYYMMDD_{{migrationName}}.cypher
-- migrations/neo4j/YYYYMMDD_{{migrationName}}_rollback.cypher
```

### B. Data Migration Scripts (if needed)

```javascript
// scripts/migrations/{{migrationName}}_data.js
// Batch processing script for large data changes
```

### C. Tests

1. **Migration test**
   * Apply migration to test DB
   * Verify schema changes
   * Verify data integrity
   * Test rollback

2. **Performance test**
   * Time migration on prod-like data
   * Check for blocking operations
   * Verify index usage

### D. Documentation

```markdown
## Migration: {{migrationName}}

### Purpose
[What this migration does]

### Schema Changes
- [List of changes]

### Data Changes
- [Any data transformations]

### Rollback Procedure
[Step-by-step rollback]

### Performance Impact
- Estimated duration: X seconds
- Locking: None/Minimal
- Downtime: None

### Pre-deployment Checklist
- [ ] Tested on production-like data
- [ ] Rollback tested
- [ ] Backup verified
- [ ] Performance acceptable

### Post-deployment Verification
- [ ] Schema matches expected
- [ ] Data integrity verified
- [ ] Application working
- [ ] No performance issues
```

---

## 8. Verification Checklist

* [ ] Migration file(s) created
* [ ] Rollback migration created (if reversible)
* [ ] Tested on copy of production data
* [ ] Performance impact measured and acceptable
* [ ] No table locks on large tables
* [ ] Indexes created concurrently
* [ ] Data integrity verified
* [ ] Rollback tested and works
* [ ] Documentation complete
* [ ] Backup strategy confirmed
* [ ] Monitoring in place for deployment
* [ ] Migration runs successfully
* [ ] All tests pass after migration
* [ ] Application still works with old code (backward compatible)
* [ ] Application works with new code (forward compatible)

---

## 9. Deployment Plan

### Pre-Deployment

1. **Backup database**
   ```bash
   pnpm db:backup
   ```

2. **Test on staging**
   * Apply migration to staging
   * Verify application works
   * Time the migration

3. **Schedule maintenance window** (if needed)
   * For major migrations only
   * Notify users
   * Prepare rollback plan

### Deployment

1. **Apply migration**
   ```bash
   # PostgreSQL
   pnpm db:pg:migrate

   # Neo4j
   pnpm db:neo4j:migrate
   ```

2. **Verify success**
   * Check migration status
   * Verify schema
   * Run smoke tests

3. **Monitor**
   * Watch error rates
   * Check performance metrics
   * Review logs

### Post-Deployment

1. **Verify data integrity**
2. **Update schema documentation**
3. **Archive migration notes**

---

## 10. Output Format

Structure your response as:

1. **Migration Overview** (what's changing and why)
2. **Migration Files** (SQL/Cypher with full content)
3. **Data Migration Scripts** (if needed)
4. **Test Suite** (migration tests, rollback tests)
5. **Documentation** (purpose, rollback, verification)
6. **Deployment Plan** (step-by-step)
7. **Verification Checklist** (with confirmations)

---

**Remember**: Migrations are one-way (mostly). Test thoroughly, have a rollback plan, and never lose data! 🗄️
