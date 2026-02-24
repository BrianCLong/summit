-- Migration: Add region to tenant_partitions and kms_configs localized constraints
-- Task #97: Global Data Plane

-- 1. Update tenant_partitions for region-aware sharding
ALTER TABLE tenant_partitions ADD COLUMN IF NOT EXISTS region VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_tenant_partitions_region ON tenant_partitions(region);

-- Initial data: Default existing 'primary' partition to us-east-1
UPDATE tenant_partitions SET region = 'us-east-1' WHERE partition_key = 'primary' AND region IS NULL;

-- 2. Update kms_configs to support regional keys
-- We allow multiple KMS configs per tenant, one per region.
DO $$
BEGIN
    -- Drop the old unique constraint on tenant_id only
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'kms_configs_tenant_id_key'
        AND table_name = 'kms_configs'
    ) THEN
        ALTER TABLE kms_configs DROP CONSTRAINT kms_configs_tenant_id_key;
    END IF;
END $$;

-- Add composite unique constraint
ALTER TABLE kms_configs ADD CONSTRAINT kms_configs_tenant_id_region_key UNIQUE (tenant_id, region);
