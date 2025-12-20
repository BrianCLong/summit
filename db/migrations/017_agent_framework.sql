-- Agent Framework Tables
-- Supports AI agent identity, authentication, and lifecycle management
-- Part of AGENT-1: Agent Entity & Identity

-- Agent definitions table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    agent_type VARCHAR(50) NOT NULL DEFAULT 'internal', -- 'internal', 'external', 'partner'
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    -- Scoping and permissions
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_scopes JSONB NOT NULL DEFAULT '[]', -- Array of tenant IDs this agent can access
    project_scopes JSONB NOT NULL DEFAULT '[]', -- Array of project IDs this agent can access

    -- Status and lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'retired'
    is_certified BOOLEAN DEFAULT false, -- Has passed safety certification
    certification_date TIMESTAMP WITH TIME ZONE,
    certification_expires_at TIMESTAMP WITH TIME ZONE,

    -- Capabilities and restrictions
    capabilities JSONB NOT NULL DEFAULT '[]', -- Array of allowed capabilities
    restrictions JSONB DEFAULT '{"max_risk_level": "medium", "require_approval": ["high", "critical"]}',

    -- Metadata
    owner_id UUID REFERENCES users(id), -- Responsible party for this agent
    metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CHECK (status IN ('active', 'suspended', 'retired')),
    CHECK (agent_type IN ('internal', 'external', 'partner'))
);

-- Agent credentials table (for API key authentication)
CREATE TABLE IF NOT EXISTS agent_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Credential details
    credential_type VARCHAR(50) NOT NULL DEFAULT 'api_key', -- 'api_key', 'oauth_client', 'service_account'
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key or credential
    key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification (e.g., "agt_")

    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_rotated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotation_required_at TIMESTAMP WITH TIME ZONE, -- When rotation is mandated

    -- Security
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,

    -- Rate limiting
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (credential_type IN ('api_key', 'oauth_client', 'service_account'))
);

-- Agent runs table (execution tracking)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Execution context
    tenant_id VARCHAR(255) NOT NULL, -- Tenant context for this run
    project_id UUID REFERENCES projects(id), -- Optional project context

    -- Operation mode (AGENT-5)
    operation_mode VARCHAR(50) NOT NULL DEFAULT 'SIMULATION', -- 'SIMULATION', 'DRY_RUN', 'ENFORCED'

    -- Run metadata
    trigger_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'event', 'api'
    trigger_source JSONB, -- Details about what triggered this run

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Actions and outcomes
    actions_proposed JSONB DEFAULT '[]', -- Array of actions the agent proposed
    actions_executed JSONB DEFAULT '[]', -- Array of actions actually executed
    actions_denied JSONB DEFAULT '[]', -- Array of actions that were denied

    -- Results
    outcome JSONB, -- Structured outcome data
    error JSONB, -- Error details if failed

    -- Observability
    trace_id VARCHAR(255), -- OpenTelemetry trace ID
    span_id VARCHAR(255), -- OpenTelemetry span ID

    -- Resource consumption
    duration_ms INTEGER, -- Execution duration in milliseconds
    tokens_consumed INTEGER, -- AI tokens consumed (if applicable)
    api_calls_made INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (operation_mode IN ('SIMULATION', 'DRY_RUN', 'ENFORCED')),
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- Agent actions table (detailed action logging)
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Action details
    action_type VARCHAR(100) NOT NULL, -- 'read', 'write', 'delete', 'execute', 'query', etc.
    action_target VARCHAR(255), -- What the action targeted (resource ID, endpoint, etc.)
    action_payload JSONB, -- Action parameters/payload

    -- Risk assessment
    risk_level VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    risk_factors JSONB DEFAULT '[]', -- Array of risk factors identified

    -- Authorization
    policy_decision JSONB, -- OPA policy decision for this action
    authorization_status VARCHAR(50) NOT NULL, -- 'allowed', 'denied', 'requires_approval'
    denial_reason TEXT, -- Why action was denied (if applicable)

    -- Approval workflow (AGENT-9)
    requires_approval BOOLEAN DEFAULT false,
    approval_id UUID, -- Reference to approval request (if applicable)
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Execution
    executed BOOLEAN DEFAULT false,
    execution_result JSONB,
    execution_error TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CHECK (authorization_status IN ('allowed', 'denied', 'requires_approval', 'approved', 'rejected'))
);

