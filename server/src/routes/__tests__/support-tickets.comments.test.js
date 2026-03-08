"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const ACTOR_ONE = 'support-comment-author';
const ACTOR_TWO = 'support-comment-other';
let getPostgresPool;
let supportRouter;
const describeIf = process.env.RUN_ACCEPTANCE === 'true' ? globals_1.describe : globals_1.describe.skip;
async function ensureSoftDeleteColumns(pg) {
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
async function createTicket(pg) {
    const { rows } = await pg.query(`INSERT INTO support_tickets (title, description, reporter_id, reporter_email)
     VALUES ('Comment lifecycle', 'Testing comment delete/restore', $1, 'author@example.test')
     RETURNING id`, [ACTOR_ONE]);
    return rows[0].id;
}
async function cleanupTicket(pg, ticketId) {
    await pg.query('DELETE FROM support_ticket_comment_audits WHERE comment_id IN (SELECT id FROM support_ticket_comments WHERE ticket_id = $1)', [ticketId]);
    await pg.query('DELETE FROM support_ticket_comments WHERE ticket_id = $1', [ticketId]);
    await pg.query('DELETE FROM support_tickets WHERE id = $1', [ticketId]);
}
describeIf('Support ticket comment safe delete lifecycle', () => {
    let app;
    let pg;
    let ticketId;
    (0, globals_1.beforeAll)(async () => {
        process.env.SAFE_DELETE = 'true';
        process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
        process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
        process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
        process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'passwordpasswordpasswordpassword';
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'this_is_a_dev_jwt_secret_value_123456';
        process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'this_is_a_dev_refresh_secret_value_123456';
        ({ getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../../db/postgres.js'))));
        const routerModule = await Promise.resolve().then(() => __importStar(require('../support-tickets.js')));
        supportRouter = routerModule.default ?? routerModule;
        pg = getPostgresPool();
        await ensureSoftDeleteColumns(pg);
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((req, _res, next) => {
            const idHeader = req.headers['x-user-id'];
            const roleHeader = req.headers['x-user-role'];
            if (idHeader) {
                req.user = { id: idHeader, roles: roleHeader ? [roleHeader] : [] };
            }
            next();
        });
        app.use('/api/support', supportRouter);
    });
    (0, globals_1.beforeEach)(async () => {
        ticketId = await createTicket(pg);
    });
    (0, globals_1.afterEach)(async () => {
        await cleanupTicket(pg, ticketId);
    });
    (0, globals_1.afterAll)(async () => {
        await pg.end();
        delete process.env.SAFE_DELETE;
    });
    (0, globals_1.it)('soft deletes a comment, hides it from listings, and restores it', async () => {
        const createRes = await (0, supertest_1.default)(app)
            .post(`/api/support/tickets/${ticketId}/comments`)
            .set('x-user-id', ACTOR_ONE)
            .send({ content: 'Initial comment', isInternal: false });
        (0, globals_1.expect)(createRes.status).toBe(201);
        const commentId = createRes.body.id;
        const listBefore = await (0, supertest_1.default)(app).get(`/api/support/tickets/${ticketId}/comments`);
        (0, globals_1.expect)(listBefore.status).toBe(200);
        (0, globals_1.expect)(Array.isArray(listBefore.body)).toBe(true);
        (0, globals_1.expect)(listBefore.body).toHaveLength(1);
        const deleteRes = await (0, supertest_1.default)(app)
            .post(`/api/support/tickets/${ticketId}/comments/${commentId}/delete`)
            .set('x-user-id', ACTOR_ONE)
            .send({ reason: 'cleanup' });
        (0, globals_1.expect)(deleteRes.status).toBe(200);
        (0, globals_1.expect)(deleteRes.body.status).toBe('deleted');
        const listAfterDelete = await (0, supertest_1.default)(app).get(`/api/support/tickets/${ticketId}/comments`);
        (0, globals_1.expect)(listAfterDelete.status).toBe(200);
        (0, globals_1.expect)(listAfterDelete.body).toHaveLength(0);
        const restoreRes = await (0, supertest_1.default)(app)
            .post(`/api/support/tickets/${ticketId}/comments/${commentId}/restore`)
            .set('x-user-id', ACTOR_ONE);
        (0, globals_1.expect)(restoreRes.status).toBe(200);
        (0, globals_1.expect)(restoreRes.body.status).toBe('restored');
        const listAfterRestore = await (0, supertest_1.default)(app).get(`/api/support/tickets/${ticketId}/comments`);
        (0, globals_1.expect)(listAfterRestore.status).toBe(200);
        (0, globals_1.expect)(listAfterRestore.body).toHaveLength(1);
        const audit = await pg.query('SELECT COUNT(*) as count FROM support_ticket_comment_audits WHERE comment_id = $1', [commentId]);
        (0, globals_1.expect)(parseInt(audit.rows[0].count, 10)).toBeGreaterThanOrEqual(2);
    });
    (0, globals_1.it)('enforces author or moderator permissions for deletion', async () => {
        const createRes = await (0, supertest_1.default)(app)
            .post(`/api/support/tickets/${ticketId}/comments`)
            .set('x-user-id', ACTOR_ONE)
            .send({ content: 'Owned comment' });
        const commentId = createRes.body.id;
        const forbidden = await (0, supertest_1.default)(app)
            .post(`/api/support/tickets/${ticketId}/comments/${commentId}/delete`)
            .set('x-user-id', ACTOR_TWO)
            .send({ reason: 'should not work' });
        (0, globals_1.expect)(forbidden.status).toBe(403);
        const stillPresent = await (0, supertest_1.default)(app).get(`/api/support/tickets/${ticketId}/comments`);
        (0, globals_1.expect)(stillPresent.body).toHaveLength(1);
        const allowed = await (0, supertest_1.default)(app)
            .post(`/api/support/tickets/${ticketId}/comments/${commentId}/delete`)
            .set('x-user-id', ACTOR_TWO)
            .set('x-user-role', 'admin')
            .send({ reason: 'moderator clean up' });
        (0, globals_1.expect)(allowed.status).toBe(200);
    });
});
