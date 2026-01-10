DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'replicator') THEN

      CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator-secret';
   END IF;
END
$do$;

CREATE SCHEMA IF NOT EXISTS maestro;

-- Sample Table for CDC Demo
CREATE TABLE IF NOT EXISTS maestro.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable REPLICA IDENTITY FULL if needed, though PK is usually enough.
ALTER TABLE maestro.users REPLICA IDENTITY DEFAULT;

GRANT USAGE ON SCHEMA maestro TO replicator;
GRANT USAGE ON SCHEMA public TO replicator;

GRANT SELECT ON ALL TABLES IN SCHEMA maestro TO replicator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO replicator;

ALTER DEFAULT PRIVILEGES IN SCHEMA maestro GRANT SELECT ON TABLES TO replicator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO replicator;
