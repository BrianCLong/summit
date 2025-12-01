-- Data Trading Marketplace Schema
-- Version: 1.0.0
-- Description: Core tables for data trading, consent, and compliance

BEGIN;

-- Data Providers (sellers on the marketplace)
CREATE TABLE IF NOT EXISTS data_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('individual', 'organization', 'government')),
  description TEXT,
  website VARCHAR(500),
  contact_email VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  verification_method VARCHAR(100),
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  total_transactions INTEGER DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Products (datasets available for trading)
CREATE TABLE IF NOT EXISTS data_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES data_providers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  tags JSONB DEFAULT '[]',

  -- Data Metadata
  schema_definition JSONB NOT NULL,
  sample_data TEXT,
  row_count BIGINT,
  size_bytes BIGINT,
  last_updated TIMESTAMPTZ,
  update_frequency VARCHAR(50),
  data_format VARCHAR(50) DEFAULT 'json',
  delivery_methods JSONB DEFAULT '["api", "download"]',

  -- Quality Metrics
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  completeness DECIMAL(5,2),
  accuracy DECIMAL(5,2),
  freshness_score DECIMAL(5,2),

  -- Compliance & Risk
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  classification VARCHAR(50) NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
  pii_fields JSONB DEFAULT '[]',
  regulations JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',

  -- Pricing
  pricing_model VARCHAR(50) NOT NULL CHECK (pricing_model IN ('one_time', 'subscription', 'usage_based', 'negotiated', 'free')),
  base_price_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  usage_tiers JSONB,

  -- Geographic & Access
  geographic_coverage JSONB DEFAULT '[]',
  geographic_restrictions JSONB DEFAULT '[]',
  access_types JSONB DEFAULT '["read"]',

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'suspended', 'archived')),
  published_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Transactions (purchases/licenses)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES data_providers(id),
  product_id UUID NOT NULL REFERENCES data_products(id),

  -- Pricing
  agreed_price_cents BIGINT NOT NULL,
  platform_fee_cents BIGINT NOT NULL,
  seller_payout_cents BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  tax_cents BIGINT DEFAULT 0,

  -- License Terms
  license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('single_use', 'unlimited', 'time_limited', 'usage_based', 'enterprise')),
  usage_terms JSONB NOT NULL,
  duration_days INTEGER,
  max_api_calls INTEGER,
  max_downloads INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'payment_received', 'payment_failed',
    'compliance_check', 'compliance_failed', 'preparing_data',
    'delivered', 'completed', 'disputed', 'refunded', 'cancelled'
  )),

  -- Compliance
  consent_verified BOOLEAN DEFAULT false,
  compliance_checked BOOLEAN DEFAULT false,
  risk_accepted BOOLEAN DEFAULT false,
  compliance_notes TEXT,

  -- Delivery
  delivery_method VARCHAR(50),
  download_url TEXT,
  api_key_hash VARCHAR(256),

  -- Audit Trail
  contract_hash VARCHAR(256),
  blockchain_tx_id VARCHAR(256),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- User tracking
  created_by UUID,
  cancelled_by UUID,
  cancellation_reason TEXT
);

-- Consent Records (GDPR/CCPA compliance)
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_id VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES data_products(id),
  provider_id UUID NOT NULL REFERENCES data_providers(id),

  -- Consent Details
  purposes JSONB NOT NULL,
  scope JSONB NOT NULL,
  legal_basis VARCHAR(50) CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_interest', 'legitimate_interests')),

  -- Lifecycle
  granted_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  -- Evidence
  consent_method VARCHAR(50) NOT NULL CHECK (consent_method IN ('explicit', 'opt-in', 'contractual', 'legitimate_interest')),
  consent_text TEXT,
  evidence_hash VARCHAR(256) NOT NULL,
  evidence_url TEXT,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  locale VARCHAR(10),

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES consent_records(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Assessments (automated compliance scoring)
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES data_products(id),

  -- Scores
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  pii_score INTEGER CHECK (pii_score BETWEEN 0 AND 100),
  sensitivity_score INTEGER CHECK (sensitivity_score BETWEEN 0 AND 100),
  regulatory_score INTEGER CHECK (regulatory_score BETWEEN 0 AND 100),
  reputation_score INTEGER CHECK (reputation_score BETWEEN 0 AND 100),
  technical_score INTEGER CHECK (technical_score BETWEEN 0 AND 100),

  -- Findings
  findings JSONB DEFAULT '{}',
  pii_detected JSONB DEFAULT '[]',
  compliance_gaps JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  automated_checks JSONB DEFAULT '[]',

  -- Assessment Info
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessed_by VARCHAR(100) NOT NULL,
  assessment_method VARCHAR(50) DEFAULT 'automated',
  model_version VARCHAR(50),

  -- Review (for high-risk)
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_notes TEXT,
  override_score INTEGER,
  override_reason TEXT
);

