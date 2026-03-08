"use strict";
/**
 * End-to-End Integration Test Suite
 * Comprehensive testing of all IntelGraph platform capabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestUtils = void 0;
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
const integrationTestServer_1 = require("./helpers/integrationTestServer");
// Test configuration
const TEST_CONFIG = {
    api: {
        timeout: 30000,
    },
    auth: {
        testUser: {
            email: 'test@intelgraph.ai',
            password: 'TestPassword123!',
            tenantId: 'test-tenant',
        },
    },
};
(0, mocha_1.describe)('🚀 IntelGraph Platform - End-to-End Integration Tests', () => {
    let authToken;
    let api;
    let state;
    let resetState;
    let testCorrelationId;
    (0, mocha_1.before)(async function () {
        this.timeout(60000); // 1 minute setup timeout
        console.log('🔧 Setting up test environment...');
        const server = (0, integrationTestServer_1.createIntegrationTestServer)();
        api = (0, supertest_1.default)(server.app);
        state = server.state;
        resetState = server.reset;
        // Authenticate test user
        const authResponse = await api
            .post('/api/auth/login')
            .send({
            email: TEST_CONFIG.auth.testUser.email,
            password: TEST_CONFIG.auth.testUser.password,
        })
            .timeout(TEST_CONFIG.api.timeout);
        (0, chai_1.expect)(authResponse.status).to.equal(200);
        (0, chai_1.expect)(authResponse.body.token).to.be.a('string');
        authToken = authResponse.body.token;
        console.log('✅ Test user authenticated');
    });
    (0, mocha_1.after)(async function () {
        this.timeout(30000);
        console.log('🧹 Cleaning up test environment...');
        if (resetState) {
            resetState();
            (0, chai_1.expect)(state.graphs.size).to.equal(0);
            (0, chai_1.expect)(state.auditEvents.length).to.equal(0);
        }
        console.log('✅ Test environment cleanup complete');
    });
    (0, mocha_1.beforeEach)(() => {
        testCorrelationId = (0, crypto_1.randomUUID)();
    });
    (0, mocha_1.describe)('🏗️ Core Platform Health', () => {
        (0, mocha_1.it)('should verify all system components are healthy', async () => {
            const response = await api
                .get('/api/health')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('status', 'healthy');
            (0, chai_1.expect)(response.body).to.have.property('components');
            (0, chai_1.expect)(response.body.components).to.have.property('database', 'healthy');
            (0, chai_1.expect)(response.body.components).to.have.property('redis', 'healthy');
            (0, chai_1.expect)(response.body.components).to.have.property('neo4j', 'healthy');
        });
        (0, mocha_1.it)('should verify autonomous orchestrator is running', async () => {
            const response = await api
                .get('/api/maestro/v1/health')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('orchestrator', 'running');
            (0, chai_1.expect)(response.body).to.have.property('workers');
            (0, chai_1.expect)(response.body.workers).to.be.greaterThan(0);
        });
    });
    (0, mocha_1.describe)('🔐 Authentication & Authorization', () => {
        (0, mocha_1.it)('should authenticate user and return valid JWT', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                email: TEST_CONFIG.auth.testUser.email,
                password: TEST_CONFIG.auth.testUser.password,
            })
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('token');
            (0, chai_1.expect)(response.body).to.have.property('user');
            (0, chai_1.expect)(response.body.user).to.have.property('email', TEST_CONFIG.auth.testUser.email);
        });
        (0, mocha_1.it)('should reject invalid credentials', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                email: TEST_CONFIG.auth.testUser.email,
                password: 'invalid-password',
            })
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(401);
        });
        (0, mocha_1.it)('should protect endpoints with authentication', async () => {
            const response = await api
                .get('/api/graphs')
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(401);
        });
        (0, mocha_1.it)('should deny unauthenticated investigation access', async () => {
            const response = await api
                .post('/api/investigations')
                .send({ name: 'Unauthorized Investigation' })
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(401);
        });
        (0, mocha_1.it)('should deny viewer from investigation write access', async () => {
            const response = await api
                .post('/api/investigations')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Test-Role', 'viewer')
                .set('X-Correlation-ID', testCorrelationId)
                .send({ name: 'Viewer Attempt' })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(403);
        });
        (0, mocha_1.it)('should allow investigator to create investigations', async () => {
            const response = await api
                .post('/api/investigations')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Test-Role', 'investigator')
                .set('X-Correlation-ID', testCorrelationId)
                .send({ name: 'Investigator Workspace', description: 'RBAC write test' })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(201);
            (0, chai_1.expect)(response.body).to.have.property('id');
        });
        (0, mocha_1.it)('should allow viewers to read investigation analysis status', async () => {
            const workspaceResponse = await api
                .post('/api/investigations')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send({ name: 'Viewer Read Workspace', description: 'RBAC read test' })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(workspaceResponse.status).to.equal(201);
            const workspaceId = workspaceResponse.body.id;
            const analysisResponse = await api
                .post(`/api/investigations/${workspaceId}/analyze`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send({ goal: 'RBAC read test', autonomy: 1 })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(analysisResponse.status).to.equal(202);
            const analysisId = analysisResponse.body.analysisId;
            const statusResponse = await api
                .get(`/api/investigations/${workspaceId}/analyses/${analysisId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Test-Role', 'viewer')
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(statusResponse.status).to.equal(200);
            (0, chai_1.expect)(statusResponse.body).to.have.property('status');
        });
    });
    (0, mocha_1.describe)('🧠 Graph Analytics Engine', () => {
        let testGraphId;
        (0, mocha_1.it)('should create a new graph', async () => {
            const graphData = {
                name: `Test Graph ${Date.now()}`,
                description: 'End-to-end test graph',
                settings: {
                    privacy: 'private',
                    collaboration: false,
                },
            };
            const response = await api
                .post('/api/graphs')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(graphData)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(201);
            (0, chai_1.expect)(response.body).to.have.property('id');
            (0, chai_1.expect)(response.body).to.have.property('name', graphData.name);
            testGraphId = response.body.id;
        });
        (0, mocha_1.it)('should add entities to the graph', async () => {
            const entityData = {
                type: 'Person',
                properties: {
                    name: 'John Test',
                    email: 'john@test.com',
                    role: 'Analyst',
                },
            };
            const response = await api
                .post(`/api/graphs/${testGraphId}/entities`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(entityData)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(201);
            (0, chai_1.expect)(response.body).to.have.property('id');
            (0, chai_1.expect)(response.body).to.have.property('type', entityData.type);
            (0, chai_1.expect)(response.body.properties).to.deep.include(entityData.properties);
        });
        (0, mocha_1.it)('should query entities with filtering', async () => {
            const response = await api
                .get(`/api/graphs/${testGraphId}/entities`)
                .query({ type: 'Person', limit: 10 })
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('entities');
            (0, chai_1.expect)(response.body.entities).to.be.an('array');
            (0, chai_1.expect)(response.body).to.have.property('totalCount');
        });
        (0, mocha_1.it)('should perform graph analytics', async () => {
            const analysisRequest = {
                type: 'centrality',
                algorithm: 'pagerank',
                parameters: {
                    iterations: 20,
                    dampingFactor: 0.85,
                },
            };
            const response = await api
                .post(`/api/graphs/${testGraphId}/analyze`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(analysisRequest)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('jobId');
            (0, chai_1.expect)(response.body).to.have.property('status', 'started');
        });
    });
    (0, mocha_1.describe)('🤖 Autonomous Orchestration System', () => {
        let testRunId;
        (0, mocha_1.it)('should create an autonomous orchestration run', async () => {
            const runConfig = {
                goal: 'Analyze test dataset and generate intelligence report',
                autonomy: 2, // Guarded auto-plan
                mode: 'PLAN',
                budgets: {
                    tokens: 50000,
                    usd: 25.0,
                    timeMinutes: 30,
                },
                reasonForAccess: 'End-to-end integration testing',
            };
            const response = await api
                .post('/api/maestro/v1/runs')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(runConfig)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(201);
            (0, chai_1.expect)(response.body).to.have.property('runId');
            (0, chai_1.expect)(response.body).to.have.property('status', 'pending');
            testRunId = response.body.runId;
        });
        (0, mocha_1.it)('should retrieve run status and progress', async () => {
            const response = await api
                .get(`/api/maestro/v1/runs/${testRunId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('id', testRunId);
            (0, chai_1.expect)(response.body).to.have.property('status');
            (0, chai_1.expect)(response.body).to.have.property('budgets');
            (0, chai_1.expect)(response.body).to.have.property('tasks');
        });
        (0, mocha_1.it)('should handle run approval workflow', async () => {
            // First, check if approval is required
            const statusResponse = await api
                .get(`/api/maestro/v1/runs/${testRunId}/approvals`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            if (statusResponse.body.pending &&
                statusResponse.body.pending.length > 0) {
                const approvalId = statusResponse.body.pending[0].id;
                const approvalResponse = await api
                    .post(`/api/maestro/v1/approvals/${approvalId}/approve`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('X-Correlation-ID', testCorrelationId)
                    .send({ reason: 'Integration test approval' })
                    .timeout(TEST_CONFIG.api.timeout);
                (0, chai_1.expect)(approvalResponse.status).to.equal(200);
            }
        });
    });
    (0, mocha_1.describe)('💰 Premium Model Routing', () => {
        (0, mocha_1.it)('should optimize model selection based on query complexity', async () => {
            const queryRequest = {
                query: 'Analyze the relationship patterns in the network and identify potential risk indicators',
                context: {
                    complexity: 'high',
                    domain: 'intelligence',
                    urgency: 'normal',
                },
                constraints: {
                    maxCost: 10.0,
                    maxLatency: 30000,
                    minQuality: 0.8,
                },
            };
            const response = await api
                .post('/api/maestro/v1/routing/optimize')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(queryRequest)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('selectedModel');
            (0, chai_1.expect)(response.body).to.have.property('estimatedCost');
            (0, chai_1.expect)(response.body).to.have.property('estimatedLatency');
            (0, chai_1.expect)(response.body).to.have.property('routingReason');
        });
        (0, mocha_1.it)('should track Thompson sampling performance', async () => {
            const response = await api
                .get('/api/maestro/v1/routing/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('models');
            (0, chai_1.expect)(response.body).to.have.property('performance');
            (0, chai_1.expect)(response.body).to.have.property('costEfficiency');
            (0, chai_1.expect)(response.body.models).to.be.an('array');
        });
    });
    (0, mocha_1.describe)('🛡️ Compliance & Policy Enforcement', () => {
        (0, mocha_1.it)('should evaluate policy decisions', async () => {
            const policyRequest = {
                subject: 'test-user',
                action: 'data:export',
                resource: 'sensitive-dataset',
                context: {
                    purpose: 'intelligence_analysis',
                    environment: 'test',
                },
            };
            const response = await api
                .post('/api/maestro/v1/policy/evaluate')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(policyRequest)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('allowed');
            (0, chai_1.expect)(response.body).to.have.property('reason');
            (0, chai_1.expect)(response.body).to.have.property('riskScore');
        });
        (0, mocha_1.it)('should generate compliance reports', async () => {
            const reportRequest = {
                framework: 'SOC2',
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
            };
            const response = await api
                .post('/api/maestro/v1/compliance/reports')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(reportRequest)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('framework', 'SOC2');
            (0, chai_1.expect)(response.body).to.have.property('summary');
            (0, chai_1.expect)(response.body).to.have.property('violations');
            (0, chai_1.expect)(response.body).to.have.property('recommendations');
        });
    });
    (0, mocha_1.describe)('📊 Audit & Logging System', () => {
        (0, mocha_1.it)('should record audit events', async () => {
            const auditEvent = {
                eventType: 'user_action',
                level: 'info',
                action: 'integration_test_execution',
                message: 'End-to-end integration test executed',
                details: {
                    testSuite: 'e2e-integration',
                    correlationId: testCorrelationId,
                },
                complianceRelevant: true,
                complianceFrameworks: ['SOC2'],
            };
            const response = await api
                .post('/api/maestro/v1/audit/events')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(auditEvent)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(201);
            (0, chai_1.expect)(response.body).to.have.property('eventId');
        });
        (0, mocha_1.it)('should query audit events', async () => {
            const query = {
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                endTime: new Date().toISOString(),
                correlationIds: [testCorrelationId],
                limit: 100,
            };
            const response = await api
                .get('/api/maestro/v1/audit/events')
                .query(query)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('events');
            (0, chai_1.expect)(response.body.events).to.be.an('array');
        });
        (0, mocha_1.it)('should verify audit trail integrity', async () => {
            const response = await api
                .post('/api/maestro/v1/audit/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send({
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
            })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('valid');
            (0, chai_1.expect)(response.body).to.have.property('totalEvents');
            (0, chai_1.expect)(response.body).to.have.property('validEvents');
            (0, chai_1.expect)(response.body).to.have.property('invalidEvents');
        });
    });
    (0, mocha_1.describe)('🔗 SIG Integration Contracts', () => {
        (0, mocha_1.it)('should register evidence through SIG API', async () => {
            const evidenceData = {
                sourceId: 'test-source-001',
                data: Buffer.from('Test evidence data').toString('base64'),
                contentType: 'text/plain',
                license: 'internal-use-only',
                transforms: [
                    {
                        operation: 'normalization',
                        algorithm: 'standard',
                        parameters: {},
                    },
                ],
                metadata: {
                    classification: 'internal',
                    tags: ['test', 'integration'],
                },
            };
            const response = await api
                .post('/api/sig/v1/evidence/register')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send(evidenceData)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(201);
            (0, chai_1.expect)(response.body).to.have.property('evidenceId');
            (0, chai_1.expect)(response.body).to.have.property('checksum');
            (0, chai_1.expect)(response.body).to.have.property('receipt');
        });
        (0, mocha_1.it)('should validate provenance chain', async () => {
            const response = await api
                .get('/api/sig/v1/provenance/validate')
                .query({ correlationId: testCorrelationId })
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('valid');
            (0, chai_1.expect)(response.body).to.have.property('chain');
            (0, chai_1.expect)(response.body.chain).to.be.an('array');
        });
    });
    (0, mocha_1.describe)('📈 Performance & Monitoring', () => {
        (0, mocha_1.it)('should retrieve system metrics', async () => {
            const response = await api
                .get('/api/maestro/v1/metrics')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('system');
            (0, chai_1.expect)(response.body).to.have.property('database');
            (0, chai_1.expect)(response.body).to.have.property('orchestration');
            (0, chai_1.expect)(response.body).to.have.property('timestamp');
        });
        (0, mocha_1.it)('should handle concurrent requests efficiently', async function () {
            this.timeout(60000); // 1 minute for concurrent test
            const concurrentRequests = Array.from({ length: 10 }, (_, i) => api
                .get('/api/health')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', `${testCorrelationId}-${i}`)
                .timeout(TEST_CONFIG.api.timeout));
            const results = await Promise.allSettled(concurrentRequests);
            const successful = results.filter((r) => r.status === 'fulfilled').length;
            (0, chai_1.expect)(successful).to.be.at.least(8); // At least 80% success rate
        });
    });
    (0, mocha_1.describe)('🚨 Error Handling & Resilience', () => {
        (0, mocha_1.it)('should handle graceful degradation', async () => {
            // Simulate high load condition
            const response = await api
                .get('/api/health')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .set('X-Load-Test', 'true')
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.be.oneOf([200, 503]); // Healthy or service unavailable
            if (response.status === 503) {
                (0, chai_1.expect)(response.body).to.have.property('message');
                (0, chai_1.expect)(response.body.message).to.include('service temporarily unavailable');
            }
        });
        (0, mocha_1.it)('should implement circuit breaker pattern', async () => {
            const response = await api
                .get('/api/maestro/v1/circuit-breaker/status')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(response.status).to.equal(200);
            (0, chai_1.expect)(response.body).to.have.property('circuits');
            (0, chai_1.expect)(response.body.circuits).to.be.an('object');
        });
    });
    (0, mocha_1.describe)('🔄 End-to-End Workflow', () => {
        (0, mocha_1.it)('should execute complete intelligence analysis workflow', async function () {
            this.timeout(120000); // 2 minutes for full workflow
            console.log('🚀 Starting complete workflow test...');
            // Step 1: Create investigation workspace
            const workspaceResponse = await api
                .post('/api/investigations')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send({
                name: `E2E Test Investigation ${Date.now()}`,
                description: 'End-to-end workflow test',
            })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(workspaceResponse.status).to.equal(201);
            const workspaceId = workspaceResponse.body.id;
            // Step 2: Initiate autonomous analysis
            const analysisResponse = await api
                .post(`/api/investigations/${workspaceId}/analyze`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .send({
                goal: 'Perform comprehensive analysis of test dataset',
                autonomy: 3,
                budgets: {
                    tokens: 100000,
                    usd: 50.0,
                    timeMinutes: 60,
                },
            })
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(analysisResponse.status).to.equal(202);
            const analysisId = analysisResponse.body.analysisId;
            // Step 3: Monitor progress
            let analysisComplete = false;
            let attempts = 0;
            const maxAttempts = 20; // 2 minutes max wait
            while (!analysisComplete && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 6000)); // 6 second intervals
                const statusResponse = await api
                    .get(`/api/investigations/${workspaceId}/analyses/${analysisId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('X-Correlation-ID', testCorrelationId)
                    .timeout(TEST_CONFIG.api.timeout);
                (0, chai_1.expect)(statusResponse.status).to.equal(200);
                const status = statusResponse.body.status;
                console.log(`📊 Analysis status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
                if (status === 'completed' || status === 'failed') {
                    analysisComplete = true;
                    (0, chai_1.expect)(status).to.equal('completed');
                }
                attempts++;
            }
            (0, chai_1.expect)(analysisComplete).to.be.true;
            // Step 4: Verify results and artifacts
            const resultsResponse = await api
                .get(`/api/investigations/${workspaceId}/results`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Correlation-ID', testCorrelationId)
                .timeout(TEST_CONFIG.api.timeout);
            (0, chai_1.expect)(resultsResponse.status).to.equal(200);
            (0, chai_1.expect)(resultsResponse.body).to.have.property('results');
            (0, chai_1.expect)(resultsResponse.body).to.have.property('artifacts');
            (0, chai_1.expect)(resultsResponse.body).to.have.property('provenance');
            console.log('✅ Complete workflow test successful!');
        });
    });
});
// Test utilities
class TestUtils {
    static async waitForCondition(condition, timeout = 30000, interval = 1000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
        return false;
    }
    static generateTestData(type) {
        const timestamp = Date.now();
        switch (type) {
            case 'entity':
                return {
                    type: 'TestEntity',
                    properties: {
                        name: `Test Entity ${timestamp}`,
                        category: 'test',
                        created: new Date().toISOString(),
                    },
                };
            case 'relationship':
                return {
                    type: 'RELATED_TO',
                    properties: {
                        strength: Math.random(),
                        created: new Date().toISOString(),
                    },
                };
            case 'graph':
                return {
                    name: `Test Graph ${timestamp}`,
                    description: 'Generated test graph',
                    settings: {
                        privacy: 'private',
                        collaboration: false,
                    },
                };
            default:
                throw new Error(`Unknown test data type: ${type}`);
        }
    }
}
exports.TestUtils = TestUtils;
