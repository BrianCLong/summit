-- CompanyOS Internal Operations Tables
-- These tables support Summit's self-hosting operational capabilities:
-- incident management, deployment tracking, SLO monitoring, and operational intelligence

-- ============================================================================
-- INCIDENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL DEFAULT 'summit-internal',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('sev1', 'sev2', 'sev3', 'sev4')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed')),
    affected_services TEXT[], -- Array of service names
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    commander VARCHAR(255), -- Incident commander username
    responders TEXT[], -- Array of responder usernames
    github_issue_url TEXT,
    github_issue_number INTEGER,
    slack_channel TEXT,
    root_cause TEXT,
    impact_description TEXT,
    customer_impact BOOLEAN DEFAULT false,
    estimated_affected_users INTEGER,
    metadata JSONB DEFAULT '{}', -- Additional structured data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_tenant_id ON maestro.incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON maestro.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON maestro.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON maestro.incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved_at ON maestro.incidents(resolved_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_commander ON maestro.incidents(commander);
CREATE INDEX IF NOT EXISTS idx_incidents_customer_impact ON maestro.incidents(customer_impact);
CREATE INDEX IF NOT EXISTS idx_incidents_metadata ON maestro.incidents USING GIN(metadata);

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON maestro.incidents
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- DEPLOYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(255) NOT NULL,
    version VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('dev', 'staging', 'preview', 'production', 'canary')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'succeeded', 'failed', 'rolled_back', 'cancelled')),
    deployment_type VARCHAR(50) DEFAULT 'standard' CHECK (deployment_type IN ('standard', 'canary', 'blue_green', 'rolling', 'hotfix')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    deployed_by VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(40),
    github_run_id VARCHAR(50),
    github_run_url TEXT,
    github_release_url TEXT,
    rollback_of_deployment_id UUID REFERENCES maestro.deployments(id),
    health_check_status VARCHAR(50) CHECK (health_check_status IN ('passed', 'failed', 'skipped')),
    smoke_test_status VARCHAR(50) CHECK (smoke_test_status IN ('passed', 'failed', 'skipped')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_service_name ON maestro.deployments(service_name);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON maestro.deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON maestro.deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_started_at ON maestro.deployments(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_by ON maestro.deployments(deployed_by);
CREATE INDEX IF NOT EXISTS idx_deployments_commit_sha ON maestro.deployments(commit_sha);
CREATE INDEX IF NOT EXISTS idx_deployments_rollback_of ON maestro.deployments(rollback_of_deployment_id);

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON maestro.deployments
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- SLO VIOLATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.slo_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_name VARCHAR(255) NOT NULL,
    slo_type VARCHAR(50) NOT NULL CHECK (slo_type IN ('availability', 'latency', 'error_rate', 'throughput')),
    service_name VARCHAR(255) NOT NULL,
    threshold_value DECIMAL(10,4) NOT NULL,
    actual_value DECIMAL(10,4) NOT NULL,
    measurement_window VARCHAR(50), -- e.g., '5m', '1h', '28d'
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    severity VARCHAR(20) CHECK (severity IN ('warning', 'critical')),
    incident_id UUID REFERENCES maestro.incidents(id),
    alert_id UUID, -- Will reference alerts table
    error_budget_impact DECIMAL(10,6), -- Percentage of error budget consumed
    prometheus_query TEXT,
    prometheus_value_json JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slo_violations_slo_name ON maestro.slo_violations(slo_name);
CREATE INDEX IF NOT EXISTS idx_slo_violations_service ON maestro.slo_violations(service_name);
CREATE INDEX IF NOT EXISTS idx_slo_violations_triggered_at ON maestro.slo_violations(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_slo_violations_incident_id ON maestro.slo_violations(incident_id);
CREATE INDEX IF NOT EXISTS idx_slo_violations_severity ON maestro.slo_violations(severity);

CREATE TRIGGER update_slo_violations_updated_at BEFORE UPDATE ON maestro.slo_violations
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(255) NOT NULL,
    alert_source VARCHAR(50) NOT NULL CHECK (alert_source IN ('prometheus', 'alertmanager', 'grafana', 'custom', 'github_actions')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'firing' CHECK (status IN ('firing', 'acknowledged', 'resolved', 'silenced')),
    service_name VARCHAR(255),
    summary TEXT NOT NULL,
    description TEXT,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    incident_id UUID REFERENCES maestro.incidents(id),
    slo_violation_id UUID REFERENCES maestro.slo_violations(id),
    runbook_url TEXT,
    dashboard_url TEXT,
    fingerprint VARCHAR(255), -- For deduplication
    group_key VARCHAR(255), -- For alert grouping
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_alert_name ON maestro.alerts(alert_name);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON maestro.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON maestro.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON maestro.alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_service_name ON maestro.alerts(service_name);
CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON maestro.alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_fingerprint ON maestro.alerts(fingerprint);
CREATE INDEX IF NOT EXISTS idx_alerts_labels ON maestro.alerts USING GIN(labels);

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON maestro.alerts
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- Add foreign key constraint now that alerts table exists
ALTER TABLE maestro.slo_violations
    ADD CONSTRAINT fk_slo_violations_alert_id
    FOREIGN KEY (alert_id) REFERENCES maestro.alerts(id);

-- ============================================================================
-- RUNBOOKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'deployment', 'incident-response', 'compliance'
    file_path TEXT NOT NULL, -- Path to runbook file in RUNBOOKS/
    yaml_content JSONB, -- Parsed YAML content
    markdown_content TEXT, -- Rendered markdown
    tags TEXT[],
    related_services TEXT[],
    estimated_duration_minutes INTEGER,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2), -- Percentage
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runbooks_name ON maestro.runbooks(name);
CREATE INDEX IF NOT EXISTS idx_runbooks_category ON maestro.runbooks(category);
CREATE INDEX IF NOT EXISTS idx_runbooks_tags ON maestro.runbooks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_runbooks_last_executed ON maestro.runbooks(last_executed_at DESC);

CREATE TRIGGER update_runbooks_updated_at BEFORE UPDATE ON maestro.runbooks
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- RUNBOOK EXECUTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.runbook_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runbook_id UUID NOT NULL REFERENCES maestro.runbooks(id),
    incident_id UUID REFERENCES maestro.incidents(id),
    alert_id UUID REFERENCES maestro.alerts(id),
    status VARCHAR(50) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'cancelled')),
    triggered_by VARCHAR(255) NOT NULL,
    trigger_source VARCHAR(50) CHECK (trigger_source IN ('manual', 'incident', 'alert', 'scheduled', 'api')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    steps_completed INTEGER DEFAULT 0,
    steps_total INTEGER,
    current_step TEXT,
    execution_log JSONB DEFAULT '[]', -- Array of step logs
    outcome TEXT, -- Summary of execution outcome
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runbook_executions_runbook_id ON maestro.runbook_executions(runbook_id);
CREATE INDEX IF NOT EXISTS idx_runbook_executions_incident_id ON maestro.runbook_executions(incident_id);
CREATE INDEX IF NOT EXISTS idx_runbook_executions_status ON maestro.runbook_executions(status);
CREATE INDEX IF NOT EXISTS idx_runbook_executions_started_at ON maestro.runbook_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runbook_executions_triggered_by ON maestro.runbook_executions(triggered_by);

CREATE TRIGGER update_runbook_executions_updated_at BEFORE UPDATE ON maestro.runbook_executions
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- ON-CALL SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.on_call_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    user_display_name VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('primary', 'secondary', 'escalation')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_override BOOLEAN DEFAULT false, -- Temporary schedule override
    override_reason TEXT,
    pagerduty_schedule_id VARCHAR(255),
    notification_preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_on_call_schedules_team ON maestro.on_call_schedules(team_name);
CREATE INDEX IF NOT EXISTS idx_on_call_schedules_user ON maestro.on_call_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_on_call_schedules_time_range ON maestro.on_call_schedules(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_on_call_schedules_active ON maestro.on_call_schedules(start_time, end_time)
    WHERE end_time > NOW();

CREATE TRIGGER update_on_call_schedules_updated_at BEFORE UPDATE ON maestro.on_call_schedules
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- POSTMORTEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.postmortems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES maestro.incidents(id),
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    timeline JSONB DEFAULT '[]', -- Array of timeline events
    root_cause_analysis TEXT,
    impact_analysis TEXT,
    what_went_well TEXT[],
    what_went_wrong TEXT[],
    action_items JSONB DEFAULT '[]', -- Array of action items with owners and due dates
    lessons_learned TEXT[],
    contributing_factors TEXT[],
    detection_method TEXT,
    response_effectiveness VARCHAR(50) CHECK (response_effectiveness IN ('excellent', 'good', 'fair', 'poor')),
    severity_assessment VARCHAR(20),
    downtime_minutes INTEGER,
    customer_impact_description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
    author VARCHAR(255) NOT NULL,
    reviewers TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    github_issue_url TEXT,
    google_doc_url TEXT,
    slack_discussion_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postmortems_incident_id ON maestro.postmortems(incident_id);
CREATE INDEX IF NOT EXISTS idx_postmortems_status ON maestro.postmortems(status);
CREATE INDEX IF NOT EXISTS idx_postmortems_published_at ON maestro.postmortems(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_postmortems_author ON maestro.postmortems(author);
CREATE INDEX IF NOT EXISTS idx_postmortems_severity ON maestro.postmortems(severity_assessment);

CREATE TRIGGER update_postmortems_updated_at BEFORE UPDATE ON maestro.postmortems
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- ADR (Architecture Decision Records) TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.adrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adr_number INTEGER NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'deprecated', 'superseded')),
    context TEXT NOT NULL,
    decision TEXT NOT NULL,
    consequences TEXT,
    superseded_by_adr_id UUID REFERENCES maestro.adrs(id),
    related_adr_ids UUID[],
    file_path TEXT NOT NULL, -- Path to ADR file in adr/
    markdown_content TEXT,
    tags TEXT[],
    affected_services TEXT[],
    stakeholders TEXT[],
    decision_date DATE,
    review_date DATE,
    github_pr_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_adrs_adr_number ON maestro.adrs(adr_number);
CREATE INDEX IF NOT EXISTS idx_adrs_status ON maestro.adrs(status);
CREATE INDEX IF NOT EXISTS idx_adrs_tags ON maestro.adrs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_adrs_decision_date ON maestro.adrs(decision_date DESC);

CREATE TRIGGER update_adrs_updated_at BEFORE UPDATE ON maestro.adrs
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- EPIC/ROADMAP ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id VARCHAR(100) UNIQUE, -- e.g., 'EPIC-123'
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'planned', 'in_progress', 'blocked', 'completed', 'cancelled')),
    priority VARCHAR(20) CHECK (priority IN ('p0-must', 'p1-love', 'p2-delight', 'p3-nice')),
    category VARCHAR(100), -- e.g., 'collaboration', 'integrations', 'ops-reliability'
    quarter VARCHAR(10), -- e.g., 'Q1-2025'
    start_date DATE,
    target_date DATE,
    completed_date DATE,
    owner VARCHAR(255),
    team VARCHAR(255),
    github_repo VARCHAR(255),
    github_issues TEXT[], -- Array of issue URLs or numbers
    github_milestone_url TEXT,
    related_adr_ids UUID[],
    dependencies UUID[], -- Other roadmap item IDs
    user_stories JSONB DEFAULT '[]',
    acceptance_criteria JSONB DEFAULT '[]',
    verification_hooks JSONB DEFAULT '{}',
    evidence_hooks JSONB DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_epic_id ON maestro.roadmap_items(epic_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON maestro.roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_priority ON maestro.roadmap_items(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_quarter ON maestro.roadmap_items(quarter);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_owner ON maestro.roadmap_items(owner);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_team ON maestro.roadmap_items(team);

CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON maestro.roadmap_items
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- CUSTOMER REQUESTS/DEMOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS maestro.customer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) CHECK (request_type IN ('demo', 'feature_request', 'bug_report', 'feedback', 'question')),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_org VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'planned', 'in_progress', 'completed', 'wont_do')),
    assigned_to VARCHAR(255),
    demo_date TIMESTAMP WITH TIME ZONE,
    demo_recording_url TEXT,
    related_roadmap_item_id UUID REFERENCES maestro.roadmap_items(id),
    github_issue_url TEXT,
    salesforce_id VARCHAR(100),
    tags TEXT[],
    estimated_value DECIMAL(10,2), -- Potential contract value
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_customer_requests_type ON maestro.customer_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_customer_requests_status ON maestro.customer_requests(status);
CREATE INDEX IF NOT EXISTS idx_customer_requests_priority ON maestro.customer_requests(priority);
CREATE INDEX IF NOT EXISTS idx_customer_requests_customer ON maestro.customer_requests(customer_org);
CREATE INDEX IF NOT EXISTS idx_customer_requests_demo_date ON maestro.customer_requests(demo_date);
CREATE INDEX IF NOT EXISTS idx_customer_requests_assigned ON maestro.customer_requests(assigned_to);