-- Agent approvals table (for high-risk actions - AGENT-9)
CREATE TABLE IF NOT EXISTS agent_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    action_id UUID REFERENCES agent_actions(id) ON DELETE CASCADE,

    -- Approval request
    request_summary TEXT NOT NULL,
    request_details JSONB NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    risk_assessment JSONB, -- Detailed risk analysis

    -- Assignment
    assigned_to JSONB NOT NULL DEFAULT '[]', -- Array of user IDs who can approve
    assigned_roles JSONB DEFAULT '[]', -- Array of roles that can approve

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
    decision_made_by UUID REFERENCES users(id),
    decision_made_at TIMESTAMP WITH TIME ZONE,
    decision_reason TEXT,

    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))
);

-- Agent quotas table (AGENT-8: Rate limiting & quotas)
CREATE TABLE IF NOT EXISTS agent_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Quota type
    quota_type VARCHAR(50) NOT NULL, -- 'daily_runs', 'monthly_runs', 'daily_tokens', 'monthly_tokens', 'daily_api_calls'

    -- Limits
    quota_limit INTEGER NOT NULL,
    quota_used INTEGER DEFAULT 0,

    -- Period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Metadata
    reset_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(agent_id, quota_type, period_start)
);

-- Agent metrics table (AGENT-16: Continuous monitoring)
CREATE TABLE IF NOT EXISTS agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Metric details
    metric_date DATE NOT NULL,
    metric_hour INTEGER, -- Hour of day (0-23) for hourly metrics

    -- Execution metrics
    runs_total INTEGER DEFAULT 0,
    runs_successful INTEGER DEFAULT 0,
    runs_failed INTEGER DEFAULT 0,
    runs_cancelled INTEGER DEFAULT 0,

    -- Action metrics
    actions_proposed INTEGER DEFAULT 0,
    actions_executed INTEGER DEFAULT 0,
    actions_denied INTEGER DEFAULT 0,

    -- Risk metrics
    high_risk_actions INTEGER DEFAULT 0,
    critical_risk_actions INTEGER DEFAULT 0,
    policy_violations INTEGER DEFAULT 0,

    -- Performance metrics
    avg_duration_ms NUMERIC(10,2),
    min_duration_ms INTEGER,
    max_duration_ms INTEGER,

    -- Resource metrics
    total_tokens_consumed BIGINT DEFAULT 0,
    total_api_calls BIGINT DEFAULT 0,

    -- Error metrics
    error_rate NUMERIC(5,4), -- Percentage (0.0000 to 1.0000)
    errors_by_type JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(agent_id, metric_date, metric_hour)
);

