-- ESG Reporting Schema Migration
-- Creates tables for ESG metrics tracking and automated reporting
-- Version: 1.0.0

-- ============================================================================
-- Create ESG Schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS esg;

-- ============================================================================
-- ESG Reports Table
-- Stores report metadata and summary data
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('annual', 'quarterly', 'monthly', 'ad_hoc', 'regulatory')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- ESG Scores (calculated)
    overall_score DECIMAL(5, 2),
    environmental_score DECIMAL(5, 2),
    social_score DECIMAL(5, 2),
    governance_score DECIMAL(5, 2),

    -- Aggregated metrics stored as JSONB for flexibility
    environmental_metrics JSONB DEFAULT '{}',
    social_metrics JSONB DEFAULT '{}',
    governance_metrics JSONB DEFAULT '{}',

    -- Compliance information
    compliance_frameworks TEXT[] DEFAULT '{}',
    compliance_summary JSONB DEFAULT '{}',

    -- Metadata
    version VARCHAR(20) DEFAULT '1.0',
    template_id UUID,
    attachments JSONB DEFAULT '[]',

    -- Audit fields
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    CONSTRAINT valid_scores CHECK (
        (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)) AND
        (environmental_score IS NULL OR (environmental_score >= 0 AND environmental_score <= 100)) AND
        (social_score IS NULL OR (social_score >= 0 AND social_score <= 100)) AND
        (governance_score IS NULL OR (governance_score >= 0 AND governance_score <= 100))
    )
);

-- ============================================================================
-- ESG Metrics Table
-- Individual metric entries with granular tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    report_id UUID REFERENCES esg.reports(id) ON DELETE CASCADE,

    -- Metric identification
    metric_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('environmental', 'social', 'governance')),
    subcategory VARCHAR(100) NOT NULL,

    -- Values
    value DECIMAL(18, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    previous_value DECIMAL(18, 4),
    target_value DECIMAL(18, 4),
    benchmark_value DECIMAL(18, 4),

    -- Calculated fields
    variance DECIMAL(18, 4),
    variance_percentage DECIMAL(8, 4),
    trend VARCHAR(20) CHECK (trend IN ('improving', 'stable', 'declining')),

    -- Data source tracking
    data_source_name VARCHAR(255),
    data_source_type VARCHAR(50) CHECK (data_source_type IN ('manual', 'automated', 'third_party', 'calculated')),
    data_source_reliability VARCHAR(20) CHECK (data_source_reliability IN ('high', 'medium', 'low')),
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'pending')),

    -- Additional context
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255),

    -- Unique constraint to prevent duplicate metrics per report/period
    UNIQUE (report_id, metric_name, period_start, period_end)
);

-- ============================================================================
-- Compliance Mappings Table
-- Maps metrics to compliance framework requirements
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.compliance_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    metric_id UUID REFERENCES esg.metrics(id) ON DELETE CASCADE,
    report_id UUID REFERENCES esg.reports(id) ON DELETE CASCADE,

    -- Framework reference
    framework_id VARCHAR(50) NOT NULL,
    framework_name VARCHAR(255) NOT NULL,
    requirement_id VARCHAR(100) NOT NULL,
    requirement_name VARCHAR(500),

    -- Compliance status
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN (
        'compliant', 'partially_compliant', 'non_compliant', 'not_applicable', 'pending_review'
    )),

    -- Evidence and analysis
    evidence TEXT,
    gap_analysis TEXT,
    remediation_plan TEXT,

    -- Dates
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assessed_by VARCHAR(255),
    due_date DATE,

    -- Unique constraint
    UNIQUE (metric_id, framework_id, requirement_id)
);

-- ============================================================================
-- Report Schedules Table
-- Automated report generation schedules
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Schedule configuration
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('annual', 'quarterly', 'monthly', 'ad_hoc', 'regulatory')),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
    cron_expression VARCHAR(100),

    -- Report parameters
    frameworks TEXT[] DEFAULT '{}',
    template_id UUID,
    include_charts BOOLEAN DEFAULT true,
    include_comparison BOOLEAN DEFAULT true,

    -- Distribution
    recipients TEXT[] NOT NULL DEFAULT '{}',
    export_formats TEXT[] NOT NULL DEFAULT ARRAY['pdf'],

    -- Schedule state
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(50),
    last_report_id UUID REFERENCES esg.reports(id),
    next_run_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Report Templates Table
-- Reusable report templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255),  -- NULL for system templates

    -- Template definition
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sections JSONB NOT NULL DEFAULT '[]',
    frameworks TEXT[] DEFAULT '{}',
    default_metrics TEXT[] DEFAULT '{}',

    -- Styling
    styling JSONB DEFAULT '{}',

    -- Template management
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0',

    -- Audit fields
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ESG Ratings Table
-- External ESG ratings from third-party providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.external_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    report_id UUID REFERENCES esg.reports(id) ON DELETE SET NULL,

    -- Rating details
    provider VARCHAR(255) NOT NULL,
    rating VARCHAR(50) NOT NULL,
    score DECIMAL(5, 2),
    rating_date DATE NOT NULL,
    outlook VARCHAR(20) CHECK (outlook IN ('positive', 'neutral', 'negative')),
    controversy_score DECIMAL(5, 2),

    -- Additional data
    methodology VARCHAR(255),
    details JSONB DEFAULT '{}',

    -- Audit fields
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255)
);

