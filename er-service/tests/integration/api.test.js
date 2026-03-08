"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../src/index");
(0, globals_1.describe)('ER Service API', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        app = (0, index_1.createApp)();
    });
    (0, globals_1.describe)('POST /api/v1/candidates', () => {
        (0, globals_1.it)('should find candidate matches', async () => {
            const requestBody = {
                tenantId: 'test-tenant',
                entity: {
                    id: 'e1',
                    type: 'person',
                    name: 'John Smith',
                    tenantId: 'test-tenant',
                    attributes: { email: 'john@example.com' },
                },
                population: [
                    {
                        id: 'e2',
                        type: 'person',
                        name: 'Jon Smith',
                        tenantId: 'test-tenant',
                        attributes: { email: 'john@example.com' },
                    },
                    {
                        id: 'e3',
                        type: 'person',
                        name: 'Jane Doe',
                        tenantId: 'test-tenant',
                        attributes: { email: 'jane@example.com' },
                    },
                ],
                topK: 5,
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/candidates')
                .send(requestBody)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('requestId');
            (0, globals_1.expect)(response.body).toHaveProperty('candidates');
            (0, globals_1.expect)(response.body).toHaveProperty('method');
            (0, globals_1.expect)(response.body).toHaveProperty('executionTimeMs');
            (0, globals_1.expect)(Array.isArray(response.body.candidates)).toBe(true);
        });
        (0, globals_1.it)('should reject invalid request', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/candidates')
                .send({ invalid: 'data' })
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, globals_1.describe)('POST /api/v1/merge', () => {
        (0, globals_1.it)('should merge entities successfully', async () => {
            // Pre-store entities first
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({
                id: 'merge-e1',
                type: 'person',
                name: 'John Smith',
                tenantId: 'test-tenant',
                attributes: { email: 'john@example.com' },
            })
                .expect(201);
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({
                id: 'merge-e2',
                type: 'person',
                name: 'Jon Smith',
                tenantId: 'test-tenant',
                attributes: { email: 'john@example.com' },
            })
                .expect(201);
            const requestBody = {
                tenantId: 'test-tenant',
                entityIds: ['merge-e1', 'merge-e2'],
                actor: 'analyst@example.com',
                reason: 'Duplicate detection',
                policyTags: ['er:manual-review'],
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/merge')
                .send(requestBody)
                .expect(201);
            (0, globals_1.expect)(response.body).toHaveProperty('mergeId');
            (0, globals_1.expect)(response.body).toHaveProperty('primaryId');
            (0, globals_1.expect)(response.body).toHaveProperty('mergedIds');
            (0, globals_1.expect)(response.body).toHaveProperty('reversible');
            (0, globals_1.expect)(response.body.reversible).toBe(true);
        });
        (0, globals_1.it)('should reject merge with less than 2 entities', async () => {
            const requestBody = {
                tenantId: 'test-tenant',
                entityIds: ['e1'],
                actor: 'analyst@example.com',
                reason: 'Test',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/merge')
                .send(requestBody)
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, globals_1.describe)('POST /api/v1/merge/:mergeId/revert', () => {
        (0, globals_1.it)('should revert merge successfully', async () => {
            // Pre-store entities
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'revert-e1', type: 'person', name: 'Test User 1', tenantId: 'test-tenant', attributes: {} })
                .expect(201);
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'revert-e2', type: 'person', name: 'Test User 2', tenantId: 'test-tenant', attributes: {} })
                .expect(201);
            // Create a merge
            const mergeResponse = await (0, supertest_1.default)(app)
                .post('/api/v1/merge')
                .send({
                tenantId: 'test-tenant',
                entityIds: ['revert-e1', 'revert-e2'],
                actor: 'analyst@example.com',
                reason: 'Test merge',
            })
                .expect(201);
            const mergeId = mergeResponse.body.mergeId;
            // Then revert it
            const revertResponse = await (0, supertest_1.default)(app)
                .post(`/api/v1/merge/${mergeId}/revert`)
                .send({
                actor: 'supervisor@example.com',
                reason: 'False positive',
            })
                .expect(200);
            (0, globals_1.expect)(revertResponse.body).toHaveProperty('success');
            (0, globals_1.expect)(revertResponse.body.success).toBe(true);
        });
        (0, globals_1.it)('should reject revert without required fields', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/v1/merge/some-id/revert')
                .send({})
                .expect(400);
        });
    });
    (0, globals_1.describe)('POST /api/v1/split', () => {
        (0, globals_1.it)('should split entity successfully', async () => {
            // Pre-store entity
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'split-e1', type: 'person', name: 'Combined Identity', tenantId: 'test-tenant', attributes: { context: 'mixed' } })
                .expect(201);
            const requestBody = {
                tenantId: 'test-tenant',
                entityId: 'split-e1',
                splitGroups: [
                    { attributes: { context: 'work' } },
                    { attributes: { context: 'personal' } },
                ],
                actor: 'analyst@example.com',
                reason: 'Separate identities',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/split')
                .send(requestBody)
                .expect(201);
            (0, globals_1.expect)(response.body).toHaveProperty('splitId');
            (0, globals_1.expect)(response.body).toHaveProperty('originalEntityId');
            (0, globals_1.expect)(response.body).toHaveProperty('newEntityIds');
            (0, globals_1.expect)(response.body.newEntityIds.length).toBe(2);
        });
        (0, globals_1.it)('should reject split with less than 2 groups', async () => {
            const requestBody = {
                tenantId: 'test-tenant',
                entityId: 'e1',
                splitGroups: [{ attributes: {} }],
                actor: 'analyst@example.com',
                reason: 'Test',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/split')
                .send(requestBody)
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, globals_1.describe)('GET /api/v1/explain/:mergeId', () => {
        (0, globals_1.it)('should explain merge decision', async () => {
            // Pre-store entities
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'explain-e1', type: 'person', name: 'John Doe', tenantId: 'test-tenant', attributes: {} })
                .expect(201);
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'explain-e2', type: 'person', name: 'Jon Doe', tenantId: 'test-tenant', attributes: {} })
                .expect(201);
            // Create a merge
            const mergeResponse = await (0, supertest_1.default)(app)
                .post('/api/v1/merge')
                .send({
                tenantId: 'test-tenant',
                entityIds: ['explain-e1', 'explain-e2'],
                actor: 'analyst@example.com',
                reason: 'Test merge',
            })
                .expect(201);
            const mergeId = mergeResponse.body.mergeId;
            // Get explanation
            const explainResponse = await (0, supertest_1.default)(app)
                .get(`/api/v1/explain/${mergeId}`)
                .expect(200);
            (0, globals_1.expect)(explainResponse.body).toHaveProperty('mergeId');
            (0, globals_1.expect)(explainResponse.body).toHaveProperty('features');
            (0, globals_1.expect)(explainResponse.body).toHaveProperty('rationale');
            (0, globals_1.expect)(explainResponse.body).toHaveProperty('featureWeights');
            (0, globals_1.expect)(explainResponse.body).toHaveProperty('threshold');
            (0, globals_1.expect)(Array.isArray(explainResponse.body.rationale)).toBe(true);
        });
        (0, globals_1.it)('should return 500 for non-existent merge', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/v1/explain/non-existent-id')
                .expect(500);
        });
    });
    (0, globals_1.describe)('GET /api/v1/merge/:mergeId/export', () => {
        (0, globals_1.it)('should export merge bundle with explanation details', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'export-e1', type: 'person', name: 'Jane Roe', tenantId: 'test-tenant', attributes: {} })
                .expect(201);
            await (0, supertest_1.default)(app)
                .post('/api/v1/entities')
                .send({ id: 'export-e2', type: 'person', name: 'Janet Roe', tenantId: 'test-tenant', attributes: {} })
                .expect(201);
            const mergeResponse = await (0, supertest_1.default)(app)
                .post('/api/v1/merge')
                .send({
                tenantId: 'test-tenant',
                entityIds: ['export-e1', 'export-e2'],
                actor: 'analyst@example.com',
                reason: 'Test merge export',
            })
                .expect(201);
            const mergeId = mergeResponse.body.mergeId;
            const exportResponse = await (0, supertest_1.default)(app)
                .get(`/api/v1/merge/${mergeId}/export`)
                .expect(200);
            (0, globals_1.expect)(exportResponse.body).toHaveProperty('merge');
            (0, globals_1.expect)(exportResponse.body).toHaveProperty('explanation');
            (0, globals_1.expect)(exportResponse.body.explanation).toHaveProperty('featureContributions');
            (0, globals_1.expect)(Array.isArray(exportResponse.body.explanation.featureContributions)).toBe(true);
        });
    });
    (0, globals_1.describe)('GET /api/v1/audit', () => {
        (0, globals_1.it)('should retrieve audit log', async () => {
            // Create some operations
            await (0, supertest_1.default)(app)
                .post('/api/v1/merge')
                .send({
                tenantId: 'test-tenant',
                entityIds: ['e1', 'e2'],
                actor: 'analyst@example.com',
                reason: 'Test',
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/audit?tenantId=test-tenant')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('entries');
            (0, globals_1.expect)(response.body).toHaveProperty('count');
            (0, globals_1.expect)(Array.isArray(response.body.entries)).toBe(true);
        });
        (0, globals_1.it)('should filter audit log by event type', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/audit?event=merge&limit=10')
                .expect(200);
            (0, globals_1.expect)(response.body.entries.length).toBeLessThanOrEqual(10);
        });
    });
    (0, globals_1.describe)('GET /api/v1/stats', () => {
        (0, globals_1.it)('should return statistics', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/stats')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('merges');
            (0, globals_1.expect)(response.body).toHaveProperty('splits');
            (0, globals_1.expect)(response.body).toHaveProperty('explanations');
            (0, globals_1.expect)(response.body).toHaveProperty('auditEntries');
        });
    });
    (0, globals_1.describe)('GET /api/v1/health', () => {
        (0, globals_1.it)('should return healthy status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/health')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('status');
            (0, globals_1.expect)(response.body.status).toBe('healthy');
            (0, globals_1.expect)(response.body).toHaveProperty('timestamp');
        });
    });
});
