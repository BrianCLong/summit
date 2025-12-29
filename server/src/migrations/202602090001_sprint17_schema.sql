-- Sprint 17: Switchboard Schema Migration
-- Data Residency, KMS, Trust Center, Retention, Erase Workflows

-- 1. Data Residency Configurations (Updated)
CREATE TABLE IF NOT EXISTS data_residency_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  data_classifications JSONB DEFAULT '[]',
  allowed_transfers JSONB DEFAULT '[]', -- Legacy field, kept for compatibility
  allowed_regions JSONB DEFAULT '[]',   -- New field for explict region allowlist
  residency_mode TEXT DEFAULT 'strict' CHECK (residency_mode IN ('strict', 'preferred')),
  retention_policy_days INTEGER DEFAULT 2555,
  encryption_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residency_tenant ON data_residency_configs(tenant_id);

-- 2. Residency Exceptions
CREATE TABLE IF NOT EXISTS residency_exceptions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  target_region TEXT NOT NULL,
  scope TEXT NOT NULL,
  reason TEXT,
  approved_by TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residency_exceptions_tenant ON residency_exceptions(tenant_id);

-- 3. KMS Configurations
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

CREATE INDEX IF NOT EXISTS idx_kms_tenant ON kms_configs(tenant_id);

-- 4. Audit Tables for Residency/Encryption
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

CREATE INDEX IF NOT EXISTS idx_residency_audit_tenant ON data_residency_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_tenant ON encryption_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decryption_audit_tenant ON decryption_audit(tenant_id);

-- 5. Trust Center Reports
CREATE TABLE IF NOT EXISTS trust_center_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('generating','completed','failed')),
  download_url TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS trust_center_reports_tenant_idx ON trust_center_reports (tenant_id, created_at DESC);

-- 6. SLSA Attestations
CREATE TABLE IF NOT EXISTS slsa_attestations (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  attestation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SBOM Reports
CREATE TABLE IF NOT EXISTS sbom_reports (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  sbom JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Policy Audit
CREATE TABLE IF NOT EXISTS policy_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  policy TEXT NOT NULL,
  resource TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_audit_tenant_time_idx ON policy_audit (tenant_id, created_at DESC);

-- 9. Audit Reports (Aggregated)
CREATE TABLE IF NOT EXISTS audit_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  report_data JSONB NOT NULL,
  frameworks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Residency Reports
CREATE TABLE IF NOT EXISTS residency_reports (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Retention Policies
CREATE TABLE IF NOT EXISTS retention_policies (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  action TEXT CHECK (action IN ('DELETE', 'ARCHIVE')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Erase Requests (Right to be Forgotten)
CREATE TABLE IF NOT EXISTS erase_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  scope TEXT NOT NULL, -- e.g., 'user:123', 'resource:file-abc'
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  approvals JSONB DEFAULT '[]', -- Array of { approverId, timestamp, decision, rationale }
  manifest_url TEXT,            -- Link to PurgeManifest
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_erase_requests_tenant ON erase_requests(tenant_id);
