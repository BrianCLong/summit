-- Add tenant_id to runs table and ensure other tables support it

-- Add tenant_id to runs if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'runs' AND column_name = 'tenant_id') THEN
        ALTER TABLE runs ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_runs_tenant_id ON runs(tenant_id);

-- Add tenant_id to users if we want to scope users to tenants later (optional for now, but good practice)
-- For now, we assume users are global or tenant_id is derived from user context.
-- But the prompt asks to enforce multi-tenant boundaries.

-- Add tenant_id to projects if it exists (not seen in code but assumed for standard SaaS)
-- We will stick to runs for now as requested.

-- Update runs to set a default tenant_id for existing rows if any (using a placeholder or NULL)
-- Ideally we would backfill from some source, but for now we leave it NULLable for legacy rows.

-- Enforce NOT NULL in future migration after backfill.
