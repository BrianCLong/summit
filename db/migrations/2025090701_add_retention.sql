-- Example for PostgreSQL
CREATE TABLE IF NOT EXISTS retention_policy (
  table_name text primary key,
  ttl_days int not null,
  updated_at timestamptz not null default now()
);
INSERT INTO retention_policy (table_name, ttl_days)
VALUES ('event_logs', 90)
ON CONFLICT (table_name) DO UPDATE SET ttl_days = EXCLUDED.ttl_days, updated_at = now();