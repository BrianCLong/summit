-- Localized data residency enforcement v2
-- Task #96
-- SAFE: Creating indexes on new tables is safe as they are not yet in use.

CREATE TABLE IF NOT EXISTS data_residency_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  data_classifications JSONB DEFAULT '[]',
  allowed_transfers JSONB DEFAULT '[]',
  retention_policy_days INTEGER DEFAULT 2555,
  encryption_required BOOLEAN DEFAULT true,
  residency_mode TEXT DEFAULT 'strict',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kms_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('aws-kms', 'azure-keyvault', 'gcp-kms', 'hashicorp-vault', 'customer-managed')),
  key_id TEXT NOT NULL,
  region TEXT NOT NULL,
  endpoint TEXT,
  encrypted_credentials TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_residency_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  config_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encryption_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  classification_level TEXT NOT NULL,
  encryption_method TEXT NOT NULL,
  kms_provider TEXT,
  region TEXT,
  compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decryption_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_hash TEXT,
  decryption_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  successful BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residency_reports (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_partitions (
  tenant_id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  shard_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residency_exceptions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  target_region TEXT NOT NULL,
  scope TEXT NOT NULL, -- e.g. 'storage', 'compute', '*'
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residency_tenant ON data_residency_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kms_tenant ON kms_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_residency_audit_tenant ON data_residency_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_tenant ON encryption_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decryption_audit_tenant ON decryption_audit(tenant_id);

-- Seed global tenant
INSERT INTO tenant_partitions (tenant_id, region, shard_id)
VALUES ('global', 'us-east-1', 'shard-001')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO data_residency_configs (
  id, tenant_id, region, country, jurisdiction,
  data_classifications, allowed_transfers, retention_policy_days, encryption_required, residency_mode
) VALUES ('residency-global-init', 'global', 'us-east-1', 'US', 'US',
  '["public", "internal", "confidential"]'::jsonb,
  '["us-west-2", "eu-central-1"]'::jsonb,
  2555, true, 'strict'
)
ON CONFLICT (tenant_id) DO NOTHING;
