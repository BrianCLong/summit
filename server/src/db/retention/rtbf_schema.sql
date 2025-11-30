-- RTBF and Retention Schema
-- This schema supports the retention and Right-To-Be-Forgotten (RTBF) engine
--
-- Tables:
-- 1. data_retention_records - Retention policies and schedules for datasets
-- 2. redaction_policies - Field-level redaction policies
-- 3. rtbf_requests - RTBF request lifecycle tracking
-- 4. provenance_tombstones - Cryptographic proofs of deleted data
-- 5. hash_stubs - Hash stubs for redacted fields
-- 6. provenance_chains - Provenance chains for RTBF operations

-- =============================================================================
-- Data Retention Records
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_retention_records (
    dataset_id TEXT PRIMARY KEY,
    metadata JSONB NOT NULL,
    policy JSONB NOT NULL,
    legal_hold JSONB,
    schedule JSONB,
    archive_history JSONB DEFAULT '[]'::jsonb,
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retention_records_last_evaluated
    ON data_retention_records(last_evaluated_at);

CREATE INDEX idx_retention_records_legal_hold
    ON data_retention_records((legal_hold IS NOT NULL))
    WHERE legal_hold IS NOT NULL;

COMMENT ON TABLE data_retention_records IS 'Tracks retention policies and schedules for datasets';
COMMENT ON COLUMN data_retention_records.metadata IS 'Dataset metadata including classification, jurisdictions, tags';
COMMENT ON COLUMN data_retention_records.policy IS 'Applied retention policy with retention days, purge grace period, etc.';
COMMENT ON COLUMN data_retention_records.legal_hold IS 'Legal hold information if active';
COMMENT ON COLUMN data_retention_records.schedule IS 'Purge schedule configuration';

-- =============================================================================
-- Redaction Policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS redaction_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    triggers JSONB NOT NULL DEFAULT '{}'::jsonb,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ,
    updated_by TEXT
);

CREATE INDEX idx_redaction_policies_enabled
    ON redaction_policies(enabled);

CREATE INDEX idx_redaction_policies_priority
    ON redaction_policies(priority DESC);

CREATE INDEX idx_redaction_policies_triggers_classification
    ON redaction_policies
    USING gin((triggers->'dataClassification'));

CREATE INDEX idx_redaction_policies_triggers_jurisdictions
    ON redaction_policies
    USING gin((triggers->'jurisdictions'));

COMMENT ON TABLE redaction_policies IS 'Field-level redaction policies';
COMMENT ON COLUMN redaction_policies.triggers IS 'Conditions that trigger this policy (classification, jurisdiction, tags)';
COMMENT ON COLUMN redaction_policies.rules IS 'Array of redaction rules with field patterns and operations';
COMMENT ON COLUMN redaction_policies.priority IS 'Priority for rule evaluation (higher = first)';

-- =============================================================================
-- RTBF Requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS rtbf_requests (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN (
        'submitted', 'validating', 'pending_approval', 'approved',
        'rejected', 'executing', 'completed', 'failed', 'cancelled'
    )),
    scope TEXT NOT NULL CHECK (scope IN (
        'user_data', 'dataset', 'entity', 'timerange', 'custom'
    )),
    requester JSONB NOT NULL,
    target JSONB NOT NULL,
    justification JSONB NOT NULL,
    approval JSONB,
    execution JSONB,
    deletion_type TEXT NOT NULL CHECK (deletion_type IN ('soft', 'hard')),
    use_redaction BOOLEAN DEFAULT false,
    redaction_policy_id TEXT REFERENCES redaction_policies(id),
    dry_run BOOLEAN DEFAULT false,
    dry_run_results JSONB,
    impact JSONB,
    audit_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rtbf_requests_state
    ON rtbf_requests(state);

CREATE INDEX idx_rtbf_requests_scope
    ON rtbf_requests(scope);

CREATE INDEX idx_rtbf_requests_requester
    ON rtbf_requests
    USING gin(requester);

CREATE INDEX idx_rtbf_requests_created_at
    ON rtbf_requests(created_at DESC);

CREATE INDEX idx_rtbf_requests_target_user_id
    ON rtbf_requests((target->>'userId'))
    WHERE target->>'userId' IS NOT NULL;