CREATE TRIGGER update_customer_requests_updated_at BEFORE UPDATE ON maestro.customer_requests
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- ============================================================================
-- VIEWS FOR OPERATIONAL DASHBOARDS
-- ============================================================================

-- View: Active incidents with calculated metrics
CREATE OR REPLACE VIEW maestro.active_incidents_view AS
SELECT
    i.*,
    EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, NOW()) - i.started_at))/60 AS duration_minutes,
    CASE
        WHEN i.resolved_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (i.resolved_at - i.acknowledged_at))/60
        ELSE NULL
    END AS time_to_resolve_minutes,
    (SELECT COUNT(*) FROM maestro.alerts WHERE incident_id = i.id) AS alert_count,
    (SELECT COUNT(*) FROM maestro.runbook_executions WHERE incident_id = i.id) AS runbook_execution_count
FROM maestro.incidents i
WHERE i.status IN ('open', 'investigating', 'identified', 'monitoring')
ORDER BY i.severity, i.started_at DESC;

-- View: Recent deployments with success rate
CREATE OR REPLACE VIEW maestro.recent_deployments_view AS
SELECT
    service_name,
    environment,
    COUNT(*) as total_deployments,
    SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successful_deployments,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_deployments,
    SUM(CASE WHEN status = 'rolled_back' THEN 1 ELSE 0 END) as rolled_back_deployments,
    ROUND(100.0 * SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    AVG(duration_seconds) as avg_duration_seconds,
    MAX(started_at) as last_deployment_at
FROM maestro.deployments
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY service_name, environment
ORDER BY last_deployment_at DESC;

-- View: SLO compliance summary
CREATE OR REPLACE VIEW maestro.slo_compliance_view AS
SELECT
    slo_name,
    service_name,
    slo_type,
    COUNT(*) as violation_count,
    MAX(triggered_at) as last_violation_at,
    SUM(error_budget_impact) as total_error_budget_consumed,
    AVG(actual_value) as avg_actual_value,
    MIN(threshold_value) as threshold_value
FROM maestro.slo_violations
WHERE triggered_at > NOW() - INTERVAL '28 days'
GROUP BY slo_name, service_name, slo_type
ORDER BY violation_count DESC, last_violation_at DESC;

-- View: Alert metrics
CREATE OR REPLACE VIEW maestro.alert_metrics_view AS
SELECT
    alert_name,
    service_name,
    severity,
    COUNT(*) as fire_count,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(acknowledged_at, NOW()) - triggered_at))/60) as avg_time_to_acknowledge_minutes,
    AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - triggered_at))/60) as avg_time_to_resolve_minutes,
    MAX(triggered_at) as last_fired_at
