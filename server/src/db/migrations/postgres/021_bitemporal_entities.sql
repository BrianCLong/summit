-- NO_TRANSACTION
-- Task #109: Bitemporal Knowledge Repository
-- Provides unified storage for entities with valid_time and transaction_time dimensions.

CREATE TABLE IF NOT EXISTS bitemporal_entities (
    id UUID NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    kind VARCHAR(100) NOT NULL,
    props JSONB NOT NULL DEFAULT '{}',
    
    -- Valid Time (When the fact was true in the real world)
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
    
    -- Transaction Time (When the fact was recorded in our system)
    transaction_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
    
    created_by VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (id, transaction_from, valid_from)
);

-- Indexes for Time-Travel Queries
CREATE INDEX IF NOT EXISTS idx_bitemporal_lookup ON bitemporal_entities (id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_bitemporal_valid_range ON bitemporal_entities (valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_bitemporal_transaction_range ON bitemporal_entities (transaction_from, transaction_to);
CREATE INDEX IF NOT EXISTS idx_bitemporal_current ON bitemporal_entities (id, tenant_id) 
WHERE transaction_to = '9999-12-31 23:59:59+00' AND valid_to = '9999-12-31 23:59:59+00';
