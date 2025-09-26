-- Multi-tenancy enablement for Summit backend
-- Introduces tenant metadata and schema isolation helpers

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  schema_name TEXT NOT NULL,
  neo4j_namespace TEXT NOT NULL,
  display_name TEXT,
  opa_policy_tag TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_schema_name ON tenants(schema_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_neo4j_namespace ON tenants(neo4j_namespace);

CREATE OR REPLACE FUNCTION format_tenant_schema(p_tenant_id TEXT)
RETURNS TEXT AS
$$
DECLARE
  normalized TEXT := regexp_replace(lower(p_tenant_id), '[^a-z0-9]+', '_', 'g');
BEGIN
  RETURN 'tenant_' || normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION ensure_tenant_schema(p_tenant_id TEXT)
RETURNS TEXT AS
$$
DECLARE
  schema_name TEXT := format_tenant_schema(p_tenant_id);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = schema_name
  ) THEN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Ensure tenant scoped tables exist by cloning canonical definitions
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = schema_name AND table_name = 'entities'
    ) THEN
      EXECUTE format('CREATE TABLE %I.entities (LIKE public.entities INCLUDING ALL)', schema_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = schema_name AND table_name = 'relationships'
    ) THEN
      EXECUTE format('CREATE TABLE %I.relationships (LIKE public.relationships INCLUDING ALL)', schema_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = schema_name AND table_name = 'investigations'
    ) THEN
      EXECUTE format('CREATE TABLE %I.investigations (LIKE public.investigations INCLUDING ALL)', schema_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = schema_name AND table_name = 'provenance'
    ) THEN
      EXECUTE format('CREATE TABLE %I.provenance (LIKE public.provenance INCLUDING ALL)', schema_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = schema_name AND table_name = 'outbox_events'
    ) THEN
      EXECUTE format('CREATE TABLE %I.outbox_events (LIKE public.outbox_events INCLUDING ALL)', schema_name);
    END IF;
  END IF;

  INSERT INTO tenants (id, schema_name, neo4j_namespace, updated_at)
  VALUES (
    p_tenant_id,
    schema_name,
    schema_name,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    schema_name = EXCLUDED.schema_name,
    neo4j_namespace = EXCLUDED.neo4j_namespace,
    updated_at = now();

  RETURN schema_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_tenant_search_path(p_tenant_id TEXT)
RETURNS TEXT AS
$$
DECLARE
  schema_name TEXT;
BEGIN
  schema_name := ensure_tenant_schema(p_tenant_id);
  EXECUTE format('SET LOCAL search_path TO %I, public', schema_name);
  RETURN schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ensure_tenant_schema(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION set_tenant_search_path(TEXT) TO PUBLIC;
