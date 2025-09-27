import { Pool } from 'pg';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS graph_visualization_preferences (
  user_id text PRIMARY KEY,
  tenant_id text,
  layout text NOT NULL,
  physics_enabled boolean NOT NULL DEFAULT true,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

export default async function migrate(pool?: Pool): Promise<void> {
  const client = pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await client.query(CREATE_TABLE_SQL);
  } finally {
    if (!pool) {
      await client.end();
    }
  }
}
