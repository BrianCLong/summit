-- Finance Normalizer Service Schema
-- PostgreSQL migration for financial data normalization layer

BEGIN;

-- ============================================================================
-- PARTIES (Counterparties)
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_parties (
  id UUID PRIMARY KEY,
  canonical_name VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  aliases JSONB DEFAULT '[]',
  identifiers JSONB DEFAULT '[]',
  jurisdiction VARCHAR(2),
  address JSONB,
  risk_classification VARCHAR(20),
  is_pep BOOLEAN DEFAULT FALSE,
  sanctions_match BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  provenance JSONB DEFAULT '{}',
  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_parties_tenant ON finance_parties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_parties_name ON finance_parties(canonical_name);
CREATE INDEX IF NOT EXISTS idx_finance_parties_type ON finance_parties(type);
CREATE INDEX IF NOT EXISTS idx_finance_parties_risk ON finance_parties(risk_classification);
CREATE INDEX IF NOT EXISTS idx_finance_parties_pep ON finance_parties(is_pep) WHERE is_pep = TRUE;
CREATE INDEX IF NOT EXISTS idx_finance_parties_sanctions ON finance_parties(sanctions_match) WHERE sanctions_match = TRUE;

-- Full-text search on party names
CREATE INDEX IF NOT EXISTS idx_finance_parties_name_search
  ON finance_parties USING gin(to_tsvector('english', canonical_name || ' ' || COALESCE(original_name, '')));

-- ============================================================================
-- ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY,
  account_number VARCHAR(100) NOT NULL,
  account_number_hash VARCHAR(64),
  name VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  owner_id UUID REFERENCES finance_parties(id),
  institution_id UUID REFERENCES finance_parties(id),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  balance_minor_units BIGINT,
  available_balance_minor_units BIGINT,
  last_balance_date TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  iban VARCHAR(34),
  routing_number VARCHAR(20),
  bic VARCHAR(11),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  provenance JSONB DEFAULT '{}',
  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_tenant ON finance_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_owner ON finance_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_institution ON finance_accounts(institution_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON finance_accounts(type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_status ON finance_accounts(status);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_currency ON finance_accounts(currency);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_iban ON finance_accounts(iban) WHERE iban IS NOT NULL;

-- ============================================================================
-- INSTRUMENTS (Financial instruments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_instruments (
  id UUID PRIMARY KEY,
  identifier VARCHAR(100) NOT NULL,
  identifier_type VARCHAR(20) NOT NULL,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,
  currency VARCHAR(3),
  issuer_id UUID REFERENCES finance_parties(id),
  exchange VARCHAR(50),
  country_of_issuance VARCHAR(2),
  maturity_date TIMESTAMPTZ,
  face_value_minor_units BIGINT,
  face_value_currency VARCHAR(3),
  market_price_minor_units BIGINT,
  market_price_currency VARCHAR(3),
  price_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_instruments_tenant ON finance_instruments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_instruments_identifier ON finance_instruments(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_finance_instruments_type ON finance_instruments(type);
CREATE INDEX IF NOT EXISTS idx_finance_instruments_issuer ON finance_instruments(issuer_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY,
  reference_number VARCHAR(100) NOT NULL,
  external_id VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  direction VARCHAR(10) NOT NULL,

  -- Parties
  source_account_id UUID REFERENCES finance_accounts(id),
  destination_account_id UUID REFERENCES finance_accounts(id),
  originator_id UUID REFERENCES finance_parties(id),
  beneficiary_id UUID REFERENCES finance_parties(id),
  ordering_party_id UUID REFERENCES finance_parties(id),
  intermediary_id UUID REFERENCES finance_parties(id),

  -- Amounts (stored as minor units to avoid floating-point errors)
  amount_minor_units BIGINT NOT NULL,
  amount_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  amount_decimal_places SMALLINT DEFAULT 2,
  settlement_amount_minor_units BIGINT,
  settlement_currency VARCHAR(3),
  exchange_rate JSONB,
  fees JSONB DEFAULT '[]',
  total_fees_minor_units BIGINT,

  -- Dates
  value_date TIMESTAMPTZ NOT NULL,
  posting_date TIMESTAMPTZ NOT NULL,
  execution_date TIMESTAMPTZ,
  settlement_date TIMESTAMPTZ,

  -- Description
  description TEXT,
  remittance_info TEXT,
  purpose_code VARCHAR(10),
  category_code VARCHAR(50),

  -- Reversal tracking
  reverses_transaction_id UUID REFERENCES finance_transactions(id),
  reversed_by_transaction_id UUID REFERENCES finance_transactions(id),

  -- Running balance
  running_balance_minor_units BIGINT,

  -- Instrument (for investment transactions)
  instrument_id UUID REFERENCES finance_instruments(id),
  quantity VARCHAR(50),
  unit_price_minor_units BIGINT,

  -- Raw data preservation
  raw_record JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  provenance JSONB DEFAULT '{}',

  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary indices
CREATE INDEX IF NOT EXISTS idx_finance_transactions_tenant ON finance_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_reference ON finance_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_external ON finance_transactions(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_status ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_direction ON finance_transactions(direction);

-- Date indices for time-range queries
CREATE INDEX IF NOT EXISTS idx_finance_transactions_value_date ON finance_transactions(value_date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_posting_date ON finance_transactions(posting_date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_tenant_date ON finance_transactions(tenant_id, value_date DESC);

-- Party/Account indices for relationship queries
CREATE INDEX IF NOT EXISTS idx_finance_transactions_source_account ON finance_transactions(source_account_id) WHERE source_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_dest_account ON finance_transactions(destination_account_id) WHERE destination_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_originator ON finance_transactions(originator_id) WHERE originator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_beneficiary ON finance_transactions(beneficiary_id) WHERE beneficiary_id IS NOT NULL;

-- Amount index for filtering
CREATE INDEX IF NOT EXISTS idx_finance_transactions_amount ON finance_transactions(ABS(amount_minor_units));

-- Composite index for flow queries
CREATE INDEX IF NOT EXISTS idx_finance_transactions_flow
  ON finance_transactions(tenant_id, originator_id, beneficiary_id, value_date);

-- ============================================================================
-- FLOW PATTERNS (Detected patterns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_flow_patterns (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
  confidence DECIMAL(5,4) NOT NULL,

  -- Pattern scope
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Involved entities
  primary_party_ids UUID[] DEFAULT '{}',
  involved_party_ids UUID[] DEFAULT '{}',
  involved_account_ids UUID[] DEFAULT '{}',
  transaction_ids UUID[] DEFAULT '{}',

  -- Pattern metrics
  total_value_minor_units BIGINT,
  total_value_currency VARCHAR(3) DEFAULT 'USD',
  transaction_count INTEGER NOT NULL,
  distinct_counterparties INTEGER,
  time_span_hours DECIMAL(10,2),
  average_transaction_value_minor_units BIGINT,

  -- Detection details
  detection_rule VARCHAR(100) NOT NULL,
  rule_parameters JSONB DEFAULT '{}',
  thresholds JSONB DEFAULT '{}',

  -- Graph representation
  flow_graph JSONB,

  -- Review status
  review_status VARCHAR(20) DEFAULT 'PENDING',
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  metadata JSONB DEFAULT '{}',
  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_flow_patterns_tenant ON finance_flow_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_flow_patterns_type ON finance_flow_patterns(type);
CREATE INDEX IF NOT EXISTS idx_finance_flow_patterns_severity ON finance_flow_patterns(severity);
CREATE INDEX IF NOT EXISTS idx_finance_flow_patterns_review ON finance_flow_patterns(review_status);
CREATE INDEX IF NOT EXISTS idx_finance_flow_patterns_period ON finance_flow_patterns(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_finance_flow_patterns_parties ON finance_flow_patterns USING gin(primary_party_ids);

-- ============================================================================
-- AGGREGATED FLOWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_aggregated_flows (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  source_name VARCHAR(500),
  destination_id UUID NOT NULL,
  destination_type VARCHAR(20) NOT NULL,
  destination_name VARCHAR(500),

  -- Aggregation period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  granularity VARCHAR(20) NOT NULL,

  -- Aggregated metrics
  gross_flow_minor_units BIGINT NOT NULL,
  net_flow_minor_units BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  transaction_count INTEGER NOT NULL,
  credit_count INTEGER DEFAULT 0,
  debit_count INTEGER DEFAULT 0,
  avg_transaction_minor_units BIGINT,
  max_transaction_minor_units BIGINT,
  min_transaction_minor_units BIGINT,
  std_deviation VARCHAR(50),

  -- Breakdown by type
  by_transaction_type JSONB DEFAULT '[]',

  -- Constituent transactions (optional)
  transaction_ids UUID[],

  metadata JSONB DEFAULT '{}',
  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_aggregated_flows_tenant ON finance_aggregated_flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_aggregated_flows_source ON finance_aggregated_flows(source_id);
CREATE INDEX IF NOT EXISTS idx_finance_aggregated_flows_dest ON finance_aggregated_flows(destination_id);
CREATE INDEX IF NOT EXISTS idx_finance_aggregated_flows_period ON finance_aggregated_flows(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_finance_aggregated_flows_granularity ON finance_aggregated_flows(granularity);

-- Unique constraint for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_aggregated_flows_unique
  ON finance_aggregated_flows(tenant_id, source_id, destination_id, period_start, granularity);

-- ============================================================================
-- IMPORT JOBS
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_import_jobs (
  id UUID PRIMARY KEY,
  dataset_ref VARCHAR(255) NOT NULL,
  source_uri TEXT NOT NULL,
  format VARCHAR(50) NOT NULL,
  parser_config JSONB DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

  -- Progress tracking
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,

  -- Error details
  errors JSONB DEFAULT '[]',

  -- Output references
  created_transaction_ids JSONB DEFAULT '[]',
  created_party_ids JSONB DEFAULT '[]',
  created_account_ids JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Audit
  initiated_by VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_import_jobs_tenant ON finance_import_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_import_jobs_status ON finance_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_finance_import_jobs_dataset ON finance_import_jobs(dataset_ref);
CREATE INDEX IF NOT EXISTS idx_finance_import_jobs_created ON finance_import_jobs(created_at DESC);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_audit_log (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_audit_log_tenant ON finance_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_log_user ON finance_audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_audit_log_action ON finance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_finance_audit_log_resource ON finance_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_log_created ON finance_audit_log(created_at DESC);

-- Partition audit log by month for better performance (optional, requires PostgreSQL 11+)
-- CREATE TABLE finance_audit_log (
--   ...
-- ) PARTITION BY RANGE (created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
    AND table_name LIKE 'finance_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Transaction summary view
CREATE OR REPLACE VIEW finance_transaction_summary AS
SELECT
  tenant_id,
  DATE_TRUNC('day', value_date) as date,
  type,
  direction,
  COUNT(*) as transaction_count,
  SUM(ABS(amount_minor_units)) as total_amount,
  AVG(ABS(amount_minor_units)) as avg_amount,
  MAX(ABS(amount_minor_units)) as max_amount,
  MIN(ABS(amount_minor_units)) as min_amount,
  amount_currency as currency
FROM finance_transactions
GROUP BY tenant_id, DATE_TRUNC('day', value_date), type, direction, amount_currency;

-- Party transaction volume view
CREATE OR REPLACE VIEW finance_party_volume AS
SELECT
  tenant_id,
  party_id,
  party_role,
  COUNT(*) as transaction_count,
  SUM(ABS(amount_minor_units)) as total_volume,
  MIN(value_date) as first_transaction,
  MAX(value_date) as last_transaction
FROM (
  SELECT tenant_id, originator_id as party_id, 'ORIGINATOR' as party_role, amount_minor_units, value_date
  FROM finance_transactions WHERE originator_id IS NOT NULL
  UNION ALL
  SELECT tenant_id, beneficiary_id as party_id, 'BENEFICIARY' as party_role, amount_minor_units, value_date
  FROM finance_transactions WHERE beneficiary_id IS NOT NULL
) combined
GROUP BY tenant_id, party_id, party_role;

COMMIT;
