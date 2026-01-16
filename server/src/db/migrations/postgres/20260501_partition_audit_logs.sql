BEGIN;

-- 1. Rename existing table
ALTER TABLE audit_logs RENAME TO audit_logs_legacy;

-- 2. Create new partitioned table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (created_at, id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) PARTITION BY RANGE (created_at);

-- 3. Create a default partition for historical/mismatched data
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- 4. Create current month partition (example for when this runs)
-- We rely on the app to create future partitions, but good to have one to start
CREATE TABLE audit_logs_p2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- 5. Migrate data
INSERT INTO audit_logs (
    id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
)
SELECT
    id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
FROM audit_logs_legacy;

-- 6. Recreate Indexes
CREATE INDEX idx_audit_logs_user_id_partitioned ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at_partitioned ON audit_logs(created_at);

-- 7. Cleanup
-- DROP TABLE audit_logs_legacy;

COMMIT;
