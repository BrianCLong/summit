-- Bulk Operations Framework Support
-- 1. Idempotency tracking table

CREATE TABLE IF NOT EXISTS maestro.bulk_operations_ledger (
    request_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255),
    tenant_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failure', 'ignored')),
    result_code VARCHAR(100),
    result_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (request_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_bulk_ledger_idempotency ON maestro.bulk_operations_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bulk_ledger_tenant ON maestro.bulk_operations_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bulk_ledger_request_id ON maestro.bulk_operations_ledger(request_id);

COMMENT ON TABLE maestro.bulk_operations_ledger IS 'Tracks execution of bulk operations for idempotency and auditing';
