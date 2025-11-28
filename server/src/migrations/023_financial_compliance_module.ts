/**
 * Migration: Financial Compliance Module
 *
 * Creates tables for trade surveillance, risk analytics, fraud detection,
 * market data, and regulatory reporting.
 */

import { Pool } from 'pg';

export const version = '023';
export const name = 'financial_compliance_module';

export async function up(pg: Pool): Promise<void> {
  // ============================================================================
  // TRADE & ORDER TABLES
  // ============================================================================

  await pg.query(`
    CREATE TABLE IF NOT EXISTS trades (
      trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID,
      tenant_id UUID NOT NULL,
      account_id VARCHAR(50) NOT NULL,
      trader_id VARCHAR(50) NOT NULL,
      portfolio_id UUID,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
      quantity DECIMAL(20, 8) NOT NULL,
      price DECIMAL(20, 8) NOT NULL,
      execution_time TIMESTAMPTZ NOT NULL,
      venue VARCHAR(50) NOT NULL,
      order_type VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      commission DECIMAL(20, 8),
      fees DECIMAL(20, 8),
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      asset_class VARCHAR(20) NOT NULL DEFAULT 'equity',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_trades_tenant_time ON trades(tenant_id, execution_time DESC);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
    CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
    CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader_id);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      account_id VARCHAR(50) NOT NULL,
      trader_id VARCHAR(50) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
      quantity DECIMAL(20, 8) NOT NULL,
      filled_quantity DECIMAL(20, 8) DEFAULT 0,
      price DECIMAL(20, 8),
      stop_price DECIMAL(20, 8),
      order_type VARCHAR(20) NOT NULL,
      time_in_force VARCHAR(10) NOT NULL DEFAULT 'day',
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      parent_order_id UUID,
      expires_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_tenant_time ON orders(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
    CREATE INDEX IF NOT EXISTS idx_orders_trader ON orders(trader_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `);

  // ============================================================================
  // SURVEILLANCE TABLES
  // ============================================================================

  await pg.query(`
    CREATE TABLE IF NOT EXISTS surveillance_alerts (
      alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      title VARCHAR(500) NOT NULL,
      description TEXT,
      detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      trades JSONB DEFAULT '[]',
      orders JSONB DEFAULT '[]',
      accounts JSONB DEFAULT '[]',
      traders JSONB DEFAULT '[]',
      symbols JSONB DEFAULT '[]',
      rule_id VARCHAR(50),
      rule_version VARCHAR(20),
      confidence DECIMAL(5, 4),
      evidence JSONB DEFAULT '{}',
      assigned_to VARCHAR(100),
      escalated_to VARCHAR(100),
      resolved_at TIMESTAMPTZ,
      resolved_by VARCHAR(100),
      resolution TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_surv_alerts_tenant ON surveillance_alerts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_surv_alerts_status ON surveillance_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_surv_alerts_type ON surveillance_alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_surv_alerts_detected ON surveillance_alerts(detected_at DESC);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS restricted_list (
      id SERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      reason TEXT NOT NULL,
      added_by VARCHAR(100) NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, symbol)
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS position_limits (
      id SERIAL PRIMARY KEY,
      tenant_id UUID,
      symbol VARCHAR(20) NOT NULL,
      position_limit DECIMAL(20, 8) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, symbol)
    );
  `);

  // ============================================================================
  // RISK ANALYTICS TABLES
  // ============================================================================

  await pg.query(`
    CREATE TABLE IF NOT EXISTS portfolio_positions (
      id SERIAL PRIMARY KEY,
      portfolio_id UUID NOT NULL,
      tenant_id UUID NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      quantity DECIMAL(20, 8) NOT NULL,
      market_value DECIMAL(20, 4) NOT NULL,
      cost_basis DECIMAL(20, 4) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(portfolio_id, symbol)
    );

    CREATE INDEX IF NOT EXISTS idx_positions_portfolio ON portfolio_positions(portfolio_id);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
      portfolio_id UUID NOT NULL,
      tenant_id UUID NOT NULL,
      calculated_at TIMESTAMPTZ NOT NULL,
      var_95 DECIMAL(20, 4),
      var_99 DECIMAL(20, 4),
      cvar_95 DECIMAL(20, 4),
      cvar_99 DECIMAL(20, 4),
      sharpe_ratio DECIMAL(10, 6),
      sortino_ratio DECIMAL(10, 6),
      max_drawdown DECIMAL(10, 6),
      beta DECIMAL(10, 6),
      alpha DECIMAL(10, 6),
      currency VARCHAR(3) DEFAULT 'USD',
      positions JSONB DEFAULT '[]',
      concentration_risk JSONB DEFAULT '{}',
      stress_test_results JSONB DEFAULT '[]',
      PRIMARY KEY (portfolio_id, tenant_id)
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS counterparties (
      counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      legal_entity_id VARCHAR(50),
      credit_rating VARCHAR(10),
      rating_agency VARCHAR(50),
      credit_limit DECIMAL(20, 4),
      last_review_date DATE,
      next_review_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS counterparty_exposures (
      id SERIAL PRIMARY KEY,
      counterparty_id UUID NOT NULL REFERENCES counterparties(counterparty_id),
      tenant_id UUID NOT NULL,
      exposure_type VARCHAR(50),
      exposure_amount DECIMAL(20, 4) NOT NULL,
      exposure_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cp_exp_counterparty ON counterparty_exposures(counterparty_id);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS counterparty_risk_metrics (
      counterparty_id UUID NOT NULL,
      tenant_id UUID NOT NULL,
      calculated_at TIMESTAMPTZ NOT NULL,
      probability_of_default DECIMAL(10, 8),
      exposure_at_default DECIMAL(20, 4),
      loss_given_default DECIMAL(10, 8),
      expected_loss DECIMAL(20, 4),
      current_exposure DECIMAL(20, 4),
      utilization_percent DECIMAL(10, 4),
      risk_score DECIMAL(10, 4),
      risk_level VARCHAR(20),
      PRIMARY KEY (counterparty_id, tenant_id)
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS liquidity_risk_metrics (
      portfolio_id UUID NOT NULL,
      tenant_id UUID NOT NULL,
      calculated_at TIMESTAMPTZ NOT NULL,
      liquidity_score DECIMAL(10, 4),
      days_to_liquidate INTEGER,
      liquidation_cost DECIMAL(20, 4),
      liquidation_cost_percent DECIMAL(10, 6),
      position_liquidity JSONB DEFAULT '[]',
      cash_position DECIMAL(20, 4),
      margin_utilization DECIMAL(10, 4),
      PRIMARY KEY (portfolio_id, tenant_id)
    );
  `);

  // ============================================================================
  // FRAUD DETECTION TABLES
  // ============================================================================

  await pg.query(`
    CREATE TABLE IF NOT EXISTS fraud_alerts (
      alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      risk_score DECIMAL(5, 2) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      entity_type VARCHAR(20) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      related_entities JSONB DEFAULT '[]',
      indicators JSONB DEFAULT '[]',
      model_id VARCHAR(50),
      model_version VARCHAR(20),
      case_id UUID,
      assigned_to VARCHAR(100),
      resolved_at TIMESTAMPTZ,
      resolved_by VARCHAR(100),
      resolution VARCHAR(50),
      sar_filed BOOLEAN DEFAULT FALSE,
      sar_filing_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fraud_alerts_tenant ON fraud_alerts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_fraud_alerts_entity ON fraud_alerts(entity_id);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS kyc_profiles (
      customer_id VARCHAR(100) NOT NULL,
      tenant_id UUID NOT NULL,
      customer_type VARCHAR(20) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      date_of_birth DATE,
      nationality VARCHAR(3),
      country_of_residence VARCHAR(3) NOT NULL,
      risk_rating VARCHAR(20) NOT NULL,
      kyc_status VARCHAR(20) NOT NULL,
      verification_level VARCHAR(20) NOT NULL,
      pep_status BOOLEAN DEFAULT FALSE,
      pep_details TEXT,
      sanctions_status VARCHAR(20) DEFAULT 'clear',
      sanctions_details TEXT,
      adverse_media BOOLEAN DEFAULT FALSE,
      adverse_media_details TEXT,
      source_of_funds TEXT,
      source_of_wealth TEXT,
      expected_activity_profile TEXT,
      last_review_date DATE,
      next_review_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (customer_id, tenant_id)
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS aml_cases (
      case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      customer_id VARCHAR(100) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      case_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      risk_level VARCHAR(20) NOT NULL,
      assigned_to VARCHAR(100) NOT NULL,
      due_date DATE NOT NULL,
      alerts JSONB DEFAULT '[]',
      transactions JSONB DEFAULT '[]',
      findings TEXT,
      recommendation TEXT,
      supervisor_review TEXT,
      sar_reference_number VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_aml_cases_tenant ON aml_cases(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_aml_cases_customer ON aml_cases(customer_id);
    CREATE INDEX IF NOT EXISTS idx_aml_cases_status ON aml_cases(status);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      account_id VARCHAR(50) NOT NULL,
      customer_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(20, 4) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      timestamp TIMESTAMPTZ NOT NULL,
      counterparty_account VARCHAR(50),
      counterparty_name VARCHAR(255),
      counterparty_country VARCHAR(3),
      channel VARCHAR(20) NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tx_tenant_time ON transactions(tenant_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions(customer_id);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS sanctions_list (
      id SERIAL PRIMARY KEY,
      entity_name VARCHAR(500) NOT NULL,
      list_type VARCHAR(50) NOT NULL,
      entity_type VARCHAR(20),
      country VARCHAR(3),
      match_score DECIMAL(5, 4) DEFAULT 1.0,
      effective_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sanctions_name ON sanctions_list USING gin (entity_name gin_trgm_ops);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS pep_list (
      id SERIAL PRIMARY KEY,
      pep_name VARCHAR(500) NOT NULL,
      position VARCHAR(255),
      country VARCHAR(3),
      match_score DECIMAL(5, 4) DEFAULT 1.0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pep_name ON pep_list USING gin (pep_name gin_trgm_ops);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS adverse_media (
      id SERIAL PRIMARY KEY,
      entity_name VARCHAR(500) NOT NULL,
      headline TEXT NOT NULL,
      source VARCHAR(255),
      category VARCHAR(50),
      published_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_adverse_name ON adverse_media USING gin (entity_name gin_trgm_ops);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS sar_filings (
      sar_reference VARCHAR(100) PRIMARY KEY,
      case_id UUID REFERENCES aml_cases(case_id),
      subject_name VARCHAR(255) NOT NULL,
      subject_id VARCHAR(100) NOT NULL,
      activity_summary TEXT NOT NULL,
      amount_involved DECIMAL(20, 4),
      activity_start_date DATE,
      activity_end_date DATE,
      suspicious_activity_types TEXT[],
      filed_by VARCHAR(100) NOT NULL,
      filed_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ============================================================================
  // MARKET DATA TABLES
  // ============================================================================

  await pg.query(`
    CREATE TABLE IF NOT EXISTS security_master (
      symbol VARCHAR(20) PRIMARY KEY,
      isin VARCHAR(12),
      cusip VARCHAR(9),
      sedol VARCHAR(7),
      figi VARCHAR(12),
      name VARCHAR(255) NOT NULL,
      asset_class VARCHAR(20) NOT NULL,
      sector VARCHAR(100),
      industry VARCHAR(100),
      exchange VARCHAR(20) NOT NULL,
      currency VARCHAR(3) NOT NULL,
      country VARCHAR(3) NOT NULL,
      lot_size INTEGER DEFAULT 1,
      tick_size DECIMAL(10, 8) DEFAULT 0.01,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_security_isin ON security_master(isin);
    CREATE INDEX IF NOT EXISTS idx_security_cusip ON security_master(cusip);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS market_data_realtime (
      symbol VARCHAR(20) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      open DECIMAL(20, 8),
      high DECIMAL(20, 8),
      low DECIMAL(20, 8),
      close DECIMAL(20, 8),
      volume DECIMAL(20, 4),
      bid DECIMAL(20, 8),
      ask DECIMAL(20, 8),
      bid_size DECIMAL(20, 4),
      ask_size DECIMAL(20, 4),
      last_price DECIMAL(20, 8),
      last_size DECIMAL(20, 4),
      vwap DECIMAL(20, 8),
      turnover DECIMAL(20, 4),
      PRIMARY KEY (symbol, timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_mkt_realtime_time ON market_data_realtime(timestamp DESC);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS market_data_daily (
      symbol VARCHAR(20) NOT NULL,
      trade_date DATE NOT NULL,
      open DECIMAL(20, 8),
      high DECIMAL(20, 8),
      low DECIMAL(20, 8),
      close DECIMAL(20, 8),
      volume DECIMAL(20, 4),
      vwap DECIMAL(20, 8),
      turnover DECIMAL(20, 4),
      PRIMARY KEY (symbol, trade_date)
    );

    CREATE INDEX IF NOT EXISTS idx_mkt_daily_date ON market_data_daily(trade_date DESC);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS corporate_actions (
      action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action_type VARCHAR(20) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      ex_date DATE NOT NULL,
      record_date DATE,
      payment_date DATE,
      ratio DECIMAL(20, 10),
      amount DECIMAL(20, 8),
      currency VARCHAR(3),
      description TEXT NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corp_actions_symbol ON corporate_actions(symbol);
    CREATE INDEX IF NOT EXISTS idx_corp_actions_exdate ON corporate_actions(ex_date);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS execution_quality (
      trade_id UUID PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL,
      quantity DECIMAL(20, 8) NOT NULL,
      executed_price DECIMAL(20, 8) NOT NULL,
      arrival_price DECIMAL(20, 8),
      vwap DECIMAL(20, 8),
      twap DECIMAL(20, 8),
      closing_price DECIMAL(20, 8),
      implementation_shortfall DECIMAL(20, 8),
      vwap_slippage DECIMAL(20, 8),
      twap_slippage DECIMAL(20, 8),
      market_impact DECIMAL(20, 8),
      timing_cost DECIMAL(20, 8),
      execution_venue VARCHAR(50),
      execution_time TIMESTAMPTZ NOT NULL,
      order_duration INTEGER,
      participation_rate DECIMAL(10, 8),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_exec_quality_symbol ON execution_quality(symbol);
    CREATE INDEX IF NOT EXISTS idx_exec_quality_time ON execution_quality(execution_time DESC);
  `);

  // ============================================================================
  // REGULATORY REPORTING TABLES
  // ============================================================================

  await pg.query(`
    CREATE TABLE IF NOT EXISTS regulatory_reports (
      report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      report_type VARCHAR(20) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      submission_deadline DATE NOT NULL,
      submitted_at TIMESTAMPTZ,
      submitted_by VARCHAR(100),
      regulator_reference VARCHAR(100),
      validation_errors JSONB DEFAULT '[]',
      generated_at TIMESTAMPTZ NOT NULL,
      generated_by VARCHAR(100) NOT NULL,
      approved_at TIMESTAMPTZ,
      approved_by VARCHAR(100),
      file_url TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reg_reports_tenant ON regulatory_reports(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_reg_reports_type ON regulatory_reports(report_type);
    CREATE INDEX IF NOT EXISTS idx_reg_reports_status ON regulatory_reports(status);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS cat_reports (
      report_id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      report_date DATE NOT NULL,
      firm_id VARCHAR(50) NOT NULL,
      events JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      submission_timestamp TIMESTAMPTZ,
      error_count INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS trace_reports (
      report_id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      report_date DATE NOT NULL,
      trades JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Enable trigram extension for fuzzy matching
  await pg.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  console.log('Migration 023_financial_compliance_module: UP completed');
}

export async function down(pg: Pool): Promise<void> {
  // Drop tables in reverse order of dependencies
  await pg.query(`DROP TABLE IF EXISTS trace_reports CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS cat_reports CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS regulatory_reports CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS execution_quality CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS corporate_actions CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS market_data_daily CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS market_data_realtime CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS security_master CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS sar_filings CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS adverse_media CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS pep_list CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS sanctions_list CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS transactions CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS aml_cases CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS kyc_profiles CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS fraud_alerts CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS liquidity_risk_metrics CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS counterparty_risk_metrics CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS counterparty_exposures CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS counterparties CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS portfolio_risk_metrics CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS portfolio_positions CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS position_limits CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS restricted_list CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS surveillance_alerts CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS orders CASCADE`);
  await pg.query(`DROP TABLE IF EXISTS trades CASCADE`);

  console.log('Migration 023_financial_compliance_module: DOWN completed');
}
