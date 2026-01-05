-- server/migrations/010_billing_exports_and_webhooks.sql

CREATE TABLE IF NOT EXISTS billing_export_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT billing_export_snapshots_period_aligned CHECK (
        period_end - period_start = INTERVAL '30 days'
    ),
    UNIQUE (tenant_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS billing_export_snapshot_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES billing_export_snapshots(id) ON DELETE CASCADE,
    kind VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    total_quantity NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_id, kind, unit)
);

CREATE TABLE IF NOT EXISTS billing_webhook_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    webhook_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_billing_export_snapshots_tenant_period
    ON billing_export_snapshots (tenant_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_billing_export_snapshot_items_snapshot
    ON billing_export_snapshot_items (snapshot_id, kind, unit);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_outbox_due
    ON billing_webhook_outbox (status, next_attempt_at);
