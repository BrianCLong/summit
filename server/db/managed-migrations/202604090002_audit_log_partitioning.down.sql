-- Revert audit_logs partitioning

-- 1. Create flat table
CREATE TABLE audit_logs_flat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_hash TEXT
);

-- 2. Restore indexes
CREATE INDEX idx_audit_logs_flat_user_id ON audit_logs_flat(user_id);
CREATE INDEX idx_audit_logs_flat_created_at ON audit_logs_flat(created_at);

-- 3. Copy data
INSERT INTO audit_logs_flat (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at, previous_hash)
SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at, previous_hash
FROM audit_logs;

-- 4. Swap tables
DROP TABLE audit_logs;
ALTER TABLE audit_logs_flat RENAME TO audit_logs;

-- 5. Cleanup functions
DROP FUNCTION IF EXISTS ensure_audit_log_partition(INTEGER, INTEGER);
