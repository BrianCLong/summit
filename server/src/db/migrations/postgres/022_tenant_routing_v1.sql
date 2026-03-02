-- Tenant routing v1: partition metadata and routing map

CREATE TABLE IF NOT EXISTS tenant_partitions (
    partition_key TEXT PRIMARY KEY,
    strategy TEXT NOT NULL DEFAULT 'shared',
    schema_name TEXT,
    write_connection_url TEXT,
    read_connection_url TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_partition_map (
    tenant_id UUID PRIMARY KEY,
    partition_key TEXT NOT NULL REFERENCES tenant_partitions(partition_key),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_partition_map_partition ON tenant_partition_map(partition_key);

-- Keep tenant record aware of the assigned partition (optional for legacy tenants)
ALTER TABLE IF EXISTS tenants
    ADD COLUMN IF NOT EXISTS partition_key TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_partition_key ON tenants(partition_key);

-- Seed a default partition that mirrors the current single-DB layout
INSERT INTO tenant_partitions (
    partition_key,
    strategy,
    schema_name,
    write_connection_url,
    read_connection_url,
    is_default,
    status,
    metadata
)
VALUES (
    'primary',
    'shared',
    NULL,
    NULL,
    NULL,
    TRUE,
    'active',
    jsonb_build_object('description', 'Default shared cluster')
)
ON CONFLICT (partition_key) DO NOTHING;
