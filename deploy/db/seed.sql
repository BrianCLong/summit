-- Example seed data for pipelines and executors
INSERT INTO pipelines (name, spec)
VALUES ('hello-world', '{"nodes":[{"id":"n1","type":"ingest"}],"edges":[]}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO executors (name, kind, labels, capacity, status)
VALUES ('pool-ci', 'cpu', ARRAY['ci','build'], 4, 'ready')
ON CONFLICT DO NOTHING;
