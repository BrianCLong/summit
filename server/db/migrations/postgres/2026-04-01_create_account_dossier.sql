-- Migration: Create Account Dossier
-- Description: Standardized account dossier for customer evidence, assurances, and risk.
-- Epic: 1 - Customer Evidence Dossier

CREATE TABLE IF NOT EXISTS account_dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'legal_hold')),
  renewal_risk_score NUMERIC DEFAULT 0,
  risk_factors JSONB DEFAULT '[]', -- Auto-populated risk tags
  contract_value NUMERIC,
  renewal_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- CRM links, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_audit_at TIMESTAMPTZ,
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_account_dossiers_tenant ON account_dossiers(tenant_id);

CREATE TABLE IF NOT EXISTS dossier_assurances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  source_actor TEXT NOT NULL, -- Who gave the assurance
  recipient_actor TEXT, -- Who received it
  occurred_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL, -- Email, Slack, QBR, etc.
  evidence_ref TEXT, -- Link to artifact or raw text
  created_by UUID NOT NULL, -- User ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_assurances_dossier ON dossier_assurances(dossier_id);

CREATE TABLE IF NOT EXISTS dossier_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contractual', 'security', 'sla', 'commercial', 'relationship')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'accepted', 'resolved')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mitigation_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_risks_dossier ON dossier_risks(dossier_id);

CREATE TABLE IF NOT EXISTS dossier_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contract', 'audit_report', 'incident_pack', 'change_log', 'trust_pack', 'other')),
  storage_ref TEXT NOT NULL, -- S3 key or similar
  hash TEXT NOT NULL, -- SHA256 for integrity
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_artifacts_dossier ON dossier_artifacts(dossier_id);

CREATE TABLE IF NOT EXISTS dossier_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('pass', 'fail', 'remediated')),
  notes TEXT,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_audit_logs_dossier ON dossier_audit_logs(dossier_id);
