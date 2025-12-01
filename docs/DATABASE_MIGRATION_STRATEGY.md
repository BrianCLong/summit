# Database Migration and Schema Management Strategy

> **Document Version**: 1.0
> **Last Updated**: 2025-11-20
> **Status**: Active
> **Owner**: Platform Engineering Team

## Executive Summary

This document defines Summit/IntelGraph's comprehensive database migration and schema management strategy, consolidating existing tools and establishing best practices for zero-downtime migrations across PostgreSQL, Neo4j, TimescaleDB, and Redis.

### Key Findings from Audit

**Strengths:**
- ✅ Advanced migration framework with 3-phase support (expand, migrate, contract)
- ✅ Zero-downtime migration script with rollback capabilities
- ✅ CI/CD migration validation workflows
- ✅ Comprehensive monitoring and metrics

**Gaps Identified:**
- ⚠️ Multiple migration tools creating fragmentation (Prisma, Knex, custom)
- ⚠️ ~40+ migration files scattered across different services
- ⚠️ Inconsistent naming conventions (V1-V18, date-based, numbered)
- ⚠️ No centralized migration registry or catalog
- ⚠️ Limited schema drift detection
- ⚠️ No formal database versioning strategy

---

## Table of Contents

1. [Database Architecture Overview](#database-architecture-overview)
2. [Migration Tool Consolidation](#migration-tool-consolidation)
3. [Zero-Downtime Migration Patterns](#zero-downtime-migration-patterns)
4. [Database Versioning Strategy](#database-versioning-strategy)
5. [Schema Validation & Drift Detection](#schema-validation--drift-detection)
6. [Rollback Procedures](#rollback-procedures)
7. [CI/CD Integration](#cicd-integration)
8. [Migration Best Practices](#migration-best-practices)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Database Architecture Overview

### Current Database Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
└─────────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │PostgreSQL│   │  Neo4j   │   │TimescaleDB
    │  (Main)  │   │ (Graph)  │   │(Analytics)│
    └──────────┘   └──────────┘   └──────────┘
           │              │              │
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Redis   │   │  Kafka/  │   │  MinIO   │
    │ (Cache)  │   │ Redpanda │   │(Storage) │
    └──────────┘   └──────────┘   └──────────┘
```

### Database Responsibilities

| Database | Primary Use | Migration Scope | Current Tools |
|----------|-------------|-----------------|---------------|
| **PostgreSQL** | Relational data, metadata, audit logs | High | Knex, custom framework |
| **Neo4j** | Entity graphs, relationships | High | Custom .js migrations, .cypher scripts |
| **TimescaleDB** | Time-series data, analytics traces | Medium | Direct SQL, custom framework |
| **Redis** | Caching, sessions, locks | Low | Schema-less (config only) |

### Current Migration File Locations

Audit identified migrations in **12+ different locations**:

```
db/migrations/                           # 26 files (V1-V18, date-based)
server/db/migrations/postgres/           # 10 files (date-based)
server/db/migrations/neo4j/              # 4 files (.cypher)
server/db/migrations/timescale/          # 3 files
server/src/db/migrations/postgres/       # 10 files
server/src/db/migrations/neo4j/          # 4 files (.js)
server/src/migrations/                   # 21 files (versioned)
server/migrations/                       # 7 files
services/api/migrations/                 # 2 files
packages/maestro-core/migrations/        # 1 file
packages/data-catalog/migrations/        # 1 file
prov-ledger/migrations/                  # 1 file
```

---

## Migration Tool Consolidation

### Recommended Approach: Unified Migration Framework

**Decision**: Adopt the existing **custom migration framework** (`server/src/migrations/migrationFramework.ts`) as the **single source of truth** for all migrations.

#### Rationale

1. **Already supports zero-downtime**: 3-phase (expand, migrate, contract) pattern
2. **Multi-database support**: Handles PostgreSQL, Neo4j, and TimescaleDB
3. **Advanced features**: Rollback, distributed locking, metrics, dry-run
4. **Production-tested**: Includes comprehensive error handling and validation

#### Migration from Other Tools

```typescript
// Phase out:
❌ Prisma Migrate (no schema.prisma found, likely unused)
❌ Knex (minimal usage, only in packages/db/knex/)

// Consolidate to:
✅ Custom Migration Framework (migrationFramework.ts)
✅ Zero-Downtime Script (scripts/database/zero-downtime-migration.sh)
```

### Migration Framework Architecture

```typescript
interface Migration {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  description: string;           // What this migration does
  type: 'postgresql' | 'neo4j' | 'mixed';
  version: string;               // Semantic version (e.g., "1.2.0")
  dependencies: string[];        // Migration IDs this depends on

  phases: {
    expand?: MigrationStep[];    // Add new schema elements
    migrate?: MigrationStep[];   // Migrate data
    contract?: MigrationStep[];  // Remove old schema elements
  };

  rollback?: {
    expand?: MigrationStep[];
    migrate?: MigrationStep[];
    contract?: MigrationStep[];
  };

  metadata: {
    author: string;
    createdAt: Date;
    estimatedDuration: number;   // in seconds
    breakingChange: boolean;
    tenantScoped: boolean;
  };

  validation?: ValidationRule[]; // Pre/post validation

  settings: {
    batchSize?: number;
    pauseBetweenBatches?: number;
    maxRetries?: number;
    timeout?: number;
    requiresMaintenanceWindow?: boolean;
  };
}
```

---

## Zero-Downtime Migration Patterns

### Three-Phase Migration Strategy

Based on the **Expand-Migrate-Contract** pattern for zero-downtime deployments.

```
Phase 1: EXPAND                 Phase 2: MIGRATE               Phase 3: CONTRACT
────────────────────            ─────────────────              ──────────────────
Add new columns                 Copy data to new               Remove old columns
Add new tables                  schema                         Drop unused tables
Create new indexes              Backfill values                Clean up deprecated
Dual-write both schemas         Validate data integrity        indexes

↓                               ↓                              ↓
Application can read            Application reads from         Clean state:
from old OR new schema          new schema, writes to both     Only new schema exists

Duration: Minutes               Duration: Hours/Days           Duration: Minutes
Risk: Low                       Risk: Medium                   Risk: Low
Rollback: Easy                  Rollback: Possible             Rollback: Difficult
```

### Example: Adding a New Column

#### Traditional Approach (Downtime Required)

```sql
-- ❌ Requires application downtime
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

**Problem**: If deployed before app code, app breaks trying to insert users without `email_verified`.

#### Zero-Downtime Approach

```sql
-- Phase 1: EXPAND (Deploy DB change first)
-- Add nullable column with default
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
CREATE INDEX CONCURRENTLY idx_users_email_verified ON users(email_verified);

-- Deploy application code that:
-- - Reads email_verified if present
-- - Writes email_verified for new users
-- - Handles NULL gracefully

-- Phase 2: MIGRATE (Background job)
-- Backfill existing users
UPDATE users
SET email_verified = (
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN TRUE
    ELSE FALSE
  END
)
WHERE email_verified IS NULL;

-- Phase 3: CONTRACT (After all instances updated)
-- Make column NOT NULL after backfill completes
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
```

### Pattern Catalog

| Pattern | Use Case | Phases Required | Complexity |
|---------|----------|-----------------|------------|
| **Add Column** | New optional field | Expand only | Low |
| **Add Required Column** | New mandatory field | Expand → Migrate → Contract | Medium |
| **Rename Column** | Change column name | Expand (dual write) → Migrate → Contract | Medium |
| **Drop Column** | Remove unused field | Expand (stop reading) → Contract | Low |
| **Split Table** | Normalize schema | Expand → Migrate → Contract | High |
| **Change Type** | Alter column datatype | Expand → Migrate → Contract | High |
| **Add Index** | Performance optimization | Expand (CREATE CONCURRENTLY) | Low |
| **Add Constraint** | Data integrity | Expand (validate) → Contract (enforce) | Medium |

### PostgreSQL-Specific Best Practices

```sql
-- ✅ DO: Use CONCURRENTLY for indexes
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- ✅ DO: Use NOT VALID for constraints (validate later)
ALTER TABLE users ADD CONSTRAINT check_email
  CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
  NOT VALID;
-- Later: VALIDATE CONSTRAINT check_email

-- ✅ DO: Set lock timeout to avoid blocking
SET lock_timeout = '5s';

-- ❌ DON'T: Add NOT NULL without DEFAULT in one step
-- Instead: Add column → Backfill → Add NOT NULL
```

### Neo4j-Specific Patterns

```cypher
// Phase 1: EXPAND - Add new property
MATCH (e:Entity)
WHERE NOT EXISTS(e.canonical_id)
SET e.canonical_id = e.id
RETURN count(e);

// Create index for new property
CREATE INDEX entity_canonical_id IF NOT EXISTS
  FOR (e:Entity) ON (e.canonical_id);

// Phase 2: MIGRATE - Update relationships
MATCH (e1:Entity)-[r:RELATES_TO]->(e2:Entity)
WHERE NOT EXISTS(r.canonical_source_id)
SET r.canonical_source_id = e1.canonical_id,
    r.canonical_target_id = e2.canonical_id
RETURN count(r);

// Phase 3: CONTRACT - Remove old properties (if needed)
MATCH (e:Entity)
REMOVE e.legacy_id
RETURN count(e);
```

---

## Database Versioning Strategy

### Semantic Versioning for Database Schema

Adopt **SemVer** for database versions: `MAJOR.MINOR.PATCH`

```
Version Format: vMAJOR.MINOR.PATCH

MAJOR: Breaking changes (requires code deployment)
MINOR: Backward-compatible additions (optional features)
PATCH: Bug fixes, index optimizations (no schema changes)

Examples:
v1.0.0 - Initial production schema
v1.1.0 - Added email_verified column (backward compatible)
v1.2.0 - Added audit_logs table
v2.0.0 - Removed deprecated user_profiles table (BREAKING)
```

### Schema Version Table

Create a centralized version tracking table:

```sql
CREATE TABLE schema_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,     -- e.g., "2.1.0"
    database_type VARCHAR(20) NOT NULL,      -- 'postgresql', 'neo4j', etc.
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255) NOT NULL,        -- User/system that applied
    migration_id VARCHAR(255) NOT NULL,      -- Reference to migration
    checksum VARCHAR(64) NOT NULL,           -- SHA-256 of migration file
    execution_time_ms INTEGER,
    rollback_available BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_semver CHECK (version ~ '^\d+\.\d+\.\d+$')
);

CREATE INDEX idx_schema_versions_version ON schema_versions(version);
CREATE INDEX idx_schema_versions_database_type ON schema_versions(database_type);
```

### Neo4j Version Tracking

```cypher
// Create version node
CREATE (v:SchemaVersion {
  version: "2.1.0",
  database_type: "neo4j",
  applied_at: datetime(),
  applied_by: "migration_system",
  migration_id: "migration_20251120_001",
  checksum: "sha256hash...",
  execution_time_ms: 1234,
  rollback_available: true,
  metadata: {
    description: "Add canonical entity IDs",
    breaking_change: false
  }
})
RETURN v;

// Query current version
MATCH (v:SchemaVersion)
WHERE v.database_type = "neo4j"
RETURN v.version as current_version
ORDER BY v.applied_at DESC
LIMIT 1;
```

### Migration Naming Convention

**Standardize on date-based versioning** with semantic tags:

```
Format: YYYYMMDD_HHMMSS_<type>_<description>.{sql|cypher|js}

Types:
- schema   : Schema changes (tables, columns, indexes)
- data     : Data migrations
- security : Security/permissions changes
- perf     : Performance optimizations

Examples:
20251120_143000_schema_add_email_verification.sql
20251120_150000_data_backfill_canonical_ids.sql
20251120_153000_perf_add_entity_indexes.cypher
20251121_090000_security_add_rbac_policies.sql
```

### Migration Dependencies

```json
{
  "id": "20251120_150000_data_backfill_canonical_ids",
  "version": "2.1.0",
  "dependencies": [
    "20251120_143000_schema_add_canonical_id_column"
  ],
  "description": "Backfill canonical IDs for existing entities"
}
```

---

## Schema Validation & Drift Detection

### Automated Schema Validation

Implement continuous schema validation to detect drift between:
1. Expected schema (migrations)
2. Actual database schema
3. Application models/types

### PostgreSQL Schema Validation

```sql
-- Compare expected vs. actual schema
WITH expected_columns AS (
  SELECT
    'users' as table_name,
    'email_verified' as column_name,
    'boolean' as data_type,
    'NO' as is_nullable
)
SELECT
  e.table_name,
  e.column_name,
  e.data_type as expected_type,
  c.data_type as actual_type,
  e.is_nullable as expected_nullable,
  c.is_nullable as actual_nullable,
  CASE
    WHEN c.column_name IS NULL THEN 'MISSING'
    WHEN e.data_type != c.data_type THEN 'TYPE_MISMATCH'
    WHEN e.is_nullable != c.is_nullable THEN 'NULLABLE_MISMATCH'
    ELSE 'OK'
  END as status
FROM expected_columns e
LEFT JOIN information_schema.columns c
  ON e.table_name = c.table_name
  AND e.column_name = c.column_name
WHERE status != 'OK';
```

### Schema Snapshot Tool

```bash
#!/bin/bash
# scripts/database/generate-schema-snapshot.sh

# Generate PostgreSQL schema snapshot
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  "$DATABASE_URL" > "snapshots/postgres_schema_$(date +%Y%m%d).sql"

# Generate Neo4j constraints snapshot
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
  "SHOW CONSTRAINTS" > "snapshots/neo4j_constraints_$(date +%Y%m%d).txt"

# Compare with expected schema
diff -u "snapshots/expected_postgres_schema.sql" "snapshots/postgres_schema_$(date +%Y%m%d).sql" || {
  echo "Schema drift detected!"
  exit 1
}
```

### CI/CD Schema Validation

Add to `.github/workflows/schema-validation.yml`:

```yaml
name: Schema Validation

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  validate-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate current schema snapshot
        run: |
          docker-compose up -d postgres neo4j
          sleep 10
          ./scripts/database/generate-schema-snapshot.sh

      - name: Detect schema drift
        run: |
          if ./scripts/database/detect-schema-drift.sh; then
            echo "✅ No schema drift detected"
          else
            echo "❌ Schema drift detected!"
            exit 1
          fi

      - name: Upload drift report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: schema-drift-report
          path: snapshots/drift-report.md
```

### Schema Drift Alerts

```typescript
// scripts/database/detect-schema-drift.ts

import { getPostgresPool } from '../server/src/db/postgres';
import { getNeo4jDriver } from '../server/src/db/neo4j';

interface DriftResult {
  database: string;
  driftDetected: boolean;
  differences: SchemaDifference[];
}

interface SchemaDifference {
  type: 'missing_table' | 'missing_column' | 'type_mismatch' | 'missing_index';
  table: string;
  column?: string;
  expected: string;
  actual: string;
}

async function detectPostgresDrift(): Promise<DriftResult> {
  const pool = getPostgresPool();

  // Load expected schema from migration files
  const expectedSchema = await loadExpectedSchema('postgresql');

  // Query actual schema
  const actualTables = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  // Compare and detect differences
  const differences = compareSchemas(expectedSchema, actualTables.rows);

  return {
    database: 'postgresql',
    driftDetected: differences.length > 0,
    differences,
  };
}

async function detectNeo4jDrift(): Promise<DriftResult> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Check constraints
    const constraints = await session.run('SHOW CONSTRAINTS');

    // Check indexes
    const indexes = await session.run('SHOW INDEXES');

    // Compare with expected
    const expectedConstraints = await loadExpectedSchema('neo4j_constraints');
    const expectedIndexes = await loadExpectedSchema('neo4j_indexes');

    const differences = [
      ...compareNeo4jConstraints(expectedConstraints, constraints.records),
      ...compareNeo4jIndexes(expectedIndexes, indexes.records),
    ];

    return {
      database: 'neo4j',
      driftDetected: differences.length > 0,
      differences,
    };
  } finally {
    await session.close();
  }
}

// Send alerts if drift detected
async function sendDriftAlert(results: DriftResult[]) {
  const driftDetected = results.some((r) => r.driftDetected);

  if (driftDetected) {
    // Send Slack/email alert
    console.error('🚨 Schema drift detected!', results);

    // Create GitHub issue
    // await createGitHubIssue('Schema Drift Detected', formatDriftReport(results));
  }
}
```

---

## Rollback Procedures

### Automated Rollback Strategy

Every migration MUST include rollback logic. The migration framework already supports this.

#### Rollback Types

| Scenario | Rollback Approach | Automation Level |
|----------|-------------------|------------------|
| **Failed Migration** | Automatic (transaction rollback) | Fully automated |
| **Failed Validation** | Automatic (execute rollback steps) | Fully automated |
| **Production Issue** | Manual trigger (via script) | Semi-automated |
| **Data Corruption** | Restore from backup + replay | Manual |

### Example Migration with Rollback

```typescript
// migrations/20251120_150000_add_user_preferences.ts

export const migration: Migration = {
  id: '20251120_150000_add_user_preferences',
  name: 'Add user preferences table',
  description: 'Create user_preferences table for personalization',
  type: 'postgresql',
  version: '2.1.0',
  dependencies: [],

  phases: {
    expand: [
      {
        id: 'create_preferences_table',
        name: 'Create user_preferences table',
        type: 'sql',
        content: `
          CREATE TABLE user_preferences (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            preferences JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id)
          );

          CREATE INDEX idx_user_preferences_user_id
            ON user_preferences(user_id);
        `,
        retryable: false,
        rollback: `
          DROP TABLE IF EXISTS user_preferences CASCADE;
        `,
      },
    ],
  },

  rollback: {
    expand: [
      {
        id: 'drop_preferences_table',
        name: 'Drop user_preferences table',
        type: 'sql',
        content: `
          DROP TABLE IF EXISTS user_preferences CASCADE;
        `,
        retryable: false,
      },
    ],
  },

  validation: [
    {
      name: 'verify_table_exists',
      type: 'post',
      check: `sql:SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_preferences'`,
      expectedResult: { count: 1 },
      critical: true,
    },
  ],

  metadata: {
    author: 'platform-team',
    createdAt: new Date('2025-11-20'),
    estimatedDuration: 30,
    breakingChange: false,
    tenantScoped: false,
  },

  settings: {
    timeout: 60000,
    maxRetries: 3,
    requiresMaintenanceWindow: false,
  },
};
```

### Manual Rollback Procedure

```bash
# 1. Identify migration to rollback
./scripts/database/list-migrations.sh

# 2. Execute rollback
./scripts/database/rollback-migration.sh \
  --migration-id "20251120_150000_add_user_preferences" \
  --tenant-id "all" \
  --dry-run

# 3. Verify rollback (dry-run)
./scripts/database/verify-rollback.sh \
  --migration-id "20251120_150000_add_user_preferences"

# 4. Execute rollback (for real)
./scripts/database/rollback-migration.sh \
  --migration-id "20251120_150000_add_user_preferences" \
  --tenant-id "all"

# 5. Validate database state
./scripts/database/validate-schema.sh
```

### Rollback Safety Checks

```typescript
async function canRollback(migrationId: string): Promise<boolean> {
  // Check 1: Migration has rollback steps defined
  const migration = await loadMigration(migrationId);
  if (!migration.rollback) {
    console.error('No rollback steps defined for this migration');
    return false;
  }

  // Check 2: No dependent migrations have been applied
  const dependentMigrations = await findDependentMigrations(migrationId);
  if (dependentMigrations.length > 0) {
    console.error(`Cannot rollback: ${dependentMigrations.length} dependent migrations exist`);
    return false;
  }

  // Check 3: Backup exists
  const backupExists = await checkBackupExists(migrationId);
  if (!backupExists) {
    console.warn('No backup found - rollback may result in data loss');
    // return false; // Optionally enforce backup requirement
  }

  // Check 4: Not too old (optional constraint)
  const migrationAge = await getMigrationAge(migrationId);
  if (migrationAge > 30) { // days
    console.warn('Migration is over 30 days old - consider restore from backup instead');
  }

  return true;
}
```

---

## CI/CD Integration

### Migration Gate Checks

Current implementation in `.github/workflows/migration-dryrun.yml` is good. Enhancements:

```yaml
name: Migration Gate

on:
  pull_request:
    paths:
      - '**/migrations/**'
      - 'server/src/migrations/**'
      - 'db/**'

jobs:
  migration-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate migration format
        run: |
          # Check naming convention
          ./scripts/validate-migration-names.sh

          # Check for required metadata
          ./scripts/validate-migration-metadata.sh

          # Check for rollback steps
          ./scripts/validate-rollback-steps.sh

      - name: Detect destructive migrations
        run: |
          # Scan for DROP, TRUNCATE, DELETE
          ./scripts/detect-destructive-migrations.sh

      - name: Check migration dependencies
        run: |
          # Validate dependency graph
          ./scripts/validate-migration-dependencies.sh

      - name: Dry-run migration
        run: |
          # Spin up test databases
          docker-compose -f docker-compose.test.yml up -d

          # Run migration in test environment
          ./scripts/database/zero-downtime-migration.sh \
            --no-backup \
            --dry-run

      - name: Test rollback
        run: |
          # Apply migration
          ./scripts/database/zero-downtime-migration.sh --no-backup

          # Rollback migration
          ./scripts/database/rollback-migration.sh --all

          # Verify database state matches pre-migration

      - name: Performance impact analysis
        run: |
          # Analyze query plans before/after migration
          ./scripts/analyze-migration-performance.sh

      - name: Generate migration report
        run: |
          ./scripts/generate-migration-report.sh > migration-report.md

      - name: Comment PR with migration report
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('migration-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

### Automated Schema Validation

Add to nightly/weekly CI:

```yaml
name: Weekly Schema Validation

on:
  schedule:
    - cron: '0 2 * * 0'  # Sundays at 2 AM
  workflow_dispatch:

jobs:
  schema-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Connect to production (read-only replica)
        run: |
          # Generate schema snapshot from production
          ./scripts/database/snapshot-production-schema.sh

      - name: Compare with expected schema
        run: |
          # Detect drift
          ./scripts/database/detect-schema-drift.sh

      - name: Validate all indexes exist
        run: |
          # Check for missing indexes
          ./scripts/database/validate-indexes.sh

      - name: Check for slow queries
        run: |
          # Analyze pg_stat_statements
          ./scripts/database/analyze-slow-queries.sh

      - name: Security audit
        run: |
          # Check for missing constraints
          # Check for unencrypted sensitive columns
          ./scripts/database/security-audit.sh

      - name: Send weekly report
        if: always()
        run: |
          ./scripts/send-weekly-schema-report.sh
```

---

## Migration Best Practices

### Development Workflow

```bash
# 1. Create new migration
./scripts/create-migration.sh \
  --type schema \
  --database postgresql \
  --description "add_user_preferences"

# This generates:
# migrations/20251120_150000_schema_add_user_preferences.sql

# 2. Write migration SQL
cat > migrations/20251120_150000_schema_add_user_preferences.sql << 'EOF'
-- Migration: Add user preferences table
-- Version: 2.1.0
-- Author: developer@intelgraph.com
-- Breaking: false

BEGIN;

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX CONCURRENTLY idx_user_preferences_user_id
  ON user_preferences(user_id);

COMMIT;

-- Rollback: Drop user preferences table
BEGIN;
DROP TABLE IF EXISTS user_preferences CASCADE;
COMMIT;
EOF

# 3. Test migration locally
docker-compose up -d postgres
./scripts/database/test-migration.sh \
  migrations/20251120_150000_schema_add_user_preferences.sql

# 4. Test rollback
./scripts/database/test-rollback.sh \
  migrations/20251120_150000_schema_add_user_preferences.sql

# 5. Commit and create PR
git add migrations/20251120_150000_schema_add_user_preferences.sql
git commit -m "feat(db): add user preferences table

- Create user_preferences table
- Add index on user_id
- Include rollback steps

Migration ID: 20251120_150000
Version: 2.1.0
Breaking: false"

git push origin feature/user-preferences
# Open PR - CI will run migration dry-run

# 6. After PR approval and merge
# Deployment will automatically run migration using zero-downtime script
```

### Code Review Checklist

When reviewing migration PRs, verify:

- [ ] Migration follows naming convention (`YYYYMMDD_HHMMSS_<type>_<description>`)
- [ ] Rollback steps are included and tested
- [ ] Uses zero-downtime patterns (CONCURRENTLY, NOT VALID, etc.)
- [ ] No direct `DROP COLUMN` or `DROP TABLE` without deprecation period
- [ ] Includes validation steps
- [ ] Estimated duration is realistic
- [ ] Dependencies are declared correctly
- [ ] Breaking changes are clearly marked
- [ ] Dry-run CI passes
- [ ] Performance impact is analyzed
- [ ] Backup strategy is defined

### Production Deployment Checklist

Before running migrations in production:

- [ ] Backup completed and verified
- [ ] Dry-run executed in staging
- [ ] Rollback plan tested
- [ ] Monitoring alerts configured
- [ ] Team notified (if high-risk)
- [ ] Maintenance window scheduled (if required)
- [ ] Post-migration validation queries prepared
- [ ] Runbook updated with specific migration steps

### Emergency Rollback Checklist

If a migration causes issues in production:

1. **Assess Impact**
   ```bash
   # Check error rate
   kubectl logs -l app=api -n production --tail=100

   # Check database health
   ./scripts/database/health-check.sh
   ```

2. **Decision: Rollback or Fix Forward?**
   - Rollback if: Data corruption, severe performance degradation, app crashes
   - Fix forward if: Minor issues, rollback would cause data loss

3. **Execute Rollback**
   ```bash
   # Enable maintenance mode
   ./scripts/enable-maintenance-mode.sh

   # Rollback migration
   ./scripts/database/rollback-migration.sh \
     --migration-id "MIGRATION_ID" \
     --confirm

   # Validate database state
   ./scripts/database/validate-schema.sh

   # Disable maintenance mode
   ./scripts/disable-maintenance-mode.sh
   ```

4. **Post-Rollback**
   - [ ] Verify application is functional
   - [ ] Check data integrity
   - [ ] Post incident review
   - [ ] Update runbook with lessons learned

---

## Implementation Roadmap

### Phase 1: Consolidation (Weeks 1-2)

**Goal**: Consolidate migration tools and standardize conventions

- [ ] **Week 1**:
  - [ ] Audit all migration files (✅ COMPLETED)
  - [ ] Create migration registry/catalog
  - [ ] Standardize naming conventions
  - [ ] Consolidate scattered migrations into canonical locations

- [ ] **Week 2**:
  - [ ] Migrate Knex migrations to custom framework
  - [ ] Remove Prisma references
  - [ ] Update documentation

**Deliverables**:
- Single source of truth for all migrations
- Migration catalog with dependency graph
- Updated developer documentation

### Phase 2: Automation (Weeks 3-4)

**Goal**: Enhance CI/CD validation and automation

- [ ] **Week 3**:
  - [ ] Create migration generator CLI tool
  - [ ] Implement schema snapshot/diff tool
  - [ ] Add schema drift detection to CI

- [ ] **Week 4**:
  - [ ] Enhance migration-dryrun workflow
  - [ ] Add performance impact analysis
  - [ ] Implement automated rollback testing

**Deliverables**:
- `scripts/create-migration.sh` tool
- Schema drift detection in CI
- Automated migration testing pipeline

### Phase 3: Versioning & Governance (Weeks 5-6)

**Goal**: Implement database versioning and governance controls

- [ ] **Week 5**:
  - [ ] Create schema_versions table
  - [ ] Implement semantic versioning for schemas
  - [ ] Add migration dependency validation

- [ ] **Week 6**:
  - [ ] Create migration approval workflow
  - [ ] Implement breaking change detection
  - [ ] Add automated rollback policies

**Deliverables**:
- Database versioning system
- Breaking change detection
- Migration governance policies

### Phase 4: Monitoring & Observability (Weeks 7-8)

**Goal**: Add comprehensive monitoring and alerting

- [ ] **Week 7**:
  - [ ] Integrate migration metrics with Prometheus/Grafana
  - [ ] Create migration dashboard
  - [ ] Add schema drift alerts

- [ ] **Week 8**:
  - [ ] Implement weekly schema validation
  - [ ] Add performance regression detection
  - [ ] Create migration runbooks

**Deliverables**:
- Migration metrics dashboard
- Automated alerts for schema drift
- Comprehensive runbooks

---

## Appendix

### A. Migration File Template

```sql
-- Migration: [Brief description]
-- ID: YYYYMMDD_HHMMSS_type_description
-- Version: X.Y.Z
-- Database: postgresql | neo4j | timescale
-- Author: [email]
-- Created: YYYY-MM-DD
-- Breaking: true | false
-- Dependencies: [migration_id1, migration_id2]

-- Phase 1: EXPAND
BEGIN;

-- Add new schema elements here
-- Use CONCURRENTLY for indexes
-- Use NOT VALID for constraints

COMMIT;

-- Phase 2: MIGRATE (optional)
-- Data migration logic

-- Phase 3: CONTRACT (optional)
-- Remove deprecated schema elements

-- Rollback: [Description of rollback]
BEGIN;

-- Reverse all changes
-- Drop tables, columns, indexes created above

COMMIT;

-- Validation:
-- Post-migration checks
-- SELECT COUNT(*) FROM new_table; -- Should be > 0
```

### B. Useful SQL Queries

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- Check for missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND n_distinct > 100
  AND correlation < 0.1;

-- Check for table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### C. References

- **Expand-Migrate-Contract Pattern**: https://www.martinfowler.com/bliki/ParallelChange.html
- **PostgreSQL Zero Downtime**: https://postgres.ai/blog/zero-downtime-postgres-migrations
- **Neo4j Schema Evolution**: https://neo4j.com/docs/operations-manual/current/performance/schema-indexes/
- **Database Reliability Engineering**: O'Reilly book by Laine Campbell & Charity Majors

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-20 | 1.0 | Platform Team | Initial comprehensive strategy document |

