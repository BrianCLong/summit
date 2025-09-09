CREATE TABLE IF NOT EXISTS tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null default 'us-east-1',
  plan text not null default 'starter',
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS quota_def (
  key text primary key, -- e.g. 'api_calls_per_day'
  starter int not null default 5000,
  pro int not null default 50000,
  enterprise int not null default 500000
);

CREATE TABLE IF NOT EXISTS quota_usage (
  tenant_id uuid not null references tenants(id),
  key text not null, 
  period date not null,
  used bigint not null default 0,
  primary key (tenant_id, key, period)
);

-- Insert default quotas
INSERT INTO quota_def (key, starter, pro, enterprise) VALUES 
  ('api_calls_per_day', 5000, 50000, 500000),
  ('storage_gb', 1, 50, 1000),
  ('users_count', 5, 100, 10000)
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_quota_usage_tenant_period ON quota_usage(tenant_id, period);

-- Insert sample tenant for testing
INSERT INTO tenants (id, name, region, plan) VALUES 
  ('demo-tenant-id', 'Demo Tenant', 'us-east-1', 'pro')
ON CONFLICT (id) DO NOTHING;