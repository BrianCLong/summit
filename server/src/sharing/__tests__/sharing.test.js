"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const sharing_js_1 = __importDefault(require("../../routes/sharing.js"));
const store_js_1 = require("../store.js");
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api', sharing_js_1.default);
    return app;
};
(0, globals_1.describe)('sharing flows', () => {
    const app = buildApp();
    (0, globals_1.beforeEach)(() => {
        (0, store_js_1.resetStore)();
    });
    (0, globals_1.it)('creates, accesses, and revokes a share link with audit entries', async () => {
        const scope = { tenantId: 't1', caseId: 'c1' };
        const expiresAt = new Date(Date.now() + 60_000).toISOString();
        const createRes = await (0, supertest_1.default)(app)
            .post('/api/share-links')
            .send({
            scope,
            resourceType: 'bundle',
            resourceId: 'bundle-123',
            expiresAt,
            permissions: ['view', 'download'],
            createdBy: 'tester',
        })
            .expect(201);
        const token = createRes.body.token;
        const accessRes = await (0, supertest_1.default)(app).get(`/api/share/${token}`).expect(200);
        (0, globals_1.expect)(accessRes.body.resourceId).toBe('bundle-123');
        await (0, supertest_1.default)(app).post(`/api/share-links/${createRes.body.link.id}/revoke`).send({ reason: 'policy' }).expect(200);
        await (0, supertest_1.default)(app).get(`/api/share/${token}`).expect(403);
        const audit = await (0, supertest_1.default)(app).get('/api/sharing/audit').expect(200);
        (0, globals_1.expect)(audit.body.some((e) => e.type === 'share.created')).toBe(true);
        (0, globals_1.expect)(audit.body.some((e) => e.type === 'share.access')).toBe(true);
        (0, globals_1.expect)(audit.body.some((e) => e.type === 'share.revoked')).toBe(true);
        (0, globals_1.expect)(audit.body.some((e) => e.type === 'share.denied')).toBe(true);
    });
    (0, globals_1.it)('previews share and matches plan hash on creation', async () => {
        const scope = { tenantId: 't1' };
        const expiresAt = new Date(Date.now() + 60_000).toISOString();
        const preview = await (0, supertest_1.default)(app)
            .post('/api/share-links/preview')
            .send({ scope, resources: ['doc-1'], permissions: ['view'], labelId: undefined })
            .expect(200);
        const created = await (0, supertest_1.default)(app)
            .post('/api/share-links')
            .send({
            scope,
            resourceType: 'document',
            resourceId: 'doc-1',
            expiresAt,
            permissions: ['view'],
            createdBy: 'tester',
        })
            .expect(201);
        (0, globals_1.expect)(created.body.planHash).toEqual(preview.body.planHash);
    });
    (0, globals_1.it)('enforces view-only permission on download', async () => {
        const scope = { tenantId: 'tenant-perm' };
        const expiresAt = new Date(Date.now() + 60_000).toISOString();
        const createRes = await (0, supertest_1.default)(app)
            .post('/api/share-links')
            .send({
            scope,
            resourceType: 'report',
            resourceId: 'rep-1',
            expiresAt,
            permissions: ['view'],
            createdBy: 'tester',
        })
            .expect(201);
        await (0, supertest_1.default)(app).get(`/api/share/${createRes.body.token}?download=1`).expect(403);
    });
    (0, globals_1.it)('enforces single-use reviewer invites', async () => {
        const scope = { tenantId: 'tenant-invite' };
        const expiresAt = new Date(Date.now() + 60_000).toISOString();
        const inviteRes = await (0, supertest_1.default)(app)
            .post('/api/reviewers/invite')
            .send({ email: 'reviewer@example.com', scope, resources: ['rep-1'], expiresAt })
            .expect(201);
        const accepted = await (0, supertest_1.default)(app).post(`/api/reviewers/invite/${inviteRes.body.id}/accept`).expect(200);
        (0, globals_1.expect)(accepted.body.invite.status).toBe('accepted');
        await (0, supertest_1.default)(app).post(`/api/reviewers/invite/${inviteRes.body.id}/accept`).expect(404);
    });
});
