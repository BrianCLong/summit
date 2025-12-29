CREATE TABLE IF NOT EXISTS event_log (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_id VARCHAR(255),
    payload JSONB NOT NULL,
    schema_version VARCHAR(50),
    receipt_ref VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_log_tenant_date ON event_log(tenant_id, occurred_at);

CREATE TABLE IF NOT EXISTS inbound_alert_configs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    secret VARCHAR(255),
    enabled BOOLEAN DEFAULT TRUE,
    alert_template JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbound_alerts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    config_id UUID NOT NULL REFERENCES inbound_alert_configs(id),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    error TEXT,
    incident_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    source VARCHAR(50),
    ticket_ref JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