FROM maestro.alerts
WHERE triggered_at > NOW() - INTERVAL '7 days'
GROUP BY alert_name, service_name, severity
ORDER BY fire_count DESC;

-- View: DORA metrics (Deployment frequency, Lead time, MTTR, Change failure rate)
CREATE OR REPLACE VIEW maestro.dora_metrics_view AS
WITH deployment_metrics AS (
    SELECT
        service_name,
        environment,
        DATE_TRUNC('day', started_at) as deployment_date,
        COUNT(*) as deployments_per_day,
        SUM(CASE WHEN status = 'failed' OR status = 'rolled_back' THEN 1 ELSE 0 END) as failed_deployments
    FROM maestro.deployments
    WHERE started_at > NOW() - INTERVAL '90 days'
    GROUP BY service_name, environment, DATE_TRUNC('day', started_at)
),
incident_metrics AS (
    SELECT
        AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - started_at))/60) as avg_mttr_minutes
    FROM maestro.incidents
    WHERE started_at > NOW() - INTERVAL '90 days'
    AND severity IN ('sev1', 'sev2')
)
SELECT
    dm.service_name,
    dm.environment,
    AVG(dm.deployments_per_day) as avg_deployment_frequency_per_day,
    SUM(dm.deployments_per_day) as total_deployments_90d,
    ROUND(100.0 * SUM(dm.failed_deployments) / NULLIF(SUM(dm.deployments_per_day), 0), 2) as change_failure_rate,
    (SELECT avg_mttr_minutes FROM incident_metrics) as avg_mttr_minutes
