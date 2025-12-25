
-- Revenue Maturity Program Tables

-- 1. Contract Terms
CREATE TABLE IF NOT EXISTS contract_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT FALSE,
    term_length_months INTEGER NOT NULL,
    cancellation_notice_period_days INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Renewal Events
CREATE TABLE IF NOT EXISTS renewal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    contract_id UUID NOT NULL REFERENCES contract_terms(id),
    event_type VARCHAR(50) NOT NULL, -- 'NOTICE_SENT', 'FORECAST_GENERATED', 'RENEWED', 'CHURNED'
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usage Forecasts
CREATE TABLE IF NOT EXISTS usage_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    forecast_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    projected_amount DECIMAL(15, 2) NOT NULL,
    confidence_score DECIMAL(5, 4), -- 0.0 to 1.0
    line_items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Pricing Rule Versions
CREATE TABLE IF NOT EXISTS pricing_rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255), -- Nullable for global rules, present for tenant-specific overrides
    version INTEGER NOT NULL,
    rules JSONB NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bill Shock Caps
CREATE TABLE IF NOT EXISTS bill_shock_caps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    cap_amount DECIMAL(15, 2) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'ALERT', 'THROTTLE', 'BLOCK'
    threshold_percent INTEGER DEFAULT 80, -- Trigger alert at 80% of cap
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Partner Payout Reports
CREATE TABLE IF NOT EXISTS partner_payout_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id VARCHAR(255) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'APPROVED', 'PAID'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Partner Earnings Line Items
CREATE TABLE IF NOT EXISTS partner_earnings_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES partner_payout_reports(id),
    artifact_id VARCHAR(255) NOT NULL,
    usage_units DECIMAL(15, 2) NOT NULL,
    payout_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_terms_tenant ON contract_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_renewal_events_tenant ON renewal_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_forecasts_tenant ON usage_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rule_versions_tenant ON pricing_rule_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partner_payout_reports_partner ON partner_payout_reports(partner_id);
