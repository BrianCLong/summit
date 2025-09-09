CREATE TABLE IF NOT EXISTS schema_version (
  version int not null,
  effective_at timestamptz not null default now()
);
INSERT INTO schema_version(version) VALUES (1) ON CONFLICT DO NOTHING;