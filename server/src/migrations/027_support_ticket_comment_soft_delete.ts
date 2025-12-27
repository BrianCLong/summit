import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    ALTER TABLE support_ticket_comments
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_by text,
      ADD COLUMN IF NOT EXISTS delete_reason text;

    CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_deleted ON support_ticket_comments(deleted_at);

    CREATE TABLE IF NOT EXISTS support_ticket_comment_audits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL REFERENCES support_ticket_comments(id) ON DELETE CASCADE,
      action text NOT NULL,
      actor_id text,
      reason text,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_support_ticket_comment_audits_comment ON support_ticket_comment_audits(comment_id);
  `);
}
