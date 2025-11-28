-- Harden IntelGraph schema with relational guarantees and optimized indexes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'artifact_plan_fk'
      AND table_name = 'artifact'
  ) THEN
    ALTER TABLE artifact
      ADD CONSTRAINT artifact_plan_fk FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_plan_fk'
      AND table_name = 'task'
  ) THEN
    ALTER TABLE task
      ADD CONSTRAINT task_plan_fk FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_tenant_fk'
      AND table_name = 'task'
  ) THEN
    ALTER TABLE task
      ADD CONSTRAINT task_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_plan_tenant_fk'
      AND table_name = 'task'
  ) THEN
    ALTER TABLE task
      ADD CONSTRAINT task_plan_tenant_fk FOREIGN KEY (plan_id, tenant_id) REFERENCES plan(id, tenant_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'plan_tenant_fk'
      AND table_name = 'plan'
  ) THEN
    ALTER TABLE plan
      ADD CONSTRAINT plan_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'plan_id_tenant_unique'
      AND table_name = 'plan'
  ) THEN
    ALTER TABLE plan
      ADD CONSTRAINT plan_id_tenant_unique UNIQUE (id, tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'policy_tenant_fk'
      AND table_name = 'policy'
  ) THEN
    ALTER TABLE policy
      ADD CONSTRAINT policy_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'artifact_plan_tenant_fk'
      AND table_name = 'artifact'
  ) THEN
    ALTER TABLE artifact
      ADD CONSTRAINT artifact_plan_tenant_fk FOREIGN KEY (plan_id, tenant_id) REFERENCES plan(id, tenant_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_tenant_name_version
  ON policy(tenant_id, name, version);
CREATE INDEX IF NOT EXISTS idx_policy_tenant_created_at
  ON policy(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifact_tenant_plan
  ON artifact(tenant_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_artifact_kind_hash
  ON artifact(kind, artifact_hash);
CREATE INDEX IF NOT EXISTS idx_plan_tenant_status
  ON plan(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_task_plan_status
  ON task(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role
  ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_app_user_tenant
  ON app_user(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_tenant_name_version
  ON model(tenant_id, name, version);
CREATE INDEX IF NOT EXISTS idx_eval_model_tenant
  ON eval(model_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_tenant_kind
  ON asset(tenant_id, kind);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'policy_name_not_empty'
      AND table_name = 'policy'
  ) THEN
    ALTER TABLE policy
      ADD CONSTRAINT policy_name_not_empty CHECK (btrim(name) <> '');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'artifact_uri_not_empty'
      AND table_name = 'artifact'
  ) THEN
    ALTER TABLE artifact
      ADD CONSTRAINT artifact_uri_not_empty CHECK (btrim(uri) <> '');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'policy_version_not_empty'
      AND table_name = 'policy'
  ) THEN
    ALTER TABLE policy
      ADD CONSTRAINT policy_version_not_empty CHECK (btrim(version) <> '');
  END IF;
END $$;