CREATE INDEX idx_rtbf_requests_target_dataset_ids
    ON rtbf_requests
    USING gin((target->'datasetIds'));

COMMENT ON TABLE rtbf_requests IS 'Right-To-Be-Forgotten request lifecycle tracking';
COMMENT ON COLUMN rtbf_requests.state IS 'Current state of the RTBF request';
COMMENT ON COLUMN rtbf_requests.scope IS 'Scope of data to be forgotten';
COMMENT ON COLUMN rtbf_requests.requester IS 'Who submitted the request';
COMMENT ON COLUMN rtbf_requests.target IS 'What data to forget (user ID, dataset IDs, etc.)';
COMMENT ON COLUMN rtbf_requests.justification IS 'Legal/business justification';
COMMENT ON COLUMN rtbf_requests.approval IS 'Approval workflow state';
COMMENT ON COLUMN rtbf_requests.execution IS 'Execution tracking (job IDs, timestamps)';
COMMENT ON COLUMN rtbf_requests.audit_events IS 'Complete audit trail for the request';

-- =============================================================================
-- Provenance Tombstones
-- =============================================================================

CREATE TABLE IF NOT EXISTS provenance_tombstones (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('entity', 'relationship', 'record')),
    resource_id TEXT NOT NULL,
    storage_system TEXT NOT NULL CHECK (storage_system IN (
        'postgres', 'neo4j', 's3', 'object-store', 'elasticsearch', 'blob'
    )),
    operation JSONB NOT NULL,
    proof JSONB NOT NULL,
    justification JSONB NOT NULL,
    provenance_chain_id TEXT,
    retain_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tombstones_resource
    ON provenance_tombstones(resource_type, resource_id);

CREATE INDEX idx_tombstones_storage_system
    ON provenance_tombstones(storage_system);

CREATE INDEX idx_tombstones_created_at
    ON provenance_tombstones(created_at DESC);

CREATE INDEX idx_tombstones_request_id
    ON provenance_tombstones((operation->>'requestId'));

CREATE INDEX idx_tombstones_retain_until
    ON provenance_tombstones(retain_until)
    WHERE retain_until IS NOT NULL;

-- Auto-delete expired tombstones
CREATE INDEX idx_tombstones_expired
    ON provenance_tombstones(retain_until)
    WHERE retain_until IS NOT NULL AND retain_until < NOW();

COMMENT ON TABLE provenance_tombstones IS 'Cryptographic proofs that data existed and was deleted';
COMMENT ON COLUMN provenance_tombstones.proof IS 'Cryptographic proof: contentHash, schemaHash, signature';
COMMENT ON COLUMN provenance_tombstones.justification IS 'Legal justification for deletion';
COMMENT ON COLUMN provenance_tombstones.retain_until IS 'When this tombstone itself can be deleted';

-- =============================================================================
-- Hash Stubs
-- =============================================================================

