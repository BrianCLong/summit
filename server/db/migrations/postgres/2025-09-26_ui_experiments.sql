CREATE TABLE IF NOT EXISTS ui_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  variations JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_ui_experiments_feature_key ON ui_experiments (feature_key);
CREATE INDEX IF NOT EXISTS idx_ui_experiments_active ON ui_experiments (is_active);

INSERT INTO ui_experiments (tenant_id, feature_key, description, is_active, variations)
VALUES
  (
    'default_tenant',
    'dashboard-layout',
    'Experiment comparing legacy dashboard layout with compact variant',
    TRUE,
    '[
      {"name":"control","weight":0.5,"config":{"layout":"legacy"}},
      {"name":"compact","weight":0.5,"config":{"layout":"compact","highlight":"activity-first"}}
    ]'::jsonb
  )
ON CONFLICT (tenant_id, feature_key) DO UPDATE
  SET description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      variations = EXCLUDED.variations,
      updated_at = NOW();