-- Reviews & Ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  product_id UUID NOT NULL REFERENCES data_products(id),
  provider_id UUID NOT NULL REFERENCES data_providers(id),
  reviewer_id UUID NOT NULL,

  -- Rating
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  documentation_rating INTEGER CHECK (documentation_rating BETWEEN 1 AND 5),
  support_rating INTEGER CHECK (support_rating BETWEEN 1 AND 5),

  -- Review Content
  title VARCHAR(255),
  content TEXT,
  pros JSONB DEFAULT '[]',
  cons JSONB DEFAULT '[]',

  -- Moderation
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID,
  moderation_notes TEXT,

  -- Metadata
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access Grants (active data access)
CREATE TABLE IF NOT EXISTS access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  product_id UUID NOT NULL REFERENCES data_products(id),
  grantee_id UUID NOT NULL,

  -- Access Details
  access_type VARCHAR(50) NOT NULL,
  permissions JSONB NOT NULL,

  -- Limits
  api_calls_used INTEGER DEFAULT 0,
  api_calls_limit INTEGER,
  downloads_used INTEGER DEFAULT 0,
  downloads_limit INTEGER,
  data_transferred_bytes BIGINT DEFAULT 0,

  -- Credentials
  api_key_hash VARCHAR(256),
  api_key_prefix VARCHAR(10),

  -- Lifecycle
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'suspended'))
);

-- Usage Logs (metering and audit)
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_grant_id UUID NOT NULL REFERENCES access_grants(id),
  product_id UUID NOT NULL REFERENCES data_products(id),
  user_id UUID NOT NULL,

  -- Usage Details
  action VARCHAR(50) NOT NULL,
  endpoint VARCHAR(500),
  method VARCHAR(10),

  -- Metrics
  response_time_ms INTEGER,
  data_transferred_bytes BIGINT,
  rows_returned INTEGER,

  -- Request Info
  ip_address INET,
  user_agent TEXT,

  -- Status
  status_code INTEGER,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  initiated_by UUID NOT NULL,

  -- Dispute Details
  type VARCHAR(50) NOT NULL CHECK (type IN ('quality', 'accuracy', 'delivery', 'billing', 'privacy', 'other')),
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',

  -- Resolution
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated', 'closed')),
  resolution TEXT,
  resolution_type VARCHAR(50) CHECK (resolution_type IN ('refund_full', 'refund_partial', 'credit', 'no_action', 'other')),
  refund_amount_cents BIGINT,

  -- Assignment
  assigned_to UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_providers_tenant ON data_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_providers_status ON data_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON data_providers(verified);

CREATE INDEX IF NOT EXISTS idx_products_provider ON data_products(provider_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON data_products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON data_products(status);
CREATE INDEX IF NOT EXISTS idx_products_risk ON data_products(risk_level);
CREATE INDEX IF NOT EXISTS idx_products_classification ON data_products(classification);
CREATE INDEX IF NOT EXISTS idx_products_search ON data_products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_subject ON consent_records(data_subject_id);
CREATE INDEX IF NOT EXISTS idx_consent_provider ON consent_records(provider_id);
CREATE INDEX IF NOT EXISTS idx_consent_product ON consent_records(product_id);
CREATE INDEX IF NOT EXISTS idx_consent_active ON consent_records(revoked_at) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_product ON risk_assessments(product_id);
CREATE INDEX IF NOT EXISTS idx_assessments_level ON risk_assessments(risk_level);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

CREATE INDEX IF NOT EXISTS idx_grants_transaction ON access_grants(transaction_id);
CREATE INDEX IF NOT EXISTS idx_grants_grantee ON access_grants(grantee_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON access_grants(status);

CREATE INDEX IF NOT EXISTS idx_usage_grant ON usage_logs(access_grant_id);
CREATE INDEX IF NOT EXISTS idx_usage_product ON usage_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_providers_updated_at
  BEFORE UPDATE ON data_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_products_updated_at
  BEFORE UPDATE ON data_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Transaction number generator
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.transaction_number = 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('transaction_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS transaction_number_seq;

CREATE TRIGGER set_transaction_number
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION generate_transaction_number();

COMMIT;
