import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    -- Support ticket statuses enum
    DO $$ BEGIN
      CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Support ticket priorities enum
    DO $$ BEGIN
      CREATE TYPE support_ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Support ticket categories enum
    DO $$ BEGIN
      CREATE TYPE support_ticket_category AS ENUM ('bug', 'feature_request', 'question', 'incident', 'other');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Main support tickets table
    CREATE TABLE IF NOT EXISTS support_tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text NOT NULL,
      status support_ticket_status NOT NULL DEFAULT 'open',
      priority support_ticket_priority NOT NULL DEFAULT 'medium',
      category support_ticket_category NOT NULL DEFAULT 'other',
      reporter_id text NOT NULL,
      reporter_email text,
      assignee_id text,
      tags text[] DEFAULT '{}',
      metadata jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      resolved_at timestamptz,
      closed_at timestamptz
    );

    -- Support ticket comments
    CREATE TABLE IF NOT EXISTS support_ticket_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      author_id text NOT NULL,
      author_email text,
      content text NOT NULL,
      is_internal boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_reporter ON support_tickets(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON support_tickets(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket ON support_ticket_comments(ticket_id);
  `);
}
