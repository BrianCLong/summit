-- Epic 2: Data Model for Contracts, Entitlements, and Fraud

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  po_number TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issued_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, fulfilled, cancelled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_tenant_po FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_po_tenant_number ON purchase_orders(tenant_id, po_number);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, expired, terminated
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}', -- amendments, renewal terms
  purchase_order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_tenant_contract FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);

-- Paid Artifacts (Marketplace items)
CREATE TABLE IF NOT EXISTS paid_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE, -- e.g., 'advanced-reporting-v2'
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'standard',
  pricing_model TEXT NOT NULL, -- flat, usage, per_seat
  price_amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entitlements
CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, expired
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  limits JSONB DEFAULT '{}', -- Usage limits
  source TEXT NOT NULL, -- purchase, contract, trial, manual_override
  source_id UUID, -- Link to contract or PO or other source
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_tenant_entitlement FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entitlements_tenant_artifact ON entitlements(tenant_id, artifact_key);
CREATE INDEX IF NOT EXISTS idx_entitlements_active ON entitlements(tenant_id, status) WHERE status = 'active';

-- Fraud Signals
CREATE TABLE IF NOT EXISTS fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT, -- Can be null if system-wide signal
  signal_type TEXT NOT NULL, -- e.g., 'velocity_spike', 'geo_mismatch'
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  source TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  investigation_id UUID
);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_tenant ON fraud_signals(tenant_id);

-- Investigation Cases
CREATE TABLE IF NOT EXISTS investigation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, false_positive
  severity TEXT NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hold Actions
CREATE TABLE IF NOT EXISTS hold_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL, -- tenant, payout, account
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, released
  applied_by TEXT NOT NULL,
  released_by TEXT,
  released_at TIMESTAMP WITH TIME ZONE,
  investigation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_hold_investigation FOREIGN KEY (investigation_id) REFERENCES investigation_cases(id)
);
CREATE INDEX IF NOT EXISTS idx_hold_target ON hold_actions(target_type, target_id) WHERE status = 'active';
