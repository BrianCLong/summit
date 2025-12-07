-- server/migrations/008_usage_metering.sql

-- Enable uuid-ossp extension if not exists (usually it is)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'Free', 'Pro', 'Enterprise'
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    limits JSONB NOT NULL DEFAULT '{}', -- Per-kind limits: { "llm.tokens": { "monthlyIncluded": 100000, "hardCap": 1000000, "unitPrice": 0.00002 } }
    features JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tenant Plan Assignments
CREATE TABLE IF NOT EXISTS tenant_plans (
    tenant_id TEXT PRIMARY KEY, -- Using TEXT to match existing tenant_id type
    plan_id UUID NOT NULL REFERENCES plans(id),
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    custom_overrides JSONB, -- Tenant specific overrides for limits/pricing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usage Events (The raw feed)
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    principal_id TEXT,
    principal_kind VARCHAR(50), -- 'user', 'api_key', 'service_account', 'system'
    kind VARCHAR(100) NOT NULL, -- 'llm.tokens', 'maestro.runs', etc.
    quantity NUMERIC NOT NULL,
    unit VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    correlation_id VARCHAR(255)
);

-- Index for fast queries by tenant and time
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_time ON usage_events (tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_kind ON usage_events (kind);

-- 4. Usage Summaries (Aggregated)
CREATE TABLE IF NOT EXISTS usage_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    kind VARCHAR(100) NOT NULL,
    total_quantity NUMERIC NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    breakdown JSONB, -- e.g. { "model:gpt-4": 100, "model:claude-3": 200 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, period_start, period_end, kind)
);

-- 5. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    currency VARCHAR(3) NOT NULL,
    line_items JSONB NOT NULL, -- Array of items
    subtotal NUMERIC NOT NULL,
    taxes NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'FINALIZED', 'PAID', 'VOID'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_period ON invoices (tenant_id, period_start);
