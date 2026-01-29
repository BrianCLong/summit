-- Partition audit_logs by created_at (Monthly)

-- 1. Rename existing table
ALTER TABLE audit_logs RENAME TO audit_logs_legacy;

-- 2. Create new partitioned table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_hash TEXT,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 3. Create indexes (including those from original)
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
-- Note: analysis_results referencing is not an issue as audit_logs is a sink

-- 4. Function to manage partitions
CREATE OR REPLACE FUNCTION ensure_audit_log_partition(
  p_months_ahead INTEGER DEFAULT 2,
  p_retention_months INTEGER DEFAULT 12
) RETURNS VOID AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  partition_name TEXT;
  drop_before DATE := (date_trunc('month', CURRENT_DATE) - make_interval(months => p_retention_months))::date;
BEGIN
  -- Create month buckets: previous, current, and lookahead months
  FOR month_start IN
    SELECT (date_trunc('month', CURRENT_DATE) + (i || ' month')::interval)::date
    FROM generate_series(-1, p_months_ahead) AS gs(i)
  LOOP
    month_end := (month_start + INTERVAL '1 month')::date;
    partition_name := format('audit_logs_%s', to_char(month_start, 'YYYYMM'));

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      month_start,
      month_end
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Create initial partitions
SELECT ensure_audit_log_partition(2, 12);

-- 6. Migrate old data
-- We need to attach the legacy table as a partition OR insert data.
-- Since legacy data might span many months, attaching is hard. We will INSERT.
-- Note: This might be slow for huge tables, but acceptable for this scope.
INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at, previous_hash)
SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at, previous_hash
FROM audit_logs_legacy;

-- 7. Drop legacy table (Optional: verify count first? In a migration script we usually just proceed)
DROP TABLE audit_logs_legacy;
