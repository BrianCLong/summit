"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestRun = createTestRun;
exports.createTestRouterDecision = createTestRouterDecision;
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../../app.js");
const postgres_js_1 = require("../../db/postgres.js");
const provenance_service_js_1 = require("../evidence/provenance-service.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Maestro Integration Tests', () => {
    let testRunId;
    let authToken;
    let app;
    (0, globals_1.beforeAll)(async () => {
        // Create app
        app = await (0, app_js_1.createApp)();
        // Setup test database
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query('BEGIN');
        // Create test run
        const result = await pool.query(`INSERT INTO run (id, runbook, status, started_at) 
       VALUES (gen_random_uuid(), 'test-runbook', 'RUNNING', now()) 
       RETURNING id`);
        testRunId = result.rows?.[0]?.id || '123';
        // Mock auth token (in real tests, use proper auth)
        authToken = 'test-token';
    });
    (0, globals_1.afterAll)(async () => {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query('ROLLBACK');
        await pool.end();
    });
    (0, globals_1.describe)('Router Decision Transparency', () => {
        (0, globals_1.beforeEach)(async () => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Insert test router decision
            await pool.query(`INSERT INTO router_decisions (id, run_id, node_id, selected_model, candidates, policy_applied)
         VALUES (gen_random_uuid(), $1, 'test-node', 'gpt-4', $2, 'cost-optimization')`, [
                testRunId,
                JSON.stringify([
                    {
                        model: 'gpt-4',
                        score: 0.95,
                        reason: 'Highest quality for complex task',
                    },
                    {
                        model: 'gpt-3.5-turbo',
                        score: 0.8,
                        reason: 'Cost effective alternative',
                    },
                ]),
            ]);
        });
        (0, globals_1.test)('should fetch router decision', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/routing`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('selectedModel', 'gpt-4');
            (0, globals_1.expect)(response.body.candidates).toHaveLength(2);
            (0, globals_1.expect)(response.body).toHaveProperty('canOverride');
        });
        (0, globals_1.test)('should handle override request', async () => {
            const response = await (0, supertest_1.default)(app)
                .post(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/override-routing`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                model: 'gpt-3.5-turbo',
                reason: 'Cost optimization for testing',
            })
                .expect(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
        });
        (0, globals_1.test)('should export audit data', async () => {
            // First get the decision ID
            const getResponse = await (0, supertest_1.default)(app)
                .get(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/routing`)
                .set('Authorization', `Bearer ${authToken}`);
            const decisionId = getResponse.body.id;
            const response = await (0, supertest_1.default)(app)
                .get(`/api/maestro/v1/audit/router-decisions/${decisionId}/export`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('application/json');
            (0, globals_1.expect)(response.body).toHaveProperty('exportedAt');
        });
    });
    (0, globals_1.describe)('Evidence Provenance System', () => {
        (0, globals_1.test)('should store and verify evidence', async () => {
            const artifact = {
                runId: testRunId,
                artifactType: 'sbom',
                content: JSON.stringify({ components: [] }),
                metadata: { format: 'cycloneDX' },
            };
            const artifactId = await provenance_service_js_1.evidenceProvenanceService.storeEvidence(artifact);
            (0, globals_1.expect)(artifactId).toBeDefined();
            const verification = await provenance_service_js_1.evidenceProvenanceService.verifyEvidence(artifactId);
            (0, globals_1.expect)(verification.valid).toBe(true);
            (0, globals_1.expect)(verification.integrity).toBe(true);
            (0, globals_1.expect)(verification.provenance).toBe(true);
        });
        (0, globals_1.test)('should generate SBOM evidence', async () => {
            const dependencies = [
                { name: 'express', version: '4.18.0', licenses: ['MIT'] },
                { name: 'postgres', version: '14.0', licenses: ['PostgreSQL'] },
            ];
            const artifactId = await provenance_service_js_1.evidenceProvenanceService.generateSBOMEvidence(testRunId, dependencies);
            (0, globals_1.expect)(artifactId).toBeDefined();
            const artifacts = await provenance_service_js_1.evidenceProvenanceService.listEvidenceForRun(testRunId);
            const sbomArtifact = artifacts.find((a) => a.artifact_type === 'sbom');
            (0, globals_1.expect)(sbomArtifact).toBeDefined();
        });
    });
    (0, globals_1.describe)('Approval System', () => {
        (0, globals_1.beforeEach)(async () => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Create approval request
            await pool.query(`INSERT INTO run_step (run_id, step_id, status) 
         VALUES ($1, 'approval-step', 'BLOCKED')`, [testRunId]);
            await pool.query(`INSERT INTO run_event (run_id, kind, payload)
         VALUES ($1, 'approval.created', $2)`, [
                testRunId,
                { stepId: 'approval-step', labels: ['production', 'high-cost'] },
            ]);
        });
        (0, globals_1.test)('should list pending approvals', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/conductor/v1/approvals')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body.items).toContainEqual(globals_1.expect.objectContaining({
                runId: testRunId,
                stepId: 'approval-step',
            }));
        });
        (0, globals_1.test)('should handle approval via GraphQL', async () => {
            const mutation = `
        mutation ApproveStep($runId: ID!, $stepId: ID!, $justification: String!) {
          approveStep(runId: $runId, stepId: $stepId, justification: $justification)
        }
      `;
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                query: mutation,
                variables: {
                    runId: testRunId,
                    stepId: 'approval-step',
                    justification: 'Approved for testing purposes',
                },
            })
                .expect(200);
            (0, globals_1.expect)(response.body.data.approveStep).toBe(true);
        });
    });
    (0, globals_1.describe)('MCP Server Management', () => {
        (0, globals_1.test)('should create MCP server', async () => {
            const serverData = {
                name: 'test-mcp-server',
                url: 'wss://test.example.com/mcp',
                scopes: ['read', 'write'],
                tags: ['test'],
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/maestro/v1/mcp/servers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(serverData)
                .expect(201);
            (0, globals_1.expect)(response.body.name).toBe('test-mcp-server');
            (0, globals_1.expect)(response.body).not.toHaveProperty('auth_token'); // Should be hidden
        });
        (0, globals_1.test)('should list MCP servers', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/maestro/v1/mcp/servers')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
        });
    });
    (0, globals_1.describe)('Dashboard API', () => {
        (0, globals_1.test)('should fetch dashboard summary', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/maestro/v1/dashboard/summary')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('autonomy');
            (0, globals_1.expect)(response.body).toHaveProperty('health');
            (0, globals_1.expect)(response.body).toHaveProperty('budgets');
            (0, globals_1.expect)(response.body).toHaveProperty('runs');
            (0, globals_1.expect)(response.body).toHaveProperty('approvals');
        });
        (0, globals_1.test)('should fetch autonomy configuration', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/maestro/v1/dashboard/autonomy')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('level');
            (0, globals_1.expect)(response.body).toHaveProperty('policies');
            (0, globals_1.expect)(Array.isArray(response.body.policies)).toBe(true);
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.test)('should handle 404 for non-existent run', async () => {
            const fakeRunId = '00000000-0000-0000-0000-000000000000';
            await (0, supertest_1.default)(app)
                .get(`/api/maestro/v1/runs/${fakeRunId}/nodes/test-node/routing`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
        (0, globals_1.test)('should validate input parameters', async () => {
            await (0, supertest_1.default)(app)
                .post(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/override-routing`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                model: '', // Invalid empty model
                reason: 'test',
            })
                .expect(400);
        });
        (0, globals_1.test)('should require authentication', async () => {
            await (0, supertest_1.default)(app).get('/api/maestro/v1/dashboard/summary').expect(401);
        });
    });
    (0, globals_1.describe)('Performance & Scalability', () => {
        (0, globals_1.test)('should handle concurrent router decisions', async () => {
            const promises = Array.from({ length: 10 }, (_, i) => (0, supertest_1.default)(app)
                .get(`/api/maestro/v1/runs/${testRunId}/nodes/test-node-${i}/routing`)
                .set('Authorization', `Bearer ${authToken}`));
            const responses = await Promise.allSettled(promises);
            const successfulResponses = responses.filter((r) => r.status === 'fulfilled').length;
            // Should handle most requests successfully
            (0, globals_1.expect)(successfulResponses).toBeGreaterThan(5);
        });
        (0, globals_1.test)('should paginate large result sets', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/maestro/v1/runs?limit=5&offset=0')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body.items).toBeDefined();
            (0, globals_1.expect)(response.body.items.length).toBeLessThanOrEqual(5);
        });
    });
});
// Additional test utilities
function createTestRun(runbook = 'test-runbook') {
    return (0, postgres_js_1.getPostgresPool)().query(`INSERT INTO run (id, runbook, status, started_at) 
     VALUES (gen_random_uuid(), $1, 'RUNNING', now()) 
     RETURNING id`, [runbook]);
}
function createTestRouterDecision(runId, nodeId) {
    return (0, postgres_js_1.getPostgresPool)().query(`INSERT INTO router_decisions (id, run_id, node_id, selected_model, candidates)
     VALUES (gen_random_uuid(), $1, $2, 'gpt-4', $3)`, [
        runId,
        nodeId,
        JSON.stringify([
            { model: 'gpt-4', score: 0.95, reason: 'Best quality' },
            { model: 'gpt-3.5-turbo', score: 0.8, reason: 'Cost effective' },
        ]),
    ]);
}