-- Agent audit log table (AGENT-7: comprehensive audit trail)
CREATE TABLE IF NOT EXISTS agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- 'credential_created', 'credential_revoked', 'status_changed', 'scope_modified', etc.
    event_category VARCHAR(50) NOT NULL, -- 'lifecycle', 'security', 'access', 'configuration'

    -- Context
    actor_id UUID REFERENCES users(id), -- Who made the change
    actor_type VARCHAR(50), -- 'user', 'system', 'agent'

    -- Changes
    changes JSONB, -- Before/after state
    metadata JSONB DEFAULT '{}',

    -- Audit
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (event_category IN ('lifecycle', 'security', 'access', 'configuration', 'execution'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_agents_organization ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id);

CREATE INDEX IF NOT EXISTS idx_agent_credentials_agent ON agent_credentials(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_credentials_active ON agent_credentials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_credentials_key_hash ON agent_credentials(key_hash);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant ON agent_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_trace ON agent_runs(trace_id);

CREATE INDEX IF NOT EXISTS idx_agent_actions_run ON agent_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent ON agent_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_risk ON agent_actions(risk_level);
CREATE INDEX IF NOT EXISTS idx_agent_actions_auth_status ON agent_actions(authorization_status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_approval ON agent_actions(requires_approval) WHERE requires_approval = true;

CREATE INDEX IF NOT EXISTS idx_agent_approvals_agent ON agent_approvals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_run ON agent_approvals(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_status ON agent_approvals(status);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_assigned_to ON agent_approvals USING GIN(assigned_to);

CREATE INDEX IF NOT EXISTS idx_agent_quotas_agent ON agent_quotas(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_quotas_type ON agent_quotas(quota_type);
CREATE INDEX IF NOT EXISTS idx_agent_quotas_period ON agent_quotas(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_date ON agent_metrics(agent_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_date ON agent_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_agent_audit_log_agent ON agent_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_timestamp ON agent_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_event_type ON agent_audit_log(event_type);

-- Update triggers
CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER update_agent_credentials_updated_at
    BEFORE UPDATE ON agent_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER update_agent_approvals_updated_at
    BEFORE UPDATE ON agent_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER update_agent_quotas_updated_at
    BEFORE UPDATE ON agent_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_updated_at();

-- Function to check agent credential expiration
CREATE OR REPLACE FUNCTION check_agent_credential_expiration()
RETURNS TABLE (
    agent_id UUID,
    agent_name VARCHAR,
    credential_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    days_until_expiration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.name,
        ac.id,
        ac.expires_at,
        EXTRACT(DAY FROM (ac.expires_at - CURRENT_TIMESTAMP))::INTEGER
    FROM agents a
    JOIN agent_credentials ac ON a.id = ac.agent_id
    WHERE ac.is_active = true
    AND ac.expires_at IS NOT NULL
    AND ac.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days'
    ORDER BY ac.expires_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent run statistics
CREATE OR REPLACE FUNCTION get_agent_run_stats(
    agent_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_runs BIGINT,
    successful_runs BIGINT,
    failed_runs BIGINT,
    avg_duration_ms NUMERIC,
    success_rate NUMERIC,
    actions_executed BIGINT,
    actions_denied BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
        AVG(duration_ms) as avg_duration_ms,
        ROUND(
            COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0),
            2
        ) as success_rate,
        SUM(jsonb_array_length(actions_executed)) as actions_executed,
        SUM(jsonb_array_length(actions_denied)) as actions_denied
    FROM agent_runs
    WHERE (agent_id_param IS NULL OR agent_id = agent_id_param)
    AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending approvals for an agent
CREATE OR REPLACE FUNCTION get_pending_agent_approvals(
    user_id_param UUID DEFAULT NULL,
    agent_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    approval_id UUID,
    agent_id UUID,
    agent_name VARCHAR,
    request_summary TEXT,
    risk_level VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aa.id,
        a.id,
        a.name,
        aa.request_summary,
        aa.risk_level,
        aa.created_at,
        aa.expires_at
    FROM agent_approvals aa
    JOIN agents a ON aa.agent_id = a.id
    WHERE aa.status = 'pending'
    AND aa.expires_at > CURRENT_TIMESTAMP
    AND (user_id_param IS NULL OR aa.assigned_to @> jsonb_build_array(user_id_param))
    AND (agent_id_param IS NULL OR aa.agent_id = agent_id_param)
    ORDER BY aa.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent metrics when runs complete
CREATE OR REPLACE FUNCTION update_agent_metrics_on_run_complete()
RETURNS TRIGGER AS $$
DECLARE
    metric_date DATE;
    metric_hour INTEGER;
BEGIN
    -- Only process completed or failed runs
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status = 'running' THEN
        metric_date := DATE(NEW.started_at);
        metric_hour := EXTRACT(HOUR FROM NEW.started_at)::INTEGER;

        -- Update hourly metrics
        INSERT INTO agent_metrics (
            agent_id,
            metric_date,
            metric_hour,
            runs_total,
            runs_successful,
            runs_failed,
            runs_cancelled,
            actions_proposed,
            actions_executed,
            actions_denied,
            avg_duration_ms,
            min_duration_ms,
            max_duration_ms,
            total_tokens_consumed,
            total_api_calls
        ) VALUES (
            NEW.agent_id,
            metric_date,
            metric_hour,
            1,
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
            jsonb_array_length(NEW.actions_proposed),
            jsonb_array_length(NEW.actions_executed),
            jsonb_array_length(NEW.actions_denied),
            NEW.duration_ms,
            NEW.duration_ms,
            NEW.duration_ms,
            COALESCE(NEW.tokens_consumed, 0),
            NEW.api_calls_made
        )
        ON CONFLICT (agent_id, metric_date, metric_hour)
        DO UPDATE SET
            runs_total = agent_metrics.runs_total + 1,
            runs_successful = agent_metrics.runs_successful + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            runs_failed = agent_metrics.runs_failed + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            runs_cancelled = agent_metrics.runs_cancelled + CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
            actions_proposed = agent_metrics.actions_proposed + jsonb_array_length(NEW.actions_proposed),
            actions_executed = agent_metrics.actions_executed + jsonb_array_length(NEW.actions_executed),
            actions_denied = agent_metrics.actions_denied + jsonb_array_length(NEW.actions_denied),
            avg_duration_ms = (agent_metrics.avg_duration_ms * agent_metrics.runs_total + NEW.duration_ms) / (agent_metrics.runs_total + 1),
            min_duration_ms = LEAST(agent_metrics.min_duration_ms, NEW.duration_ms),
            max_duration_ms = GREATEST(agent_metrics.max_duration_ms, NEW.duration_ms),
            total_tokens_consumed = agent_metrics.total_tokens_consumed + COALESCE(NEW.tokens_consumed, 0),
            total_api_calls = agent_metrics.total_api_calls + NEW.api_calls_made;

        -- Also update daily aggregate (without hour)
        INSERT INTO agent_metrics (
            agent_id,
            metric_date,
            runs_total,
            runs_successful,
            runs_failed,
            runs_cancelled,
            actions_proposed,
            actions_executed,
            actions_denied,
            avg_duration_ms,
            min_duration_ms,
            max_duration_ms,
            total_tokens_consumed,
            total_api_calls
        ) VALUES (
            NEW.agent_id,
            metric_date,
            1,
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
            jsonb_array_length(NEW.actions_proposed),
            jsonb_array_length(NEW.actions_executed),
            jsonb_array_length(NEW.actions_denied),
            NEW.duration_ms,
            NEW.duration_ms,
            NEW.duration_ms,
            COALESCE(NEW.tokens_consumed, 0),
            NEW.api_calls_made
        )
        ON CONFLICT (agent_id, metric_date, metric_hour)
        WHERE metric_hour IS NULL
        DO UPDATE SET
            runs_total = agent_metrics.runs_total + 1,
            runs_successful = agent_metrics.runs_successful + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            runs_failed = agent_metrics.runs_failed + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            runs_cancelled = agent_metrics.runs_cancelled + CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
            actions_proposed = agent_metrics.actions_proposed + jsonb_array_length(NEW.actions_proposed),
            actions_executed = agent_metrics.actions_executed + jsonb_array_length(NEW.actions_executed),
            actions_denied = agent_metrics.actions_denied + jsonb_array_length(NEW.actions_denied),
            avg_duration_ms = (agent_metrics.avg_duration_ms * agent_metrics.runs_total + NEW.duration_ms) / (agent_metrics.runs_total + 1),
            min_duration_ms = LEAST(agent_metrics.min_duration_ms, NEW.duration_ms),
            max_duration_ms = GREATEST(agent_metrics.max_duration_ms, NEW.duration_ms),
            total_tokens_consumed = agent_metrics.total_tokens_consumed + COALESCE(NEW.tokens_consumed, 0),
            total_api_calls = agent_metrics.total_api_calls + NEW.api_calls_made;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_run_metrics_trigger
    AFTER UPDATE ON agent_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_metrics_on_run_complete();

-- Function to expire old approvals
CREATE OR REPLACE FUNCTION expire_old_agent_approvals()
RETURNS void AS $$
BEGIN
    UPDATE agent_approvals
    SET status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'pending'
    AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS LATEST_ROW_COUNT = ROW_COUNT;
    IF LATEST_ROW_COUNT > 0 THEN
        RAISE NOTICE 'Expired % pending agent approval requests', LATEST_ROW_COUNT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old agent runs
CREATE OR REPLACE FUNCTION cleanup_old_agent_runs(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM agent_runs
    WHERE started_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep
    AND status IN ('completed', 'failed', 'cancelled');

    GET DIAGNOSTICS LATEST_ROW_COUNT = ROW_COUNT;
    IF LATEST_ROW_COUNT > 0 THEN
        RAISE NOTICE 'Cleaned up % old agent run records', LATEST_ROW_COUNT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your role setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA maestro TO agent_service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA maestro TO agent_service_role;

COMMIT;
