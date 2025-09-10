SET lock_timeout='1s'; SET statement_timeout='5min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_created ON events (tenant_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);