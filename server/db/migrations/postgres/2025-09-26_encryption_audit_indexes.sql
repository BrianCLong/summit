-- Optimize encryption audit queries for residency reporting

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_encryption_audit_tenant_classification_inc';
  IF NOT FOUND THEN
    CREATE INDEX idx_encryption_audit_tenant_classification_inc
      ON encryption_audit (tenant_id, classification_level)
      INCLUDE (compliant);
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_encryption_audit_tenant_noncompliant';
  IF NOT FOUND THEN
    CREATE INDEX idx_encryption_audit_tenant_noncompliant
      ON encryption_audit (tenant_id)
      WHERE NOT compliant;
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_encryption_audit_tenant_method_not_none';
  IF NOT FOUND THEN
    CREATE INDEX idx_encryption_audit_tenant_method_not_none
      ON encryption_audit (tenant_id)
      WHERE encryption_method <> 'none';
  END IF;
END $$;
