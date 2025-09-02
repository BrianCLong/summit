-- Initialize Maestro database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS maestro;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS prov;

-- Set search path
SET search_path TO maestro, public;

-- Create basic users and permissions
CREATE ROLE maestro_app WITH LOGIN PASSWORD 'maestro-app-secret';
CREATE ROLE maestro_readonly WITH LOGIN PASSWORD 'maestro-readonly-secret';

-- Grant schema permissions
GRANT USAGE ON SCHEMA maestro TO maestro_app, maestro_readonly;
GRANT USAGE ON SCHEMA audit TO maestro_app, maestro_readonly;
GRANT USAGE ON SCHEMA prov TO maestro_app, maestro_readonly;

-- App user permissions
GRANT CREATE ON SCHEMA maestro TO maestro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA maestro TO maestro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA maestro TO maestro_app;

-- Readonly user permissions  
GRANT SELECT ON ALL TABLES IN SCHEMA maestro TO maestro_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO maestro_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA prov TO maestro_readonly;

-- Set default permissions for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA maestro GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maestro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA maestro GRANT USAGE, SELECT ON SEQUENCES TO maestro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA maestro GRANT SELECT ON TABLES TO maestro_readonly;