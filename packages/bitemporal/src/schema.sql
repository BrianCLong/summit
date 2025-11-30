-- Bitemporal table schema
-- Supports both valid time (business time) and transaction time (system time)

-- Create bitemporal table for a given entity type
-- This is a template; actual tables should be created per entity type

CREATE TABLE IF NOT EXISTS bitemporal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key TEXT NOT NULL,
  data JSONB NOT NULL,

  -- Valid time (business time): when the fact is true in the real world
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',

  -- Transaction time (system time): when the fact was recorded in the database
  tx_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tx_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',

  -- Audit fields
  created_by TEXT,
  modified_by TEXT,
  metadata JSONB,

  -- Ensure no overlapping valid time intervals for the same entity key and transaction time
  CONSTRAINT no_overlap_valid_time EXCLUDE USING gist (
    entity_key WITH =,
    tstzrange(valid_from, valid_to) WITH &&,
    tstzrange(tx_from, tx_to) WITH &&
  ),

  -- Indexes for temporal queries
  CHECK (valid_from < valid_to),
  CHECK (tx_from < tx_to)
);

-- Indexes for efficient temporal queries
CREATE INDEX IF NOT EXISTS idx_bitemporal_entities_key ON bitemporal_entities(entity_key);
CREATE INDEX IF NOT EXISTS idx_bitemporal_entities_valid_time ON bitemporal_entities USING gist(tstzrange(valid_from, valid_to));
CREATE INDEX IF NOT EXISTS idx_bitemporal_entities_tx_time ON bitemporal_entities USING gist(tstzrange(tx_from, tx_to));
CREATE INDEX IF NOT EXISTS idx_bitemporal_entities_combined ON bitemporal_entities(entity_key, valid_from, valid_to, tx_from, tx_to);

-- Audit log table
CREATE TABLE IF NOT EXISTS bitemporal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  valid_time TIMESTAMPTZ NOT NULL,
  tx_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  data JSONB NOT NULL,
  hash TEXT NOT NULL,
  signature TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  INDEX idx_audit_entity_key (entity_key),
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_tx_time (tx_time)
);

-- Function: Get current state (as of now)
CREATE OR REPLACE FUNCTION get_current_state(
  p_entity_key TEXT
)
RETURNS TABLE (
  id UUID,
  entity_key TEXT,
  data JSONB,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  tx_from TIMESTAMPTZ,
  tx_to TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.entity_key,
    t.data,
    t.valid_from,
    t.valid_to,
    t.tx_from,
    t.tx_to
  FROM bitemporal_entities t
  WHERE t.entity_key = p_entity_key
    AND NOW() BETWEEN t.valid_from AND t.valid_to
    AND NOW() BETWEEN t.tx_from AND t.tx_to;
END;
$$ LANGUAGE plpgsql;

-- Function: Get state as of specific valid and transaction time
CREATE OR REPLACE FUNCTION get_state_as_of(
  p_entity_key TEXT,
  p_valid_time TIMESTAMPTZ,
  p_tx_time TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  entity_key TEXT,
  data JSONB,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  tx_from TIMESTAMPTZ,
  tx_to TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.entity_key,
    t.data,
    t.valid_from,
    t.valid_to,
    t.tx_from,
    t.tx_to
  FROM bitemporal_entities t
  WHERE t.entity_key = p_entity_key
    AND p_valid_time BETWEEN t.valid_from AND t.valid_to
    AND p_tx_time BETWEEN t.tx_from AND t.tx_to;
END;
$$ LANGUAGE plpgsql;

-- Function: Get all versions of an entity
CREATE OR REPLACE FUNCTION get_all_versions(
  p_entity_key TEXT
)
RETURNS TABLE (
  id UUID,
  entity_key TEXT,
  data JSONB,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  tx_from TIMESTAMPTZ,
  tx_to TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.entity_key,
    t.data,
    t.valid_from,
    t.valid_to,
    t.tx_from,
    t.tx_to
  FROM bitemporal_entities t
  WHERE t.entity_key = p_entity_key
  ORDER BY t.valid_from DESC, t.tx_from DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Temporal upsert (inserts new version, closes old versions)
CREATE OR REPLACE FUNCTION temporal_upsert(
  p_entity_key TEXT,
  p_data JSONB,
  p_valid_from TIMESTAMPTZ,
  p_valid_to TIMESTAMPTZ DEFAULT '9999-12-31 23:59:59+00',
  p_user_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Close any overlapping records
  UPDATE bitemporal_entities
  SET tx_to = v_now
  WHERE entity_key = p_entity_key
    AND tx_to = '9999-12-31 23:59:59+00'
    AND tstzrange(valid_from, valid_to) && tstzrange(p_valid_from, p_valid_to);

  -- Insert new version
  INSERT INTO bitemporal_entities (
    entity_key,
    data,
    valid_from,
    valid_to,
    tx_from,
    tx_to,
    created_by,
    modified_by,
    metadata
  ) VALUES (
    p_entity_key,
    p_data,
    p_valid_from,
    p_valid_to,
    v_now,
    '9999-12-31 23:59:59+00',
    p_user_id,
    p_user_id,
    p_metadata
  )
  RETURNING id INTO v_new_id;

  -- Log to audit
  INSERT INTO bitemporal_audit_log (
    entity_key,
    operation,
    valid_time,
    tx_time,
    user_id,
    data,
    hash
  ) VALUES (
    p_entity_key,
    'UPDATE',
    p_valid_from,
    v_now,
    p_user_id,
    p_data,
    md5(p_data::TEXT)
  );

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;
