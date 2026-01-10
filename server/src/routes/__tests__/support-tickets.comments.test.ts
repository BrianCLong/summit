import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { Pool } from 'pg';

const ACTOR_ONE = 'support-comment-author';
const ACTOR_TWO = 'support-comment-other';

let getPostgresPool: () => Pool;
let supportRouter: express.Router;

const describeIf =
  process.env.RUN_ACCEPTANCE === 'true' ? describe : describe.skip;

async function ensureSoftDeleteColumns(pg: Pool) {
  await pg.query(`
    ALTER TABLE support_ticket_comments
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_by text,
      ADD COLUMN IF NOT EXISTS delete_reason text;

    CREATE TABLE IF NOT EXISTS support_ticket_comment_audits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL REFERENCES support_ticket_comments(id) ON DELETE CASCADE,
      action text NOT NULL,
      actor_id text,
      reason text,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );
  `);
}

async function createTicket(pg: Pool) {
  const { rows } = await pg.query(
    `INSERT INTO support_tickets (title, description, reporter_id, reporter_email)
     VALUES ('Comment lifecycle', 'Testing comment delete/restore', $1, 'author@example.test')
     RETURNING id`,
    [ACTOR_ONE],
  );
  return rows[0].id as string;
}

async function cleanupTicket(pg: Pool, ticketId: string) {
  await pg.query('DELETE FROM support_ticket_comment_audits WHERE comment_id IN (SELECT id FROM support_ticket_comments WHERE ticket_id = $1)', [ticketId]);
  await pg.query('DELETE FROM support_ticket_comments WHERE ticket_id = $1', [ticketId]);
  await pg.query('DELETE FROM support_tickets WHERE id = $1', [ticketId]);
}

describeIf('Support ticket comment safe delete lifecycle', () => {
  let app: express.Express;
  let pg: Pool;
  let ticketId: string;

  beforeAll(async () => {
    process.env.SAFE_DELETE = 'true';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
    process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
    process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
    process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'passwordpasswordpasswordpassword';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'this_is_a_dev_jwt_secret_value_123456';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'this_is_a_dev_refresh_secret_value_123456';

    ({ getPostgresPool } = await import('../../db/postgres.js'));
    const routerModule = await import('../support-tickets.js');
    supportRouter = (routerModule as any).default ?? (routerModule as any);

    pg = getPostgresPool();
    await ensureSoftDeleteColumns(pg);

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const idHeader = req.headers['x-user-id'];
      const roleHeader = req.headers['x-user-role'];
      if (idHeader) {
        (req as any).user = { id: idHeader, roles: roleHeader ? [roleHeader] : [] };
      }
      next();
    });
    app.use('/api/support', supportRouter);
  });

  beforeEach(async () => {
    ticketId = await createTicket(pg);
  });

  afterEach(async () => {
    await cleanupTicket(pg, ticketId);
  });

  afterAll(async () => {
    await pg.end();
    delete process.env.SAFE_DELETE;
  });

  it('soft deletes a comment, hides it from listings, and restores it', async () => {
    const createRes = await request(app)
      .post(`/api/support/tickets/${ticketId}/comments`)
      .set('x-user-id', ACTOR_ONE)
      .send({ content: 'Initial comment', isInternal: false });

    expect(createRes.status).toBe(201);
    const commentId = createRes.body.id as string;

    const listBefore = await request(app).get(`/api/support/tickets/${ticketId}/comments`);
    expect(listBefore.status).toBe(200);
    expect(Array.isArray(listBefore.body)).toBe(true);
    expect(listBefore.body).toHaveLength(1);

    const deleteRes = await request(app)
      .post(`/api/support/tickets/${ticketId}/comments/${commentId}/delete`)
      .set('x-user-id', ACTOR_ONE)
      .send({ reason: 'cleanup' });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.status).toBe('deleted');

    const listAfterDelete = await request(app).get(`/api/support/tickets/${ticketId}/comments`);
    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body).toHaveLength(0);

    const restoreRes = await request(app)
      .post(`/api/support/tickets/${ticketId}/comments/${commentId}/restore`)
      .set('x-user-id', ACTOR_ONE);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.status).toBe('restored');

    const listAfterRestore = await request(app).get(`/api/support/tickets/${ticketId}/comments`);
    expect(listAfterRestore.status).toBe(200);
    expect(listAfterRestore.body).toHaveLength(1);

    const audit = await pg.query('SELECT COUNT(*) as count FROM support_ticket_comment_audits WHERE comment_id = $1', [commentId]);
    expect(parseInt(audit.rows[0].count, 10)).toBeGreaterThanOrEqual(2);
  });

  it('enforces author or moderator permissions for deletion', async () => {
    const createRes = await request(app)
      .post(`/api/support/tickets/${ticketId}/comments`)
      .set('x-user-id', ACTOR_ONE)
      .send({ content: 'Owned comment' });
    const commentId = createRes.body.id as string;

    const forbidden = await request(app)
      .post(`/api/support/tickets/${ticketId}/comments/${commentId}/delete`)
      .set('x-user-id', ACTOR_TWO)
      .send({ reason: 'should not work' });
    expect(forbidden.status).toBe(403);

    const stillPresent = await request(app).get(`/api/support/tickets/${ticketId}/comments`);
    expect(stillPresent.body).toHaveLength(1);

    const allowed = await request(app)
      .post(`/api/support/tickets/${ticketId}/comments/${commentId}/delete`)
      .set('x-user-id', ACTOR_TWO)
      .set('x-user-role', 'admin')
      .send({ reason: 'moderator clean up' });
    expect(allowed.status).toBe(200);
  });
});
