"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
const pg_mem_1 = require("pg-mem");
const opa_client_js_1 = require("../../services/opa-client.js");
const entity_comments_js_1 = __importDefault(require("../entity-comments.js"));
const memDb = (0, pg_mem_1.newDb)({ noAstCoverageCheck: true });
memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: 'uuid',
    implementation: crypto_1.randomUUID,
});
const { Pool: MemPool } = memDb.adapters.createPg();
const pg = new MemPool();
globals_1.jest.mock('../../db/postgres.js', () => ({
    getPostgresPool: () => pg,
}));
globals_1.jest.mock('../../audit/emit.js', () => ({
    emitAuditEvent: globals_1.jest.fn().mockResolvedValue(undefined),
}));
const TENANT = 'tenant-soft-delete';
const ACTOR_ONE = 'entity-comment-owner';
const ACTOR_TWO = 'entity-comment-other';
const ENTITY_ID = 'entity-for-comments';
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Entity comment soft delete lifecycle', () => {
    let app;
    let checkAccessMock;
    const originalCheckAccess = opa_client_js_1.opaClient.checkDataAccess;
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
    (0, globals_1.beforeAll)(async () => {
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
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/entities', entity_comments_js_1.default);
        checkAccessMock = globals_1.jest.fn().mockResolvedValue(true);
        opa_client_js_1.opaClient.checkDataAccess = checkAccessMock;
    });
    (0, globals_1.beforeEach)(async () => {
        await cleanupComments();
    });
    (0, globals_1.afterAll)(async () => {
        await cleanupComments();
        await pg.end();
        delete process.env.SAFE_DELETE;
        opa_client_js_1.opaClient.checkDataAccess = originalCheckAccess;
    });
    const createComment = async (userId = ACTOR_ONE) => {
        const res = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', userId)
            .send({ content: 'hello world', entityType: 'demo', entityLabel: 'Demo' });
        (0, globals_1.expect)(res.status).toBe(201);
        return res.body.id;
    };
    (0, globals_1.it)('soft deletes, hides, and restores entity comments with audits', async () => {
        const commentId = await createComment();
        const listBefore = await (0, supertest_1.default)(app)
            .get(`/api/entities/${ENTITY_ID}/comments`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_ONE);
        (0, globals_1.expect)(listBefore.status).toBe(200);
        (0, globals_1.expect)(listBefore.body).toHaveLength(1);
        const deleteRes = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_ONE)
            .send({ reason: 'cleanup' });
        (0, globals_1.expect)(deleteRes.status).toBe(200);
        (0, globals_1.expect)(deleteRes.body.status).toBe('deleted');
        (0, globals_1.expect)(deleteRes.body.comment.deletedAt).toBeTruthy();
        const listAfterDelete = await (0, supertest_1.default)(app)
            .get(`/api/entities/${ENTITY_ID}/comments`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_ONE);
        (0, globals_1.expect)(listAfterDelete.body).toHaveLength(0);
        const listWithDeleted = await (0, supertest_1.default)(app)
            .get(`/api/entities/${ENTITY_ID}/comments?includeDeleted=true`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_ONE);
        (0, globals_1.expect)(listWithDeleted.body).toHaveLength(1);
        (0, globals_1.expect)(listWithDeleted.body[0].deleteReason).toBe('cleanup');
        const restoreRes = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/restore`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_ONE);
        (0, globals_1.expect)(restoreRes.status).toBe(200);
        (0, globals_1.expect)(restoreRes.body.status).toBe('restored');
        (0, globals_1.expect)(restoreRes.body.comment.deletedAt).toBeFalsy();
        const listAfterRestore = await (0, supertest_1.default)(app)
            .get(`/api/entities/${ENTITY_ID}/comments`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_ONE);
        (0, globals_1.expect)(listAfterRestore.body).toHaveLength(1);
        const auditCount = await pg.query('SELECT COUNT(*) as count FROM maestro.entity_comment_audits WHERE comment_id = $1', [commentId]);
        (0, globals_1.expect)(parseInt(auditCount.rows[0].count, 10)).toBeGreaterThanOrEqual(2);
    });
    (0, globals_1.it)('enforces permissions for delete and restore', async () => {
        const commentId = await createComment();
        checkAccessMock.mockImplementation((_, __, ___, action) => {
            if (action === 'comment:delete' || action === 'comment:restore') {
                return Promise.resolve(false);
            }
            return Promise.resolve(true);
        });
        const forbidden = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_TWO)
            .send({ reason: 'not allowed' });
        (0, globals_1.expect)(forbidden.status).toBe(403);
        const allowedWithPolicy = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_TWO)
            .send({ reason: 'now allowed' });
        (0, globals_1.expect)(allowedWithPolicy.status).toBe(403);
        checkAccessMock.mockResolvedValue(true);
        const allowedAfterPolicy = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/delete`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_TWO)
            .send({ reason: 'policy grant' });
        (0, globals_1.expect)(allowedAfterPolicy.status).toBe(200);
        const restoreAllowed = await (0, supertest_1.default)(app)
            .post(`/api/entities/${ENTITY_ID}/comments/${commentId}/restore`)
            .set('x-tenant-id', TENANT)
            .set('x-user-id', ACTOR_TWO);
        (0, globals_1.expect)(restoreAllowed.status).toBe(200);
    });
});
