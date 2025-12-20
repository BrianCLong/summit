-- Migration: Create initial schema for the alerting system

-- Table to store rules that trigger alerts
CREATE TABLE alert_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    threshold FLOAT NOT NULL,
    operator VARCHAR(10) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    severity VARCHAR(50) NOT NULL,
    notification_channel_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to store the history of triggered alerts
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES alert_rules(id),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value FLOAT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);

-- Table to store configuration for notification channels
CREATE TABLE notification_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'slack', 'email', 'webhook'
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint to alert_rules
ALTER TABLE alert_rules
ADD CONSTRAINT fk_notification_channel
FOREIGN KEY (notification_channel_id)
REFERENCES notification_channels(id);
