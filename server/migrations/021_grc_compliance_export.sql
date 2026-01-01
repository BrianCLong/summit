-- GRC Compliance Export Tables

-- Compliance Control Mappings
CREATE TABLE IF NOT EXISTS compliance_control_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  framework TEXT NOT NULL,
  framework_control_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  criticality TEXT CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  implementation_status TEXT CHECK (implementation_status IN ('implemented', 'partial', 'planned', 'not_applicable')),
  implemented_at TIMESTAMP WITH TIME ZONE,
  implemented_by TEXT,
  automation_level TEXT CHECK (automation_level IN ('manual', 'semi_automated', 'automated')),
  last_verified TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  verification_status TEXT CHECK (verification_status IN ('passed', 'failed', 'not_tested')),
  findings TEXT[],
  related_controls TEXT[],
  dependencies TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, framework, framework_control_id)
);

-- Indexes
CREATE INDEX idx_control_mappings_tenant ON compliance_control_mappings(tenant_id);
CREATE INDEX idx_control_mappings_framework ON compliance_control_mappings(framework);
CREATE INDEX idx_control_mappings_status ON compliance_control_mappings(implementation_status);
CREATE INDEX idx_control_mappings_updated ON compliance_control_mappings(updated_at);

-- Compliance Evidence Artifacts
CREATE TABLE IF NOT EXISTS compliance_evidence_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  control_id UUID REFERENCES compliance_control_mappings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  hash TEXT NOT NULL,
  size BIGINT NOT NULL,
  classification TEXT NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_period INTEGER NOT NULL DEFAULT 2555, -- 7 years in days
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evidence_artifacts_tenant ON compliance_evidence_artifacts(tenant_id);
CREATE INDEX idx_evidence_artifacts_control ON compliance_evidence_artifacts(control_id);
CREATE INDEX idx_evidence_artifacts_collected ON compliance_evidence_artifacts(collected_at);
CREATE INDEX idx_evidence_artifacts_expires ON compliance_evidence_artifacts(expires_at);

-- Compliance Verification Results
CREATE TABLE IF NOT EXISTS compliance_verification_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  control_id UUID REFERENCES compliance_control_mappings(id) ON DELETE CASCADE,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by TEXT NOT NULL,
  status TEXT CHECK (status IN ('passed', 'failed', 'not_tested')),
  findings TEXT[],
  evidence_references TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_verification_results_tenant ON compliance_verification_results(tenant_id);
CREATE INDEX idx_verification_results_control ON compliance_verification_results(control_id);
CREATE INDEX idx_verification_results_verified ON compliance_verification_results(verified_at);

-- Evidence Package Metadata
CREATE TABLE IF NOT EXISTS compliance_evidence_packages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  package_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  storage_path TEXT,
  total_size BIGINT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evidence_packages_tenant ON compliance_evidence_packages(tenant_id);
CREATE INDEX idx_evidence_packages_type ON compliance_evidence_packages(package_type);
CREATE INDEX idx_evidence_packages_period ON compliance_evidence_packages(period_start, period_end);
CREATE INDEX idx_evidence_packages_expires ON compliance_evidence_packages(expires_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_control_mappings_updated_at
  BEFORE UPDATE ON compliance_control_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired evidence packages
CREATE OR REPLACE FUNCTION cleanup_expired_evidence_packages() RETURNS void AS $$
BEGIN
  DELETE FROM compliance_evidence_packages
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE compliance_control_mappings IS 'Maps compliance framework controls to implementations';
COMMENT ON TABLE compliance_evidence_artifacts IS 'Stores metadata for compliance evidence artifacts';
COMMENT ON TABLE compliance_verification_results IS 'Records control verification test results';
COMMENT ON TABLE compliance_evidence_packages IS 'Tracks generated evidence packages for auditors';
