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
  key text not null, period date not null,
  used bigint not null default 0,
  primary key (tenant_id, key, period)
);