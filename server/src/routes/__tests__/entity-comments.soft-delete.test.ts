import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { newDb } from 'pg-mem';
import { opaClient } from '../../services/opa-client.js';
import entityCommentsRouter from '../entity-comments.js';

const memDb = newDb({ noAstCoverageCheck: true });
memDb.public.registerFunction({
  name: 'gen_random_uuid',
  returns: 'uuid' as any,
  implementation: randomUUID,
});
const { Pool: MemPool } = memDb.adapters.createPg();
const pg = new MemPool();

jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: () => pg,
}));
jest.mock('../../audit/emit.js', () => ({
  emitAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

const TENANT = 'tenant-soft-delete';
const ACTOR_ONE = 'entity-comment-owner';
const ACTOR_TWO = 'entity-comment-other';
const ENTITY_ID = 'entity-for-comments';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('Entity comment soft delete lifecycle', () => {
  let app: express.Express;
  let checkAccessMock: jest.Mock;
  const originalCheckAccess = opaClient.checkDataAccess;

  async function ensureSoftDeleteSchema() {
    await pg.query(`
      CREATE SCHEMA IF NOT EXISTS maestro;
      CREATE TABLE IF NOT EXISTS maestro.entity_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar(255) NOT NULL,
        entity_id varchar(255) NOT NULL,
        entity_ref_id uuid,
        entity_type varchar(100),
        entity_label varchar(500),
        author_id varchar(255) NOT NULL,
        content_markdown text NOT NULL,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz,
        deleted_by text,
        delete_reason text
      );

      CREATE TABLE IF NOT EXISTS maestro.entity_comment_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id uuid NOT NULL REFERENCES maestro.entity_comments(id) ON DELETE CASCADE,
        file_name text NOT NULL,
        content_type text,
        size_bytes integer,
        storage_uri text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS maestro.entity_comment_mentions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id uuid NOT NULL REFERENCES maestro.entity_comments(id) ON DELETE CASCADE,
        mentioned_user_id varchar(255) NOT NULL,
        mentioned_username varchar(100) NOT NULL,
        created_at timestamptz DEFAULT now(),
        UNIQUE(comment_id, mentioned_user_id)
      );

      CREATE TABLE IF NOT EXISTS maestro.entity_comment_audits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id uuid NOT NULL REFERENCES maestro.entity_comments(id) ON DELETE CASCADE,
        tenant_id varchar(255) NOT NULL,
        action text NOT NULL,
        actor_id text,
        reason text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );
    `);
  }

  async function cleanupComments() {
    await pg.query('DELETE FROM maestro.entity_comment_audits WHERE tenant_id = $1', [TENANT]);
    await pg.query('DELETE FROM maestro.entity_comment_mentions WHERE comment_id IN (SELECT id FROM maestro.entity_comments WHERE tenant_id = $1)', [TENANT]);
    await pg.query('DELETE FROM maestro.entity_comment_attachments WHERE comment_id IN (SELECT id FROM maestro.entity_comments WHERE tenant_id = $1)', [TENANT]);
    await pg.query('DELETE FROM maestro.entity_comments WHERE tenant_id = $1', [TENANT]);
  }

  beforeAll(async () => {
    process.env.SAFE_DELETE = 'true';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
    process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
    process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
    process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'passwordpasswordpasswordpassword';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'this_is_a_dev_jwt_secret_value_123456';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'this_is_a_dev_refresh_secret_value_123456';
    await ensureSoftDeleteSchema();

    app = express();
    app.use(express.json());
    app.use('/api/entities', entityCommentsRouter);

    checkAccessMock = jest.fn().mockResolvedValue(true);
    (opaClient as any).checkDataAccess = checkAccessMock;
  });

  beforeEach(async () => {
    await cleanupComments();
  });

  afterAll(async () => {
    await cleanupComments();
    await pg.end();
    delete process.env.SAFE_DELETE;
    (opaClient as any).checkDataAccess = originalCheckAccess;
  });

  const createComment = async (userId = ACTOR_ONE) => {
    const res = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', userId)
      .send({ content: 'hello world', entityType: 'demo', entityLabel: 'Demo' });

    expect(res.status).toBe(201);
    return res.body.id as string;
  };

  it('soft deletes, hides, and restores entity comments with audits', async () => {
    const commentId = await createComment();

    const listBefore = await request(app)
      .get(`/api/entities/${ENTITY_ID}/comments`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_ONE);
    expect(listBefore.status).toBe(200);
    expect(listBefore.body).toHaveLength(1);

    const deleteRes = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_ONE)
      .send({ reason: 'cleanup' });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.status).toBe('deleted');
    expect(deleteRes.body.comment.deletedAt).toBeTruthy();

    const listAfterDelete = await request(app)
      .get(`/api/entities/${ENTITY_ID}/comments`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_ONE);
    expect(listAfterDelete.body).toHaveLength(0);

    const listWithDeleted = await request(app)
      .get(`/api/entities/${ENTITY_ID}/comments?includeDeleted=true`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_ONE);
    expect(listWithDeleted.body).toHaveLength(1);
    expect(listWithDeleted.body[0].deleteReason).toBe('cleanup');

    const restoreRes = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/restore`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_ONE);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.status).toBe('restored');
    expect(restoreRes.body.comment.deletedAt).toBeFalsy();

    const listAfterRestore = await request(app)
      .get(`/api/entities/${ENTITY_ID}/comments`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_ONE);
    expect(listAfterRestore.body).toHaveLength(1);

    const auditCount = await pg.query(
      'SELECT COUNT(*) as count FROM maestro.entity_comment_audits WHERE comment_id = $1',
      [commentId],
    );
    expect(parseInt(auditCount.rows[0].count, 10)).toBeGreaterThanOrEqual(2);
  });

  it('enforces permissions for delete and restore', async () => {
    const commentId = await createComment();

    checkAccessMock.mockImplementation((_, __, ___, action) => {
      if (action === 'comment:delete' || action === 'comment:restore') {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    });

    const forbidden = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_TWO)
      .send({ reason: 'not allowed' });
    expect(forbidden.status).toBe(403);

    const allowedWithPolicy = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_TWO)
      .send({ reason: 'now allowed' });
    expect(allowedWithPolicy.status).toBe(403);

    checkAccessMock.mockResolvedValue(true);

    const allowedAfterPolicy = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_TWO)
      .send({ reason: 'policy grant' });
    expect(allowedAfterPolicy.status).toBe(200);

    const restoreAllowed = await request(app)
      .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/restore`)
      .set('x-tenant-id', TENANT)
      .set('x-user-id', ACTOR_TWO);
    expect(restoreAllowed.status).toBe(200);
  });
});
