export async function up(db: any) {
  // 1. Create Tenants table
  await db.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      is_active BOOLEAN DEFAULT true,
      config JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Insert default 'global' tenant if not exists
  await db.query(`
    INSERT INTO tenants (id, name, plan)
    VALUES ('global', 'Global Tenant', 'enterprise')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 3. Update Users table (add default_tenant_id)
  // We make it nullable for now to support users without a default context,
  // but eventually should be required or derived from memberships.
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_tenant_id TEXT REFERENCES tenants(id);
  `);

  // 4. Create User-Tenant Memberships table
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_tenants (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      roles TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, tenant_id)
    );
  `);

  // 5. Backfill: Add all existing users to 'global' tenant with their existing role
  await db.query(`
    INSERT INTO user_tenants (user_id, tenant_id, roles)
    SELECT id, 'global', ARRAY[role]
    FROM users
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  `);

  // Set default tenant for existing users
  await db.query(`
    UPDATE users
    SET default_tenant_id = 'global'
    WHERE default_tenant_id IS NULL;
  `);
}

export async function down(db: any) {
  await db.query(`
    DROP TABLE IF EXISTS user_tenants;
    ALTER TABLE users DROP COLUMN IF EXISTS default_tenant_id;
    DROP TABLE IF EXISTS tenants;
  `);
}
