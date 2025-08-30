-- Indexes to accelerate provenance/audit timelines and filters

-- audit_events classic shape
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_target_type_id';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_target_type_id ON audit_events (target_type, target_id);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_created_at';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_created_at ON audit_events (created_at DESC);
  END IF;
END $$;

-- audit_events extended shape
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_resource_type_id';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_resource_type_id ON audit_events (resource_type, resource_id);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_timestamp';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_timestamp ON audit_events (timestamp DESC);
  END IF;
END $$;

-- Tenant filter
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_tenant';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_tenant ON audit_events (tenant_id);
  END IF;
END $$;

-- JSONB GIN for text and reasonCode lookups
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_metadata_gin';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_metadata_gin ON audit_events USING GIN (metadata);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_resource_data_gin';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_resource_data_gin ON audit_events USING GIN (resource_data);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_new_values_gin';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_new_values_gin ON audit_events USING GIN (new_values);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_old_values_gin';
  IF NOT FOUND THEN
    CREATE INDEX idx_audit_events_old_values_gin ON audit_events USING GIN (old_values);
  END IF;
END $$;

-- provenance minimal
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_provenance_subject';
  IF NOT FOUND THEN
    CREATE INDEX idx_provenance_subject ON provenance (subject_type, subject_id);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_provenance_created_at';
  IF NOT FOUND THEN
    CREATE INDEX idx_provenance_created_at ON provenance (created_at DESC);
  END IF;
END $$;

