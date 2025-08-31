-- Day 1 Foundation Database Schema
-- Web Interface Compliance and Rate Limiting Infrastructure

-- Create the main compliance tracking table
CREATE TABLE IF NOT EXISTS web_interface_compliance (
    domain VARCHAR(255) PRIMARY KEY,
    last_checked TIMESTAMP DEFAULT NOW(),
    compliant BOOLEAN DEFAULT false,
    restrictions JSONB DEFAULT '[]'::jsonb,
    allowed_use_cases TEXT[] DEFAULT ARRAY[]::TEXT[],
    robots_compliant BOOLEAN DEFAULT false,
    rate_limit INTEGER DEFAULT 60,
    attribution BOOLEAN DEFAULT true,
    robots_policy JSONB
);

-- Create compliance audit log for full decision tracking
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL,
    path VARCHAR(500),
    allowed BOOLEAN NOT NULL,
    reason TEXT NOT NULL,
    restrictions JSONB DEFAULT '[]'::jsonb,
    user_id VARCHAR(255),
    tenant_id VARCHAR(255),
    purpose VARCHAR(100),
    policy_refs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create license information table
CREATE TABLE IF NOT EXISTS web_interface_licenses (
    domain VARCHAR(255) PRIMARY KEY,
    license_type VARCHAR(50) DEFAULT 'public',
    allowed_usage TEXT[] DEFAULT ARRAY[]::TEXT[],
    attribution BOOLEAN DEFAULT true,
    commercial_use BOOLEAN DEFAULT false,
    derivative_works BOOLEAN DEFAULT false,
    redistribution BOOLEAN DEFAULT false,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Create model performance tracking for premium routing
CREATE TABLE IF NOT EXISTS model_performance (
    model_id VARCHAR(100),
    task_type VARCHAR(100), 
    success_rate DECIMAL(5,4) DEFAULT 0.5,
    avg_latency INTEGER DEFAULT 2000,
    avg_cost DECIMAL(10,6) DEFAULT 0.01,
    quality_score DECIMAL(5,4) DEFAULT 0.5,
    last_updated TIMESTAMP DEFAULT NOW(),
    sample_size INTEGER DEFAULT 1,
    PRIMARY KEY (model_id, task_type)
);

-- Create CRDT conflict resolution tables
CREATE TABLE IF NOT EXISTS crdt_conflict_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    conflicts JSONB NOT NULL,
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolution_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crdt_conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_log_id UUID REFERENCES crdt_conflict_log(id),
    conflict_id VARCHAR(255) NOT NULL,
    resolved_by VARCHAR(255) NOT NULL,
    resolution_type VARCHAR(50) NOT NULL,
    merge_strategy VARCHAR(100) NOT NULL,
    final_value JSONB,
    rationale TEXT NOT NULL,
    approved_by VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Seed initial compliant domains (Day 1 allowlist)
INSERT INTO web_interface_compliance (
    domain, compliant, restrictions, allowed_use_cases, robots_compliant, rate_limit, attribution
) VALUES 
-- Initial 6 validated domains ✅
('docs.python.org', true, '["attribution_required"]'::jsonb, '{"intelligence_analysis", "research", "documentation"}', true, 300, true),
('github.com', true, '["attribution_required", "api_preferred"]'::jsonb, '{"intelligence_analysis", "research", "documentation"}', true, 240, true),
('stackoverflow.com', true, '["attribution_required", "read_only"]'::jsonb, '{"research", "documentation"}', true, 180, true),
('arxiv.org', true, '["attribution_required"]'::jsonb, '{"intelligence_analysis", "research"}', true, 120, true),
('nist.gov', true, '[]'::jsonb, '{"intelligence_analysis", "research", "documentation"}', true, 90, false),
('kubernetes.io', true, '["attribution_required"]'::jsonb, '{"intelligence_analysis", "research", "documentation"}', true, 150, true),

-- Additional 4 domains for Day 1 completion
('nodejs.org', true, '["attribution_required"]'::jsonb, '{"research", "documentation"}', true, 120, true),
('developer.mozilla.org', true, '["attribution_required"]'::jsonb, '{"research", "documentation"}', true, 200, true),
('wikipedia.org', true, '["attribution_required", "non_commercial"]'::jsonb, '{"research", "intelligence_analysis"}', true, 100, true),
('openai.com', true, '["attribution_required"]'::jsonb, '{"research", "intelligence_analysis"}', true, 60, true)
ON CONFLICT (domain) DO UPDATE SET
    last_checked = NOW(),
    compliant = EXCLUDED.compliant,
    restrictions = EXCLUDED.restrictions,
    allowed_use_cases = EXCLUDED.allowed_use_cases,
    robots_compliant = EXCLUDED.robots_compliant,
    rate_limit = EXCLUDED.rate_limit,
    attribution = EXCLUDED.attribution;

-- Seed license information
INSERT INTO web_interface_licenses (
    domain, license_type, allowed_usage, attribution, commercial_use, derivative_works, redistribution
) VALUES
('docs.python.org', 'public', '{"research", "documentation", "intelligence_analysis"}', true, true, true, true),
('github.com', 'mixed', '{"research", "documentation", "intelligence_analysis"}', true, false, false, false),
('stackoverflow.com', 'cc_by_sa', '{"research", "documentation"}', true, true, true, true),
('arxiv.org', 'academic', '{"research", "intelligence_analysis"}', true, true, true, true),
('nist.gov', 'public_domain', '{"research", "documentation", "intelligence_analysis"}', false, true, true, true),
('kubernetes.io', 'apache2', '{"research", "documentation", "intelligence_analysis"}', true, true, true, true),
('nodejs.org', 'mit', '{"research", "documentation"}', true, true, true, true),
('developer.mozilla.org', 'cc_by_sa', '{"research", "documentation"}', true, true, true, true),
('wikipedia.org', 'cc_by_sa', '{"research", "intelligence_analysis"}', true, false, true, true),
('openai.com', 'proprietary', '{"research", "intelligence_analysis"}', true, false, false, false)
ON CONFLICT (domain) DO UPDATE SET
    license_type = EXCLUDED.license_type,
    allowed_usage = EXCLUDED.allowed_usage,
    attribution = EXCLUDED.attribution,
    commercial_use = EXCLUDED.commercial_use,
    derivative_works = EXCLUDED.derivative_works,
    redistribution = EXCLUDED.redistribution,
    last_updated = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_audit_domain_created ON compliance_audit_log (domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_tenant_created ON compliance_audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_user_created ON compliance_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_performance_updated ON model_performance (last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_crdt_conflicts_tenant ON crdt_conflict_log (tenant_id, detected_at DESC);

-- Create a view for compliance reporting
CREATE OR REPLACE VIEW compliance_summary AS
SELECT 
    wic.domain,
    wic.compliant,
    wic.robots_compliant,
    wic.rate_limit,
    wil.license_type,
    wil.commercial_use,
    COUNT(cal.id) as audit_entries,
    COUNT(CASE WHEN cal.allowed = true THEN 1 END) as allowed_requests,
    COUNT(CASE WHEN cal.allowed = false THEN 1 END) as blocked_requests,
    ROUND(
        COUNT(CASE WHEN cal.allowed = true THEN 1 END)::decimal / 
        NULLIF(COUNT(cal.id), 0) * 100, 2
    ) as approval_rate
FROM web_interface_compliance wic
LEFT JOIN web_interface_licenses wil ON wic.domain = wil.domain
LEFT JOIN compliance_audit_log cal ON wic.domain = cal.domain 
    AND cal.created_at > NOW() - INTERVAL '24 hours'
GROUP BY wic.domain, wic.compliant, wic.robots_compliant, wic.rate_limit, 
         wil.license_type, wil.commercial_use
ORDER BY wic.domain;

-- Log schema deployment
INSERT INTO compliance_audit_log (
    domain, path, allowed, reason, user_id, tenant_id, purpose, policy_refs
) VALUES (
    'system', 'schema_deployment', true, 'Day 1 foundation schema deployed successfully',
    'system', 'conductor-system', 'infrastructure', '["day1_schema", "compliance_gate", "rate_limiting"]'
);