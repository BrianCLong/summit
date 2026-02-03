/**
 * Migration 030: Tenant ID Rollout to Legacy Tables
 *
 * Adds tenant_id column to all legacy application tables that don't have it yet.
 * This is PR-2 of the enterprise spine security implementation.
 *
 * Strategy:
 * 1. Add tenant_id with DEFAULT 'global' to backfill existing rows
 * 2. Drop DEFAULT immediately so new rows must specify tenant_id
 * 3. Add indexes on (tenant_id, id) for query performance
 * 4. Add foreign key constraints to tenants table
 * 5. Add trigger to prevent tenant_id updates (immutable after creation)
 */

export async function up(db: any): Promise<void> {
  // Ensure tenants table exists (idempotent check)
  await db.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      is_active BOOLEAN DEFAULT true,
      config JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure 'global' tenant exists
  await db.query(`
    INSERT INTO tenants (id, name, plan)
    VALUES ('global', 'Global Tenant', 'enterprise')
    ON CONFLICT (id) DO NOTHING;
  `);

  // ======================================================================
  // CORE APPLICATION TABLES
  // ======================================================================

  // User Sessions - Critical for auth isolation
  await db.query(`
    ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

    ALTER TABLE user_sessions
    ALTER COLUMN tenant_id DROP DEFAULT;

    CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id
    ON user_sessions(tenant_id, user_id);

    ALTER TABLE user_sessions
    ADD CONSTRAINT fk_user_sessions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE;
  `);

  // Token Blacklist - Critical for auth isolation
  await db.query(`
    ALTER TABLE token_blacklist
    ADD COLUMN IF NOT EXISTS tenant_id TEXT;

    -- Backfill: Try to extract tenant from JWT or default to 'global'
    UPDATE token_blacklist
    SET tenant_id = 'global'
    WHERE tenant_id IS NULL;

    ALTER TABLE token_blacklist
    ALTER COLUMN tenant_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_token_blacklist_tenant_id
    ON token_blacklist(tenant_id, token_hash);

    ALTER TABLE token_blacklist
    ADD CONSTRAINT fk_token_blacklist_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE;
  `);

  // Investigations / Cases
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investigations') THEN
        ALTER TABLE investigations
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE investigations
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_investigations_tenant_id
        ON investigations(tenant_id, id);

        ALTER TABLE investigations
        ADD CONSTRAINT fk_investigations_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Reports
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE reports
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_reports_tenant_id
        ON reports(tenant_id, id);

        ALTER TABLE reports
        ADD CONSTRAINT fk_reports_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Dashboards
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboards') THEN
        ALTER TABLE dashboards
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE dashboards
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_dashboards_tenant_id
        ON dashboards(tenant_id, id);

        ALTER TABLE dashboards
        ADD CONSTRAINT fk_dashboards_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // AI Feedback
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_feedback') THEN
        ALTER TABLE ai_feedback
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE ai_feedback
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_ai_feedback_tenant_id
        ON ai_feedback(tenant_id, id);

        ALTER TABLE ai_feedback
        ADD CONSTRAINT fk_ai_feedback_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // ML Feedback
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_feedback') THEN
        ALTER TABLE ml_feedback
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE ml_feedback
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_ml_feedback_tenant_id
        ON ml_feedback(tenant_id, id);

        ALTER TABLE ml_feedback
        ADD CONSTRAINT fk_ml_feedback_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Maestro UAT Checkpoints
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maestro_uat_checkpoints') THEN
        ALTER TABLE maestro_uat_checkpoints
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE maestro_uat_checkpoints
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_maestro_uat_checkpoints_tenant_id
        ON maestro_uat_checkpoints(tenant_id, id);

        ALTER TABLE maestro_uat_checkpoints
        ADD CONSTRAINT fk_maestro_uat_checkpoints_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Maestro Tickets
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maestro_tickets') THEN
        ALTER TABLE maestro_tickets
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE maestro_tickets
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_maestro_tickets_tenant_id
        ON maestro_tickets(tenant_id, id);

        ALTER TABLE maestro_tickets
        ADD CONSTRAINT fk_maestro_tickets_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Ticket Deployments
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_deployments') THEN
        ALTER TABLE ticket_deployments
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE ticket_deployments
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_ticket_deployments_tenant_id
        ON ticket_deployments(tenant_id, id);

        ALTER TABLE ticket_deployments
        ADD CONSTRAINT fk_ticket_deployments_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Ticket Runs
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_runs') THEN
        ALTER TABLE ticket_runs
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE ticket_runs
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_ticket_runs_tenant_id
        ON ticket_runs(tenant_id, id);

        ALTER TABLE ticket_runs
        ADD CONSTRAINT fk_ticket_runs_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Backfill Jobs
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backfill_jobs') THEN
        ALTER TABLE backfill_jobs
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

        ALTER TABLE backfill_jobs
        ALTER COLUMN tenant_id DROP DEFAULT;

        CREATE INDEX IF NOT EXISTS idx_backfill_jobs_tenant_id
        ON backfill_jobs(tenant_id, id);

        ALTER TABLE backfill_jobs
        ADD CONSTRAINT fk_backfill_jobs_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // ======================================================================
  // AUDIT TABLES - Already have tenant_id in most cases, but ensuring consistency
  // ======================================================================

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_events') THEN
        -- audit_events likely already has tenant_id, but ensure index exists
        CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id
        ON audit_events(tenant_id, created_at DESC);
      END IF;
    END $$;
  `);

  // ======================================================================
  // CANONICAL ENTITIES - These may or may not exist depending on deployment
  // ======================================================================

  const canonicalTables = [
    'canonical_person',
    'canonical_organization',
    'canonical_location',
    'canonical_asset',
    'canonical_document',
    'canonical_event',
    'canonical_case',
    'canonical_claim'
  ];

  for (const table of canonicalTables) {
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
          ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

          ALTER TABLE ${table}
          ALTER COLUMN tenant_id DROP DEFAULT;

          CREATE INDEX IF NOT EXISTS idx_${table}_tenant_id
          ON ${table}(tenant_id, id);

          ALTER TABLE ${table}
          ADD CONSTRAINT fk_${table}_tenant
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  // ======================================================================
  // IMMUTABILITY TRIGGER - Prevent tenant_id changes after creation
  // ======================================================================

  await db.query(`
    CREATE OR REPLACE FUNCTION prevent_tenant_id_update()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
        RAISE EXCEPTION 'tenant_id is immutable and cannot be changed after creation';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Apply trigger to all tables with tenant_id
  const tablesWithTenantId = [
    'user_sessions',
    'token_blacklist',
    'investigations',
    'reports',
    'dashboards',
    'ai_feedback',
    'ml_feedback',
    'maestro_uat_checkpoints',
    'maestro_tickets',
    'ticket_deployments',
    'ticket_runs',
    'backfill_jobs',
    ...canonicalTables
  ];

  for (const table of tablesWithTenantId) {
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
          DROP TRIGGER IF EXISTS trg_prevent_tenant_id_update ON ${table};
          CREATE TRIGGER trg_prevent_tenant_id_update
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION prevent_tenant_id_update();
        END IF;
      END $$;
    `);
  }

  console.log('Migration 030: Tenant ID rollout completed successfully');
}

export async function down(db: any): Promise<void> {
  // Drop triggers
  const tablesWithTenantId = [
    'user_sessions',
    'token_blacklist',
    'investigations',
    'reports',
    'dashboards',
    'ai_feedback',
    'ml_feedback',
    'maestro_uat_checkpoints',
    'maestro_tickets',
    'ticket_deployments',
    'ticket_runs',
    'backfill_jobs',
    'canonical_person',
    'canonical_organization',
    'canonical_location',
    'canonical_asset',
    'canonical_document',
    'canonical_event',
    'canonical_case',
    'canonical_claim'
  ];

  for (const table of tablesWithTenantId) {
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
          DROP TRIGGER IF EXISTS trg_prevent_tenant_id_update ON ${table};
          ALTER TABLE ${table} DROP COLUMN IF EXISTS tenant_id;
        END IF;
      END $$;
    `);
  }

  // Drop function
  await db.query(`DROP FUNCTION IF EXISTS prevent_tenant_id_update();`);

  console.log('Migration 030: Rollback completed');
}
