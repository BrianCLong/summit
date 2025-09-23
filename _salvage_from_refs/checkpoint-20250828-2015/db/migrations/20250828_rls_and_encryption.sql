-- MVP-12: Tenant Isolation (RLS) and Field-Level Encryption
-- This migration adds tenant awareness and encrypted columns to the case_entity table.

-- Step 1: Add tenant_id to track data ownership
ALTER TABLE case_entity ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill existing rows with a default tenant_id if necessary (replace with real IDs in a real migration)
UPDATE case_entity SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- Make tenant_id non-nullable after backfill
ALTER TABLE case_entity ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_entity_tenant ON case_entity(tenant_id);

-- Step 2: Add columns for envelope encryption of the email field
ALTER TABLE case_entity ADD COLUMN IF NOT EXISTS pii_email_cipher bytea;
ALTER TABLE case_entity ADD COLUMN IF NOT EXISTS pii_email_iv bytea;
ALTER TABLE case_entity ADD COLUMN IF NOT EXISTS pii_email_tag bytea;
ALTER TABLE case_entity ADD COLUMN IF NOT EXISTS pii_email_kid text; -- Key ID from KMS
ALTER TABLE case_entity ADD COLUMN IF NOT EXISTS pii_email_dek bytea; -- Wrapped Data Encryption Key

-- Step 3: Enable Row-Level Security (RLS)
ALTER TABLE case_entity ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policy to isolate tenants
-- This policy ensures that queries only return rows matching the session's tenant_id.
CREATE POLICY case_entity_tenant_isolation ON case_entity
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Step 5: Restrict default access. The RLS policy will now be the only way to access rows.
-- Note: Table owners, superusers, and roles with BYPASSRLS are not subject to RLS.
REVOKE ALL ON case_entity FROM PUBLIC;
GRANT ALL ON case_entity TO intelgraph_user; -- Grant permissions to the app user

-- Verification:
-- 1. Connect as intelgraph_user.
-- 2. SET app.tenant_id = 'some-tenant-uuid';
-- 3. SELECT * FROM case_entity; --> Should only return rows for that tenant.
-- 4. SET app.tenant_id = 'another-tenant-uuid';
-- 5. SELECT * FROM case_entity; --> Should return rows for the other tenant.
-- 6. RESET app.tenant_id;
-- 7. SELECT * FROM case_entity; --> Should return no rows.
