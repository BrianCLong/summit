-- Example for PostgreSQL
-- Expand: forward compatible
SET lock_timeout = '1s';
SET statement_timeout = '5min';
ALTER TABLE orders ADD COLUMN new_total_cents bigint;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders (created_at);