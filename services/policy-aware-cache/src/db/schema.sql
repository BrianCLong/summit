-- Policy-Aware Cache Database Schema
-- Supports audit logging, invalidation tracking, and metadata storage

-- Cache audit log - tracks all cache access
CREATE TABLE IF NOT EXISTS cache_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,  -- 'hit', 'set', 'invalidate'
  cache_key TEXT NOT NULL,
  policy_version VARCHAR(100),
  user_id VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_cache_audit_timestamp ON cache_audit_log(timestamp DESC);
CREATE INDEX idx_cache_audit_user ON cache_audit_log(user_id);
CREATE INDEX idx_cache_audit_policy ON cache_audit_log(policy_version);

-- Cache metadata - stores key component information
CREATE TABLE IF NOT EXISTS cache_metadata (
  cache_key TEXT PRIMARY KEY,
  policy_version VARCHAR(100) NOT NULL,
  policy_digest VARCHAR(64) NOT NULL,
  data_snapshot_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_cache_metadata_policy ON cache_metadata(policy_version);
CREATE INDEX idx_cache_metadata_snapshot ON cache_metadata(data_snapshot_id);

-- Cache invalidation log - tracks invalidation events
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- 'policy_change', 'data_change', 'manual', 'ttl_expired'
  timestamp TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  key_patterns JSONB NOT NULL,  -- Array of key patterns
  initiated_by VARCHAR(255) NOT NULL,
  changes JSONB,  -- Old and new values
  metadata JSONB
);

CREATE INDEX idx_invalidation_timestamp ON cache_invalidation_log(timestamp DESC);
CREATE INDEX idx_invalidation_type ON cache_invalidation_log(type);

-- Policy versions - tracks policy changes over time
CREATE TABLE IF NOT EXISTS policy_versions (
  version VARCHAR(100) PRIMARY KEY,
  digest VARCHAR(64) NOT NULL UNIQUE,
  effective_date TIMESTAMPTZ NOT NULL,
  bundle_revision VARCHAR(100),
  policy_document JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_policy_effective ON policy_versions(effective_date DESC);

-- Data snapshots - tracks data version checkpoints
CREATE TABLE IF NOT EXISTS data_snapshots (
  snapshot_id VARCHAR(255) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  data_hash VARCHAR(64) NOT NULL,
  sources JSONB,  -- Record of source identifiers and their versions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_snapshot_timestamp ON data_snapshots(timestamp DESC);

-- Cache metrics (aggregated) - for performance tracking
CREATE TABLE IF NOT EXISTS cache_metrics (
  id SERIAL PRIMARY KEY,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_hits BIGINT DEFAULT 0,
  total_misses BIGINT DEFAULT 0,
  total_sets BIGINT DEFAULT 0,
  total_invalidations BIGINT DEFAULT 0,
  unique_users INT DEFAULT 0,
  unique_policies INT DEFAULT 0,
  avg_ttl_seconds INT DEFAULT 0,
  metadata JSONB
);

CREATE UNIQUE INDEX idx_cache_metrics_period ON cache_metrics(period_start, period_end);

-- Function to automatically log policy changes
CREATE OR REPLACE FUNCTION log_policy_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log invalidation event when policy changes
  INSERT INTO cache_invalidation_log (type, timestamp, reason, key_patterns, initiated_by, changes)
  VALUES (
    'policy_change',
    NOW(),
    'Policy version updated: ' || NEW.version,
    jsonb_build_array('*:pol:' || OLD.version || ':*'),
    NEW.created_by,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policy_version_change
  AFTER UPDATE ON policy_versions
  FOR EACH ROW
  WHEN (OLD.digest IS DISTINCT FROM NEW.digest)
  EXECUTE FUNCTION log_policy_change();

-- Function to automatically log data snapshot changes
CREATE OR REPLACE FUNCTION log_snapshot_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log invalidation event when data snapshot changes
  INSERT INTO cache_invalidation_log (type, timestamp, reason, key_patterns, initiated_by, changes)
  VALUES (
    'data_change',
    NOW(),
    'Data snapshot updated: ' || NEW.snapshot_id,
    jsonb_build_array('*:data:' || OLD.snapshot_id),
    'system',
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_snapshot_change
  AFTER UPDATE ON data_snapshots
  FOR EACH ROW
  WHEN (OLD.data_hash IS DISTINCT FROM NEW.data_hash)
  EXECUTE FUNCTION log_snapshot_change();

-- View for cache hit rate by policy version
CREATE OR REPLACE VIEW cache_hit_rate_by_policy AS
SELECT
  policy_version,
  COUNT(CASE WHEN action = 'hit' THEN 1 END) as hits,
  COUNT(CASE WHEN action = 'set' THEN 1 END) as misses,
  ROUND(
    COUNT(CASE WHEN action = 'hit' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(CASE WHEN action IN ('hit', 'set') THEN 1 END), 0) * 100,
    2
  ) as hit_rate_pct
FROM cache_audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY policy_version
ORDER BY hit_rate_pct DESC;

-- View for most invalidated cache patterns
CREATE OR REPLACE VIEW top_invalidated_patterns AS
SELECT
  jsonb_array_elements_text(key_patterns) as pattern,
  COUNT(*) as invalidation_count,
  MAX(timestamp) as last_invalidation
FROM cache_invalidation_log
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY pattern
ORDER BY invalidation_count DESC
LIMIT 50;

-- Sample data for development/testing
-- Uncomment for local development

-- INSERT INTO policy_versions (version, digest, effective_date, created_by)
-- VALUES
--   ('v1.0.0', 'abc123def456...', NOW() - INTERVAL '30 days', 'system'),
--   ('v1.1.0', 'def456ghi789...', NOW() - INTERVAL '7 days', 'admin@example.com'),
--   ('v1.2.0', 'ghi789jkl012...', NOW(), 'admin@example.com')
-- ON CONFLICT DO NOTHING;

-- INSERT INTO data_snapshots (snapshot_id, timestamp, data_hash)
-- VALUES
--   ('snapshot-2024-01-01', NOW() - INTERVAL '30 days', 'hash111...'),
--   ('snapshot-2024-01-15', NOW() - INTERVAL '15 days', 'hash222...'),
--   ('snapshot-2024-02-01', NOW(), 'hash333...')
-- ON CONFLICT DO NOTHING;