-- ============================================================================
-- Audit Trail Table
-- Immutable log of all ESG report changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS esg.audit_trail (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    -- Event details
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(255) NOT NULL,

    -- Change details
    previous_state JSONB,
    new_state JSONB,
    changes JSONB,

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    -- Timestamp (immutable)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Reports indexes
CREATE INDEX idx_esg_reports_tenant_id ON esg.reports(tenant_id);
CREATE INDEX idx_esg_reports_status ON esg.reports(status);
CREATE INDEX idx_esg_reports_type ON esg.reports(report_type);
CREATE INDEX idx_esg_reports_period ON esg.reports(period_start, period_end);
CREATE INDEX idx_esg_reports_created_at ON esg.reports(created_at DESC);
CREATE INDEX idx_esg_reports_tenant_status ON esg.reports(tenant_id, status);

-- Metrics indexes
CREATE INDEX idx_esg_metrics_tenant_id ON esg.metrics(tenant_id);
CREATE INDEX idx_esg_metrics_report_id ON esg.metrics(report_id);
CREATE INDEX idx_esg_metrics_category ON esg.metrics(category);
CREATE INDEX idx_esg_metrics_name ON esg.metrics(metric_name);
CREATE INDEX idx_esg_metrics_period ON esg.metrics(period_start, period_end);
CREATE INDEX idx_esg_metrics_tenant_category ON esg.metrics(tenant_id, category);

-- Compliance mappings indexes
CREATE INDEX idx_esg_compliance_tenant_id ON esg.compliance_mappings(tenant_id);
CREATE INDEX idx_esg_compliance_report_id ON esg.compliance_mappings(report_id);
CREATE INDEX idx_esg_compliance_framework ON esg.compliance_mappings(framework_id);
CREATE INDEX idx_esg_compliance_status ON esg.compliance_mappings(status);

-- Schedules indexes
CREATE INDEX idx_esg_schedules_tenant_id ON esg.report_schedules(tenant_id);
CREATE INDEX idx_esg_schedules_next_run ON esg.report_schedules(next_run_at) WHERE enabled = true;
CREATE INDEX idx_esg_schedules_enabled ON esg.report_schedules(enabled);

-- Templates indexes
CREATE INDEX idx_esg_templates_tenant_id ON esg.report_templates(tenant_id);
CREATE INDEX idx_esg_templates_active ON esg.report_templates(is_active);

-- External ratings indexes
CREATE INDEX idx_esg_ratings_tenant_id ON esg.external_ratings(tenant_id);
CREATE INDEX idx_esg_ratings_report_id ON esg.external_ratings(report_id);
CREATE INDEX idx_esg_ratings_provider ON esg.external_ratings(provider);
CREATE INDEX idx_esg_ratings_date ON esg.external_ratings(rating_date DESC);

-- Audit trail indexes
CREATE INDEX idx_esg_audit_tenant_id ON esg.audit_trail(tenant_id);
CREATE INDEX idx_esg_audit_entity ON esg.audit_trail(entity_type, entity_id);
CREATE INDEX idx_esg_audit_created_at ON esg.audit_trail(created_at DESC);
CREATE INDEX idx_esg_audit_actor ON esg.audit_trail(actor);

-- ============================================================================
-- Triggers for Updated Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION esg.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reports_updated_at
    BEFORE UPDATE ON esg.reports
    FOR EACH ROW
    EXECUTE FUNCTION esg.update_updated_at();

CREATE TRIGGER trigger_schedules_updated_at
    BEFORE UPDATE ON esg.report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION esg.update_updated_at();

CREATE TRIGGER trigger_templates_updated_at
    BEFORE UPDATE ON esg.report_templates
    FOR EACH ROW
    EXECUTE FUNCTION esg.update_updated_at();

-- ============================================================================
-- Default System Templates
-- ============================================================================

INSERT INTO esg.report_templates (
    id, tenant_id, name, description, sections, frameworks, default_metrics,
    styling, is_system_template, is_active, created_by
) VALUES
(
    gen_random_uuid(),
    NULL,
    'Standard ESG Report',
    'Comprehensive ESG report covering all three pillars with GRI alignment',
    '[
        {"id": "exec-summary", "title": "Executive Summary", "metrics": [], "includeCharts": true, "includeComparison": true},
        {"id": "environmental", "title": "Environmental Performance", "category": "environmental", "metrics": ["carbonEmissions", "energy", "water", "waste"], "includeCharts": true, "includeComparison": true},
        {"id": "social", "title": "Social Impact", "category": "social", "metrics": ["diversity", "healthSafety", "laborPractices", "communityImpact"], "includeCharts": true, "includeComparison": true},
        {"id": "governance", "title": "Governance", "category": "governance", "metrics": ["boardComposition", "ethics", "riskManagement"], "includeCharts": true, "includeComparison": true},
        {"id": "compliance", "title": "Compliance Summary", "metrics": [], "includeCharts": false, "includeComparison": false}
    ]'::jsonb,
    ARRAY['gri', 'sasb'],
    ARRAY['scope1Emissions', 'scope2Emissions', 'renewableEnergy', 'waterConsumption', 'wasteRecycled', 'genderDiversity', 'injuryRate', 'boardIndependence'],
    '{"primaryColor": "#1976d2", "secondaryColor": "#388e3c", "pageSize": "A4"}'::jsonb,
    true,
    true,
    'system'
),
(
    gen_random_uuid(),
    NULL,
    'Climate-Focused Report (TCFD)',
    'Climate-focused report aligned with TCFD recommendations',
    '[
        {"id": "governance", "title": "Governance", "metrics": ["boardOversight", "managementRole"], "includeCharts": false, "includeComparison": false},
        {"id": "strategy", "title": "Strategy", "metrics": ["climateRisks", "climateOpportunities", "scenarioAnalysis"], "includeCharts": true, "includeComparison": true},
        {"id": "risk-management", "title": "Risk Management", "metrics": ["riskIdentification", "riskManagementProcess"], "includeCharts": false, "includeComparison": false},
        {"id": "metrics-targets", "title": "Metrics and Targets", "metrics": ["scope1Emissions", "scope2Emissions", "scope3Emissions", "emissionsTargets"], "includeCharts": true, "includeComparison": true}
    ]'::jsonb,
    ARRAY['tcfd', 'cdp'],
    ARRAY['scope1Emissions', 'scope2Emissions', 'scope3Emissions', 'energyConsumption', 'renewablePercentage'],
    '{"primaryColor": "#2e7d32", "secondaryColor": "#00695c", "pageSize": "A4"}'::jsonb,
    true,
    true,
    'system'
),
(
    gen_random_uuid(),
    NULL,
    'EU CSRD Report',
    'Report template aligned with EU Corporate Sustainability Reporting Directive (ESRS)',
    '[
        {"id": "e1-climate", "title": "E1: Climate Change", "category": "environmental", "metrics": ["scope1Emissions", "scope2Emissions", "scope3Emissions", "energyConsumption"], "includeCharts": true, "includeComparison": true},
        {"id": "e2-pollution", "title": "E2: Pollution", "category": "environmental", "metrics": ["airEmissions", "waterPollution"], "includeCharts": true, "includeComparison": true},
        {"id": "e3-water", "title": "E3: Water and Marine Resources", "category": "environmental", "metrics": ["waterConsumption", "waterWithdrawal"], "includeCharts": true, "includeComparison": true},
        {"id": "e4-biodiversity", "title": "E4: Biodiversity", "category": "environmental", "metrics": ["biodiversityImpact", "landUse"], "includeCharts": true, "includeComparison": true},
        {"id": "e5-circular", "title": "E5: Circular Economy", "category": "environmental", "metrics": ["wasteGeneration", "recyclingRate"], "includeCharts": true, "includeComparison": true},
        {"id": "s1-workforce", "title": "S1: Own Workforce", "category": "social", "metrics": ["employeeCount", "healthSafety", "diversity"], "includeCharts": true, "includeComparison": true},
        {"id": "s2-value-chain", "title": "S2: Workers in Value Chain", "category": "social", "metrics": ["supplyChainLabor"], "includeCharts": false, "includeComparison": false},
        {"id": "s3-communities", "title": "S3: Affected Communities", "category": "social", "metrics": ["communityImpact"], "includeCharts": false, "includeComparison": false},
        {"id": "s4-consumers", "title": "S4: Consumers", "category": "social", "metrics": ["productSafety", "dataPrivacy"], "includeCharts": false, "includeComparison": false},
        {"id": "g1-business-conduct", "title": "G1: Business Conduct", "category": "governance", "metrics": ["antiCorruption", "whistleblowing"], "includeCharts": false, "includeComparison": false}
    ]'::jsonb,
    ARRAY['csrd'],
    ARRAY['scope1Emissions', 'scope2Emissions', 'scope3Emissions', 'waterConsumption', 'wasteGeneration', 'employeeCount', 'injuryRate'],
    '{"primaryColor": "#003399", "secondaryColor": "#ffcc00", "pageSize": "A4"}'::jsonb,
    true,
    true,
    'system'
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON SCHEMA esg IS 'ESG (Environmental, Social, Governance) reporting and metrics tracking';
COMMENT ON TABLE esg.reports IS 'ESG reports with aggregated metrics and compliance data';
COMMENT ON TABLE esg.metrics IS 'Individual ESG metric entries with granular tracking';
COMMENT ON TABLE esg.compliance_mappings IS 'Maps metrics to compliance framework requirements';
COMMENT ON TABLE esg.report_schedules IS 'Automated report generation schedules';
COMMENT ON TABLE esg.report_templates IS 'Reusable report templates';
COMMENT ON TABLE esg.external_ratings IS 'External ESG ratings from third-party providers';
COMMENT ON TABLE esg.audit_trail IS 'Immutable audit log for ESG report changes';
