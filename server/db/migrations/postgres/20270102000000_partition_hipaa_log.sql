-- Partitioning implementation for HIPAA Logs
-- Migration: 20270102000000_partition_hipaa_log

BEGIN;

-- 1. Rename existing table
ALTER TABLE hipaa_phi_access_log RENAME TO hipaa_phi_access_log_legacy;

-- 2. Create new partitioned table
-- Note: Primary key must include partition key (tenant_id)
CREATE TABLE hipaa_phi_access_log (
  access_id UUID DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- PHI resource
  phi_type VARCHAR(100) NOT NULL,
  phi_id VARCHAR(255) NOT NULL,
  phi_classification VARCHAR(50) NOT NULL DEFAULT 'PHI',

  -- Access details
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN (
    'view', 'create', 'update', 'delete', 'export', 'print', 'download', 'transmit'
  )),
  access_purpose VARCHAR(100) NOT NULL,

  -- User context
  user_id VARCHAR(255) NOT NULL,
  user_role VARCHAR(100) NOT NULL,
  user_npi VARCHAR(20),

  -- Authorization
  authorization_type VARCHAR(100) NOT NULL,
  authorization_reference VARCHAR(255),
  patient_consent_id VARCHAR(255),

  -- Minimum necessary determination
  minimum_necessary_justification TEXT NOT NULL,
  data_elements_accessed TEXT[] NOT NULL,

  -- Session context
  ip_address INET NOT NULL,
  user_agent TEXT,
  session_id VARCHAR(255),
  workstation_id VARCHAR(255),

  -- Encryption verification
  data_encrypted_at_rest BOOLEAN NOT NULL DEFAULT true,
  data_encrypted_in_transit BOOLEAN NOT NULL DEFAULT true,
  encryption_algorithm VARCHAR(100),

  -- Audit metadata
  access_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_duration_ms INTEGER,

  -- Security incident tracking
  security_incident_flagged BOOLEAN DEFAULT false,
  incident_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (access_id, tenant_id)
) PARTITION BY LIST (tenant_id);

-- 3. Recreate Indexes
CREATE INDEX idx_hipaa_tenant ON hipaa_phi_access_log(tenant_id);
CREATE INDEX idx_hipaa_phi ON hipaa_phi_access_log(phi_type, phi_id);
CREATE INDEX idx_hipaa_user ON hipaa_phi_access_log(user_id);
CREATE INDEX idx_hipaa_timestamp ON hipaa_phi_access_log(access_timestamp DESC);
CREATE INDEX idx_hipaa_incident ON hipaa_phi_access_log(security_incident_flagged) WHERE security_incident_flagged = true;

-- 4. Triggers (Immutable)
-- Re-use prevent_event_store_modification function
CREATE TRIGGER prevent_hipaa_log_update
  BEFORE UPDATE ON hipaa_phi_access_log
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

CREATE TRIGGER prevent_hipaa_log_delete
  BEFORE DELETE ON hipaa_phi_access_log
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

-- 5. Partition Maintenance Function
CREATE OR REPLACE FUNCTION ensure_hipaa_log_partition(
    p_tenant_id VARCHAR
)
RETURNS VOID AS $$
DECLARE
    v_partition_name VARCHAR;
BEGIN
    -- Sanitize tenant_id for table name
    v_partition_name := 'hipaa_phi_access_log_' || lower(regexp_replace(p_tenant_id, '[^a-zA-Z0-9]', '_', 'g'));

    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = v_partition_name
        AND n.nspname = 'public'
    ) THEN
        -- Create partition for the tenant
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF hipaa_phi_access_log FOR VALUES IN (%L)',
            v_partition_name,
            p_tenant_id
        );

        RAISE NOTICE 'Created partition % for tenant %', v_partition_name, p_tenant_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to iterate all tenants and ensure partitions
CREATE OR REPLACE FUNCTION ensure_hipaa_log_partitions_for_all()
RETURNS INTEGER AS $$
DECLARE
    v_tenant_record RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Find tenants from legacy store or event store or other source
    -- We use event_store_legacy or hipaa_phi_access_log_legacy as source of truth for existing tenants
    FOR v_tenant_record IN
        SELECT DISTINCT tenant_id FROM hipaa_phi_access_log_legacy WHERE tenant_id IS NOT NULL
        UNION
        SELECT DISTINCT tenant_id FROM event_store_legacy WHERE tenant_id IS NOT NULL
    LOOP
        PERFORM ensure_hipaa_log_partition(v_tenant_record.tenant_id);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Initial Partition Creation and Data Migration
SELECT ensure_hipaa_log_partitions_for_all();

INSERT INTO hipaa_phi_access_log (
  access_id, tenant_id, phi_type, phi_id, phi_classification,
  access_type, access_purpose, user_id, user_role, user_npi,
  authorization_type, authorization_reference, patient_consent_id,
  minimum_necessary_justification, data_elements_accessed,
  ip_address, user_agent, session_id, workstation_id,
  data_encrypted_at_rest, data_encrypted_in_transit, encryption_algorithm,
  access_timestamp, access_duration_ms, security_incident_flagged, incident_reason,
  created_at
)
SELECT
  access_id, tenant_id, phi_type, phi_id, phi_classification,
  access_type, access_purpose, user_id, user_role, user_npi,
  authorization_type, authorization_reference, patient_consent_id,
  minimum_necessary_justification, data_elements_accessed,
  ip_address, user_agent, session_id, workstation_id,
  data_encrypted_at_rest, data_encrypted_in_transit, encryption_algorithm,
  access_timestamp, access_duration_ms, security_incident_flagged, incident_reason,
  created_at
FROM hipaa_phi_access_log_legacy
ON CONFLICT DO NOTHING;

COMMENT ON TABLE hipaa_phi_access_log IS 'HIPAA-compliant PHI access log partitioned by tenant';

COMMIT;
