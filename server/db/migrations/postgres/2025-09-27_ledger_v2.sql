-- Maestro Conductor v24.4.0 - Provenance Ledger v2 Migration
-- Epic E18: Provenance Integrity & Crypto Evidence

-- Create the main provenance ledger table with hash chain
CREATE TABLE IF NOT EXISTS provenance_ledger_v2 (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    sequence_number BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'system', 'api', 'job')),
    payload JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    signature VARCHAR(512),
    attestation JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unique constraint to ensure sequence integrity per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_provenance_ledger_tenant_sequence
ON provenance_ledger_v2 (tenant_id, sequence_number);

-- Index for hash chain verification
CREATE INDEX IF NOT EXISTS idx_provenance_ledger_current_hash
ON provenance_ledger_v2 (current_hash);

CREATE INDEX IF NOT EXISTS idx_provenance_ledger_previous_hash
ON provenance_ledger_v2 (previous_hash);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_provenance_ledger_tenant_timestamp
ON provenance_ledger_v2 (tenant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_provenance_ledger_action_type
ON provenance_ledger_v2 (action_type, tenant_id);

CREATE INDEX IF NOT EXISTS idx_provenance_ledger_resource
ON provenance_ledger_v2 (resource_type, resource_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_provenance_ledger_actor
ON provenance_ledger_v2 (actor_id, tenant_id);

-- GIN index for payload and metadata JSON searches
CREATE INDEX IF NOT EXISTS idx_provenance_ledger_payload
ON provenance_ledger_v2 USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_provenance_ledger_metadata
ON provenance_ledger_v2 USING GIN (metadata);

-- Create the signed roots table
CREATE TABLE IF NOT EXISTS provenance_ledger_roots (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    root_hash VARCHAR(64) NOT NULL,
    start_sequence BIGINT NOT NULL,
    end_sequence BIGINT NOT NULL,
    entry_count INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    signature TEXT NOT NULL,
    cosign_bundle TEXT,
    merkle_proof JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for root verification
CREATE INDEX IF NOT EXISTS idx_provenance_roots_tenant_timestamp
ON provenance_ledger_roots (tenant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_provenance_roots_sequence_range
ON provenance_ledger_roots (tenant_id, start_sequence, end_sequence);

-- Create audit triggers table for tracking changes
CREATE TABLE IF NOT EXISTS provenance_ledger_audit (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_provenance_audit_table_record
ON provenance_ledger_audit (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_provenance_audit_timestamp
ON provenance_ledger_audit (changed_at DESC);

-- Function to validate hash chain integrity
CREATE OR REPLACE FUNCTION validate_hash_chain_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- For the first entry in a tenant chain, previous_hash should be genesis
    IF NEW.sequence_number = 1 THEN
        IF NEW.previous_hash != '0000000000000000000000000000000000000000000000000000000000000000' THEN
            RAISE EXCEPTION 'First entry must reference genesis hash';
        END IF;
    ELSE
        -- Verify the previous hash matches the last entry's current hash
        IF NOT EXISTS (
            SELECT 1 FROM provenance_ledger_v2
            WHERE tenant_id = NEW.tenant_id
            AND sequence_number = NEW.sequence_number - 1
            AND current_hash = NEW.previous_hash
        ) THEN
            RAISE EXCEPTION 'Hash chain broken: previous_hash does not match last entry';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate hash chain on insert
CREATE TRIGGER validate_hash_chain_trigger
    BEFORE INSERT ON provenance_ledger_v2
    FOR EACH ROW EXECUTE FUNCTION validate_hash_chain_entry();

-- Function to create audit trail
CREATE OR REPLACE FUNCTION create_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO provenance_ledger_audit (table_name, record_id, operation, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), current_user);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO provenance_ledger_audit (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO provenance_ledger_audit (table_name, record_id, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), current_user);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER audit_provenance_ledger_v2
    AFTER INSERT OR UPDATE OR DELETE ON provenance_ledger_v2
    FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

CREATE TRIGGER audit_provenance_ledger_roots
    AFTER INSERT OR UPDATE OR DELETE ON provenance_ledger_roots
    FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

-- Function to get chain statistics
CREATE OR REPLACE FUNCTION get_chain_statistics(p_tenant_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
    tenant_id VARCHAR,
    total_entries BIGINT,
    latest_sequence BIGINT,
    earliest_timestamp TIMESTAMP WITH TIME ZONE,
    latest_timestamp TIMESTAMP WITH TIME ZONE,
    chain_length_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pl.tenant_id,
        COUNT(*)::BIGINT as total_entries,
        MAX(pl.sequence_number) as latest_sequence,
        MIN(pl.timestamp) as earliest_timestamp,
        MAX(pl.timestamp) as latest_timestamp,
        EXTRACT(EPOCH FROM (MAX(pl.timestamp) - MIN(pl.timestamp))) / 3600 as chain_length_hours
    FROM provenance_ledger_v2 pl
    WHERE (p_tenant_id IS NULL OR pl.tenant_id = p_tenant_id)
    GROUP BY pl.tenant_id
    ORDER BY latest_sequence DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to verify hash chain integrity for a tenant
CREATE OR REPLACE FUNCTION verify_hash_chain(p_tenant_id VARCHAR)
RETURNS TABLE (
    sequence_number BIGINT,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    rec RECORD;
    prev_hash VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    expected_seq BIGINT := 1;
BEGIN
    FOR rec IN
        SELECT * FROM provenance_ledger_v2
        WHERE tenant_id = p_tenant_id
        ORDER BY sequence_number
    LOOP
        -- Check sequence continuity
        IF rec.sequence_number != expected_seq THEN
            sequence_number := rec.sequence_number;
            is_valid := FALSE;
            error_message := format('Expected sequence %s, got %s', expected_seq, rec.sequence_number);
            RETURN NEXT;
        -- Check hash chain
        ELSIF rec.previous_hash != prev_hash THEN
            sequence_number := rec.sequence_number;
            is_valid := FALSE;
            error_message := format('Expected previous hash %s, got %s', prev_hash, rec.previous_hash);
            RETURN NEXT;
        ELSE
            sequence_number := rec.sequence_number;
            is_valid := TRUE;
            error_message := NULL;
            RETURN NEXT;
        END IF;

        prev_hash := rec.current_hash;
        expected_seq := rec.sequence_number + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create view for chain health monitoring
CREATE OR REPLACE VIEW provenance_chain_health AS
SELECT
    tenant_id,
    COUNT(*) as total_entries,
    MAX(sequence_number) as latest_sequence,
    MIN(timestamp) as chain_start,
    MAX(timestamp) as chain_end,
    COUNT(DISTINCT DATE(timestamp)) as active_days,
    ROUND(AVG(LENGTH(payload::text))) as avg_payload_size,
    COUNT(*) FILTER (WHERE attestation IS NOT NULL) as attested_entries,
    COUNT(*) FILTER (WHERE signature IS NOT NULL) as signed_entries
FROM provenance_ledger_v2
GROUP BY tenant_id;

-- Create materialized view for performance (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS provenance_chain_stats AS
SELECT
    tenant_id,
    action_type,
    resource_type,
    DATE(timestamp) as date,
    COUNT(*) as entry_count,
    MAX(sequence_number) as max_sequence,
    MIN(sequence_number) as min_sequence
FROM provenance_ledger_v2
GROUP BY tenant_id, action_type, resource_type, DATE(timestamp);

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_provenance_chain_stats_unique
ON provenance_chain_stats (tenant_id, action_type, resource_type, date);

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT ON provenance_ledger_v2 TO readonly_user;
-- GRANT SELECT ON provenance_ledger_roots TO readonly_user;
-- GRANT SELECT ON provenance_chain_health TO readonly_user;
-- GRANT SELECT ON provenance_chain_stats TO readonly_user;

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_provenance_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY provenance_chain_stats;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE provenance_ledger_v2 IS 'Immutable provenance ledger with hash chain integrity';
COMMENT ON COLUMN provenance_ledger_v2.sequence_number IS 'Sequential number per tenant, starts at 1';
COMMENT ON COLUMN provenance_ledger_v2.previous_hash IS 'Hash of previous entry in chain (genesis hash for first entry)';
COMMENT ON COLUMN provenance_ledger_v2.current_hash IS 'SHA256 hash of this entry content';
COMMENT ON COLUMN provenance_ledger_v2.payload IS 'JSON payload containing action-specific data';
COMMENT ON COLUMN provenance_ledger_v2.metadata IS 'JSON metadata for context (IP, user agent, etc.)';
COMMENT ON COLUMN provenance_ledger_v2.attestation IS 'Optional cryptographic attestation data';

COMMENT ON TABLE provenance_ledger_roots IS 'Periodically signed Merkle roots for batch verification';
COMMENT ON COLUMN provenance_ledger_roots.root_hash IS 'Merkle root of entry hashes in the range';
COMMENT ON COLUMN provenance_ledger_roots.signature IS 'Cryptographic signature of the root hash';
COMMENT ON COLUMN provenance_ledger_roots.cosign_bundle IS 'Optional cosign signature bundle';

COMMENT ON FUNCTION verify_hash_chain(VARCHAR) IS 'Verifies the integrity of the hash chain for a tenant';
COMMENT ON FUNCTION get_chain_statistics(VARCHAR) IS 'Returns statistics about provenance chains';
COMMENT ON VIEW provenance_chain_health IS 'Monitoring view for provenance chain health metrics';