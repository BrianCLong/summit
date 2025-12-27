export async function up(db: any) {
  // Feature Flags Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      key TEXT PRIMARY KEY,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('boolean', 'string', 'number', 'json')),
      enabled BOOLEAN NOT NULL DEFAULT false,
      rollout_rules JSONB DEFAULT '[]'::jsonb,
      default_value JSONB,
      variations JSONB DEFAULT '[]'::jsonb,
      tenant_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Feature Flag Audit Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS feature_flag_audit (
      id SERIAL PRIMARY KEY,
      flag_key TEXT NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
      action TEXT NOT NULL,
      changed_by TEXT,
      old_value JSONB,
      new_value JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Indexes
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant_id ON feature_flags(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_key ON feature_flag_audit(flag_key);
    CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_created_at ON feature_flag_audit(created_at);
  `);
}

export async function down(db: any) {
  await db.query(`DROP TABLE IF EXISTS feature_flag_audit;`);
  await db.query(`DROP TABLE IF EXISTS feature_flags;`);
}
