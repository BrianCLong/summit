INSERT INTO migration_backups (label, location, initiated_by, status, notes)
VALUES (
  'initial-safety-net',
  'pg_dump will write path at runtime',
  'automation',
  'pending',
  '{"message": "Placeholder entry that is updated when automated backups run"}'::jsonb
)
ON CONFLICT DO NOTHING;