FROM deployment_metrics dm
GROUP BY dm.service_name, dm.environment
ORDER BY avg_deployment_frequency_per_day DESC;

-- ============================================================================
-- INITIAL DATA SEEDING (Optional)
-- ============================================================================

-- Seed runbooks from RUNBOOKS/ directory (to be populated by sync script)
-- This provides a starting point for runbook tracking

COMMENT ON TABLE maestro.incidents IS 'Tracks operational incidents for Summit internal operations';
COMMENT ON TABLE maestro.deployments IS 'Tracks all deployment events across environments';
COMMENT ON TABLE maestro.slo_violations IS 'Records SLO violations and error budget consumption';
COMMENT ON TABLE maestro.alerts IS 'Alert history from all monitoring systems';
COMMENT ON TABLE maestro.runbooks IS 'Operational runbook catalog';
COMMENT ON TABLE maestro.runbook_executions IS 'Tracks runbook execution history';
COMMENT ON TABLE maestro.on_call_schedules IS 'On-call rotation schedules';
COMMENT ON TABLE maestro.postmortems IS 'Incident postmortem documents';
COMMENT ON TABLE maestro.adrs IS 'Architecture Decision Records';
COMMENT ON TABLE maestro.roadmap_items IS 'Product roadmap and epic tracking';
COMMENT ON TABLE maestro.customer_requests IS 'Customer demo requests and feedback';
