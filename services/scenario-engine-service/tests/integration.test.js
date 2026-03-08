"use strict";
/**
 * Integration Tests
 * End-to-end tests for the Scenario Engine API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('Scenario Engine API Integration', () => {
    let app;
    let store;
    const testTenantId = 'test-tenant-001';
    const testUserId = 'test-user-001';
    const authHeaders = {
        'X-Tenant-Id': testTenantId,
        'X-User-Id': testUserId,
    };
    (0, vitest_1.beforeEach)(() => {
        const result = (0, index_js_1.createApp)({
            maxScenariosPerTenant: 10,
            enableAutoCleanup: false,
        });
        app = result.app;
        store = result.store;
    });
    (0, vitest_1.afterEach)(() => {
        store.shutdown();
    });
    (0, vitest_1.describe)('Health Endpoints', () => {
        (0, vitest_1.it)('GET /health should return healthy status', async () => {
            const res = await (0, supertest_1.default)(app).get('/health');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('healthy');
            (0, vitest_1.expect)(res.body.service).toBe('scenario-engine');
            (0, vitest_1.expect)(res.body.environment).toBe('non-production');
        });
        (0, vitest_1.it)('GET /health/ready should return ready status', async () => {
            const res = await (0, supertest_1.default)(app).get('/health/ready');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.ready).toBe(true);
        });
        (0, vitest_1.it)('GET /health/live should return alive status', async () => {
            const res = await (0, supertest_1.default)(app).get('/health/live');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.alive).toBe(true);
        });
    });
    (0, vitest_1.describe)('Scenario CRUD', () => {
        (0, vitest_1.it)('POST /api/v1/scenarios should create a scenario', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({
                name: 'Test Scenario',
                description: 'A test scenario for what-if analysis',
                mode: 'sandbox',
                params: {
                    maxNodes: 1000,
                    maxEdges: 5000,
                },
                assumptions: ['Assumption 1'],
                tags: ['test', 'integration'],
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.scenario).toBeDefined();
            (0, vitest_1.expect)(res.body.scenario.name).toBe('Test Scenario');
            (0, vitest_1.expect)(res.body.scenario.status).toBe('draft');
            (0, vitest_1.expect)(res.body.scenario.policy.environment).toBe('non-production');
            (0, vitest_1.expect)(res.body.scenario.policy.tenantId).toBe(testTenantId);
        });
        (0, vitest_1.it)('GET /api/v1/scenarios should list scenarios', async () => {
            // Create two scenarios
            await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Scenario 1', params: {} });
            await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Scenario 2', params: {} });
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/scenarios')
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.scenarios.length).toBe(2);
        });
        (0, vitest_1.it)('GET /api/v1/scenarios/:id should get a specific scenario', async () => {
            const createRes = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Get Test', params: {} });
            const scenarioId = createRes.body.scenario.id;
            const res = await (0, supertest_1.default)(app)
                .get(`/api/v1/scenarios/${scenarioId}`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.scenario.id).toBe(scenarioId);
            (0, vitest_1.expect)(res.body.scenario.name).toBe('Get Test');
        });
        (0, vitest_1.it)('PATCH /api/v1/scenarios/:id should update a scenario', async () => {
            const createRes = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Original Name', params: {} });
            const scenarioId = createRes.body.scenario.id;
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/v1/scenarios/${scenarioId}`)
                .set(authHeaders)
                .send({
                name: 'Updated Name',
                description: 'Updated description',
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.scenario.name).toBe('Updated Name');
            (0, vitest_1.expect)(res.body.scenario.description).toBe('Updated description');
        });
        (0, vitest_1.it)('DELETE /api/v1/scenarios/:id should delete a scenario', async () => {
            const createRes = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'To Delete', params: {} });
            const scenarioId = createRes.body.scenario.id;
            const deleteRes = await (0, supertest_1.default)(app)
                .delete(`/api/v1/scenarios/${scenarioId}`)
                .set(authHeaders);
            (0, vitest_1.expect)(deleteRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app)
                .get(`/api/v1/scenarios/${scenarioId}`)
                .set(authHeaders);
            (0, vitest_1.expect)(getRes.status).toBe(404);
        });
        (0, vitest_1.it)('should require tenant ID', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .send({ name: 'No Tenant', params: {} });
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.code).toBe('MISSING_TENANT_ID');
        });
    });
    (0, vitest_1.describe)('What-If Operations', () => {
        let scenarioId;
        (0, vitest_1.beforeEach)(async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'WhatIf Test', params: {} });
            scenarioId = res.body.scenario.id;
        });
        (0, vitest_1.it)('POST /api/v1/whatif/:id/entities should add an entity', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({
                type: 'Person',
                name: 'John Doe',
                attributes: { role: 'analyst' },
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.nodeId).toBeDefined();
        });
        (0, vitest_1.it)('POST /api/v1/whatif/:id/relationships should create a relationship', async () => {
            // Add two entities
            const entity1 = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'Alice' });
            const entity2 = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'Bob' });
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/relationships`)
                .set(authHeaders)
                .send({
                fromId: entity1.body.nodeId,
                toId: entity2.body.nodeId,
                type: 'KNOWS',
                attributes: { since: 2020 },
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.edgeId).toBeDefined();
        });
        (0, vitest_1.it)('POST /api/v1/whatif/:id/execute should execute custom operation', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/execute`)
                .set(authHeaders)
                .send({
                operation: {
                    addNode: {
                        labels: ['Organization'],
                        properties: { name: 'Acme Corp', industry: 'Tech' },
                    },
                },
                description: 'Add company',
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.graphStats.totalNodes).toBe(1);
        });
        (0, vitest_1.it)('POST /api/v1/whatif/:id/execute-batch should execute batch operations', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/execute-batch`)
                .set(authHeaders)
                .send({
                operations: [
                    { addNode: { labels: ['Person'], properties: { name: 'Alice' } } },
                    { addNode: { labels: ['Person'], properties: { name: 'Bob' } } },
                    { addNode: { labels: ['Person'], properties: { name: 'Charlie' } } },
                ],
                description: 'Batch add people',
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.totalOperations).toBe(3);
            (0, vitest_1.expect)(res.body.successfulOperations).toBe(3);
            (0, vitest_1.expect)(res.body.graphStats.totalNodes).toBe(3);
        });
        (0, vitest_1.it)('POST /api/v1/whatif/:id/rules/:ruleId/enable should enable a rule', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/rules/detection-rule-001/enable`)
                .set(authHeaders)
                .send({ parameters: { threshold: 0.9 } });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.rule.enabled).toBe(true);
        });
        (0, vitest_1.it)('GET /api/v1/whatif/:id/rules should list rules', async () => {
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/rules/rule-a/enable`)
                .set(authHeaders);
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/rules/rule-b/disable`)
                .set(authHeaders);
            const res = await (0, supertest_1.default)(app)
                .get(`/api/v1/whatif/${scenarioId}/rules`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.rules.length).toBe(2);
        });
        (0, vitest_1.it)('DELETE /api/v1/whatif/:id/entities/:entityId should remove an entity', async () => {
            const addRes = await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'ToRemove' });
            const entityId = addRes.body.nodeId;
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/v1/whatif/${scenarioId}/entities/${entityId}`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.graphStats.totalNodes).toBe(0);
        });
    });
    (0, vitest_1.describe)('Analytics', () => {
        let scenarioId;
        (0, vitest_1.beforeEach)(async () => {
            // Create scenario with some data
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Analytics Test', params: {} });
            scenarioId = res.body.scenario.id;
            // Add nodes and edges
            const nodes = [];
            for (let i = 0; i < 5; i++) {
                const nodeRes = await (0, supertest_1.default)(app)
                    .post(`/api/v1/whatif/${scenarioId}/entities`)
                    .set(authHeaders)
                    .send({ type: 'Person', name: `Person${i}`, attributes: { riskScore: i * 20 } });
                nodes.push(nodeRes.body.nodeId);
            }
            // Create a chain
            for (let i = 0; i < 4; i++) {
                await (0, supertest_1.default)(app)
                    .post(`/api/v1/whatif/${scenarioId}/relationships`)
                    .set(authHeaders)
                    .send({ fromId: nodes[i], toId: nodes[i + 1], type: 'NEXT' });
            }
        });
        (0, vitest_1.it)('POST /api/v1/analytics/:id/compute should compute metrics', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/analytics/${scenarioId}/compute`)
                .set(authHeaders)
                .send({});
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.metrics).toBeDefined();
            (0, vitest_1.expect)(res.body.metrics.nodeCount).toBe(5);
            (0, vitest_1.expect)(res.body.metrics.edgeCount).toBe(4);
            (0, vitest_1.expect)(res.body.metrics.topNodesByPageRank.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('GET /api/v1/analytics/:id/metrics should get stored metrics', async () => {
            // First compute
            await (0, supertest_1.default)(app)
                .post(`/api/v1/analytics/${scenarioId}/compute`)
                .set(authHeaders);
            // Then get
            const res = await (0, supertest_1.default)(app)
                .get(`/api/v1/analytics/${scenarioId}/metrics`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.metrics).toBeDefined();
        });
        (0, vitest_1.it)('POST /api/v1/analytics/:id/baseline should set baseline', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/analytics/${scenarioId}/baseline`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.baselineMetrics).toBeDefined();
        });
        (0, vitest_1.it)('GET /api/v1/analytics/:id/export should export graph', async () => {
            const res = await (0, supertest_1.default)(app)
                .get(`/api/v1/analytics/${scenarioId}/export`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.nodes.length).toBe(5);
            (0, vitest_1.expect)(res.body.edges.length).toBe(4);
        });
        (0, vitest_1.it)('GET /api/v1/analytics/:id/top-nodes should get top nodes', async () => {
            await (0, supertest_1.default)(app)
                .post(`/api/v1/analytics/${scenarioId}/compute`)
                .set(authHeaders);
            const res = await (0, supertest_1.default)(app)
                .get(`/api/v1/analytics/${scenarioId}/top-nodes?metric=pagerank&k=3`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.topNodes.length).toBeLessThanOrEqual(3);
        });
        (0, vitest_1.it)('POST /api/v1/analytics/compare should compare scenarios', async () => {
            // Create second scenario
            const scenario2Res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Compare Test 2', params: {} });
            const scenario2Id = scenario2Res.body.scenario.id;
            // Add different data
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenario2Id}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'OnlyInTwo' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/analytics/compare')
                .set(authHeaders)
                .send({
                scenario1Id: scenarioId,
                scenario2Id: scenario2Id,
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.comparison).toBeDefined();
            (0, vitest_1.expect)(res.body.comparison.structuralDifferences).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Scenario Lifecycle', () => {
        let scenarioId;
        (0, vitest_1.beforeEach)(async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Lifecycle Test', params: {} });
            scenarioId = res.body.scenario.id;
        });
        (0, vitest_1.it)('POST /api/v1/scenarios/:id/activate should activate scenario', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/scenarios/${scenarioId}/activate`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.scenario.status).toBe('active');
        });
        (0, vitest_1.it)('POST /api/v1/scenarios/:id/archive should archive scenario', async () => {
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/scenarios/${scenarioId}/archive`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.scenario.status).toBe('archived');
        });
        (0, vitest_1.it)('POST /api/v1/scenarios/:id/snapshot should create snapshot', async () => {
            // Add some data first
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'Snapshot Test' });
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/scenarios/${scenarioId}/snapshot`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.metrics).toBeDefined();
            (0, vitest_1.expect)(res.body.scenario.computedAt).toBeDefined();
        });
        (0, vitest_1.it)('POST /api/v1/scenarios/:id/branch should create branch', async () => {
            // Add some data
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'Branch Source' });
            const res = await (0, supertest_1.default)(app)
                .post(`/api/v1/scenarios/${scenarioId}/branch`)
                .set(authHeaders)
                .send({
                name: 'Branched Scenario',
                description: 'A branch for alternative analysis',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.scenario.name).toBe('Branched Scenario');
            (0, vitest_1.expect)(res.body.scenario.parentScenarioId).toBe(scenarioId);
            (0, vitest_1.expect)(res.body.graphStats.totalNodes).toBe(1);
        });
        (0, vitest_1.it)('GET /api/v1/scenarios/:id/deltas should get delta history', async () => {
            // Perform some operations
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'Delta Test 1' });
            await (0, supertest_1.default)(app)
                .post(`/api/v1/whatif/${scenarioId}/entities`)
                .set(authHeaders)
                .send({ type: 'Person', name: 'Delta Test 2' });
            const res = await (0, supertest_1.default)(app)
                .get(`/api/v1/scenarios/${scenarioId}/deltas`)
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.deltas.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('Metrics Endpoint', () => {
        (0, vitest_1.it)('GET /metrics should return store statistics', async () => {
            // Create some scenarios
            await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Metrics Test 1', mode: 'sandbox', params: {} });
            await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({ name: 'Metrics Test 2', mode: 'simulation', params: {} });
            const res = await (0, supertest_1.default)(app).get('/metrics');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.scenarios_total).toBe(2);
            (0, vitest_1.expect)(res.body.scenarios_by_status.draft).toBe(2);
        });
    });
    (0, vitest_1.describe)('Error Handling', () => {
        (0, vitest_1.it)('should return 404 for non-existent scenario', async () => {
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/scenarios/non-existent-id')
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('should return 400 for invalid request body', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set(authHeaders)
                .send({}); // Missing required fields
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBeDefined();
        });
        (0, vitest_1.it)('should return 404 for unknown endpoint', async () => {
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/unknown')
                .set(authHeaders);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('should reject production environment', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/scenarios')
                .set({
                ...authHeaders,
                'X-Environment': 'production',
            })
                .send({ name: 'Prod Test', params: {} });
            (0, vitest_1.expect)(res.status).toBe(403);
            (0, vitest_1.expect)(res.body.code).toBe('PRODUCTION_DATA_GUARD');
        });
    });
});
