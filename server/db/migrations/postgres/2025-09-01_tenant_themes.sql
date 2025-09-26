-- Tenant theming support
CREATE TABLE IF NOT EXISTS tenant_themes (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Summit Default',
  light JSONB NOT NULL DEFAULT '{}'::jsonb,
  dark JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_themes_updated_at_idx ON tenant_themes(updated_at DESC);

CREATE OR REPLACE FUNCTION set_tenant_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_themes_updated_at ON tenant_themes;
CREATE TRIGGER trg_tenant_themes_updated_at
BEFORE UPDATE ON tenant_themes
FOR EACH ROW
EXECUTE FUNCTION set_tenant_themes_updated_at();
