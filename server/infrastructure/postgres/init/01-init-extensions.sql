-- PostgreSQL Production Initialization for IntelGraph
-- Enable required extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- JSON operations
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Full text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Statistics and monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create monitoring user for metrics collection
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monitoring') THEN
        CREATE ROLE monitoring LOGIN PASSWORD 'monitoring_password';
    END IF;
END
$$;

-- Grant necessary permissions for monitoring
GRANT pg_monitor TO monitoring;
GRANT CONNECT ON DATABASE intelgraph_prod TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;

-- Create read-only user for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'reporting') THEN
        CREATE ROLE reporting LOGIN PASSWORD 'reporting_password';
    END IF;
END
$$;

-- Grant read-only access to all tables
GRANT CONNECT ON DATABASE intelgraph_prod TO reporting;
GRANT USAGE ON SCHEMA public TO reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reporting;

-- Optimize PostgreSQL settings for analytics workload
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Performance optimizations
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET seq_page_cost = 1.0;

-- Reload configuration
SELECT pg_reload_conf();