CREATE TABLE IF NOT EXISTS hash_stubs (
    id TEXT PRIMARY KEY,
    field_name TEXT NOT NULL,
    field_path TEXT NOT NULL,
    value_hash TEXT NOT NULL,
    value_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    storage_system TEXT NOT NULL CHECK (storage_system IN (
        'postgres', 'neo4j', 's3', 'object-store', 'elasticsearch', 'blob'
    )),
    operation JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hash_stubs_resource
    ON hash_stubs(resource_id, storage_system);

CREATE INDEX idx_hash_stubs_field_path
    ON hash_stubs(field_path);

CREATE INDEX idx_hash_stubs_created_at
    ON hash_stubs(created_at DESC);

CREATE INDEX idx_hash_stubs_request_id
    ON hash_stubs((operation->>'requestId'));

COMMENT ON TABLE hash_stubs IS 'Hash stubs for redacted fields to maintain provenance';
COMMENT ON COLUMN hash_stubs.field_path IS 'Full path to field (e.g., user.profile.email)';
COMMENT ON COLUMN hash_stubs.value_hash IS 'One-way hash of original value';

-- =============================================================================
-- Provenance Chains
-- =============================================================================

CREATE TABLE IF NOT EXISTS provenance_chains (
    chain_id TEXT PRIMARY KEY,
    source JSONB NOT NULL,
    assertions JSONB NOT NULL DEFAULT '[]'::jsonb,
    transforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    chain_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provenance_chains_created_at
    ON provenance_chains(created_at DESC);

CREATE INDEX idx_provenance_chains_source_id
    ON provenance_chains((source->>'sourceId'));

COMMENT ON TABLE provenance_chains IS 'Cryptographic provenance chains for RTBF operations';
COMMENT ON COLUMN provenance_chains.source IS 'Source of the data';
COMMENT ON COLUMN provenance_chains.assertions IS 'Assertions about the operation';
COMMENT ON COLUMN provenance_chains.transforms IS 'Transforms applied (RTBF operations)';
COMMENT ON COLUMN provenance_chains.chain_hash IS 'Cryptographic hash of entire chain';

-- =============================================================================
-- Functions and Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_retention_records_updated_at
    BEFORE UPDATE ON data_retention_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_redaction_policies_updated_at
    BEFORE UPDATE ON redaction_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rtbf_requests_updated_at
    BEFORE UPDATE ON rtbf_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Views for Reporting
-- =============================================================================

-- Active RTBF requests
CREATE OR REPLACE VIEW active_rtbf_requests AS
SELECT
    id,
    state,
    scope,
    requester->>'userId' as requester_user_id,
    requester->>'type' as requester_type,
    deletion_type,
    use_redaction,
    dry_run,
    impact->>'estimatedRecordCount' as estimated_records,
    created_at,
    updated_at
FROM rtbf_requests
WHERE state NOT IN ('completed', 'failed', 'cancelled', 'rejected')
ORDER BY created_at DESC;

-- Datasets with active legal holds
CREATE OR REPLACE VIEW datasets_with_legal_holds AS
SELECT
    dataset_id,
    metadata->>'name' as dataset_name,
    policy->>'classificationLevel' as classification,
    legal_hold->>'reason' as hold_reason,
    legal_hold->>'requestedBy' as hold_requested_by,
    (legal_hold->>'createdAt')::timestamptz as hold_created_at,
    (legal_hold->>'expiresAt')::timestamptz as hold_expires_at,
    created_at,
    updated_at
FROM data_retention_records
WHERE legal_hold IS NOT NULL
  AND (legal_hold->>'expiresAt' IS NULL
       OR (legal_hold->>'expiresAt')::timestamptz > NOW())
ORDER BY (legal_hold->>'createdAt')::timestamptz DESC;

-- Tombstone audit trail
CREATE OR REPLACE VIEW tombstone_audit_trail AS
SELECT
    t.id as tombstone_id,
    t.resource_type,
    t.resource_id,
    t.storage_system,
    t.operation->>'type' as operation_type,
    t.operation->>'requestId' as request_id,
    t.operation->>'jobId' as job_id,
    t.operation->>'executedBy' as executed_by,
    (t.operation->>'executedAt')::timestamptz as executed_at,
    t.justification->>'legalBasis' as legal_basis,
    t.justification->>'jurisdiction' as jurisdiction,
    t.proof->>'contentHash' as content_hash,
    t.proof->>'signature' as signature,
    t.created_at,
    r.state as request_state,
    r.requester->>'type' as requester_type
FROM provenance_tombstones t
LEFT JOIN rtbf_requests r ON r.id = (t.operation->>'requestId')
ORDER BY t.created_at DESC;

-- RTBF request statistics
CREATE OR REPLACE VIEW rtbf_request_statistics AS
SELECT
    state,
    scope,
    deletion_type,
    COUNT(*) as request_count,
    COUNT(*) FILTER (WHERE dry_run = true) as dry_run_count,
    AVG((impact->>'estimatedRecordCount')::int) as avg_records_affected,
    MIN(created_at) as earliest_request,
    MAX(created_at) as latest_request
FROM rtbf_requests
GROUP BY state, scope, deletion_type;

COMMENT ON VIEW active_rtbf_requests IS 'Currently active RTBF requests (not completed/failed/cancelled)';
COMMENT ON VIEW datasets_with_legal_holds IS 'Datasets with active legal holds';
COMMENT ON VIEW tombstone_audit_trail IS 'Audit trail of all deletions with tombstone proofs';
COMMENT ON VIEW rtbf_request_statistics IS 'Statistics on RTBF requests by state and scope';

-- =============================================================================
-- Grants (adjust as needed for your environment)
-- =============================================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
