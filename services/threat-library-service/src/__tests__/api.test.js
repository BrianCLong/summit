"use strict";
/**
 * API Integration Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const server_js_1 = require("../server.js");
const repository_js_1 = require("../repository.js");
(0, globals_1.describe)('Threat Library API', () => {
    (0, globals_1.beforeEach)(() => {
        (0, repository_js_1.resetRepository)();
    });
    (0, globals_1.afterEach)(() => {
        (0, repository_js_1.resetRepository)();
    });
    (0, globals_1.describe)('Health Endpoints', () => {
        (0, globals_1.it)('GET /health should return healthy status', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app).get('/health');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.status).toBe('healthy');
            (0, globals_1.expect)(response.body.service).toBe('threat-library-service');
        });
        (0, globals_1.it)('GET /health/ready should return ready status', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app).get('/health/ready');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.status).toBe('ready');
            (0, globals_1.expect)(response.body.statistics).toBeDefined();
        });
    });
    (0, globals_1.describe)('Threat Archetype Endpoints', () => {
        const validThreat = {
            name: 'Test APT',
            description: 'Test description',
            summary: 'Test summary',
            sophistication: 'ADVANCED',
            motivation: ['ESPIONAGE'],
            targetSectors: ['GOVERNMENT'],
            typicalTTPs: [],
            patternTemplates: [],
            indicators: [],
            countermeasures: [
                { id: 'c1', name: 'Counter', description: 'Test', effectiveness: 'HIGH' },
            ],
            riskScore: 75,
            prevalence: 'COMMON',
            active: true,
            status: 'ACTIVE',
        };
        (0, globals_1.it)('POST /api/v1/threats should create a threat', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test-user')
                .send(validThreat);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.name).toBe('Test APT');
            (0, globals_1.expect)(response.body.data.id).toBeDefined();
        });
        (0, globals_1.it)('GET /api/v1/threats should list threats', async () => {
            // Create a threat first
            await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send(validThreat);
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/threats');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.items.length).toBe(1);
        });
        (0, globals_1.it)('GET /api/v1/threats/:id should get a specific threat', async () => {
            const createResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send(validThreat);
            const threatId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app).get(`/api/v1/threats/${threatId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.id).toBe(threatId);
        });
        (0, globals_1.it)('GET /api/v1/threats/:id should return 404 for non-existent threat', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/threats/non-existent-id');
            (0, globals_1.expect)(response.status).toBe(404);
            (0, globals_1.expect)(response.body.success).toBe(false);
            (0, globals_1.expect)(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
        });
        (0, globals_1.it)('PUT /api/v1/threats/:id should update a threat', async () => {
            const createResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send(validThreat);
            const threatId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app)
                .put(`/api/v1/threats/${threatId}`)
                .set('x-author', 'updater')
                .set('x-change-description', 'Updated name')
                .send({ name: 'Updated APT' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.name).toBe('Updated APT');
            (0, globals_1.expect)(response.body.data.metadata.version).toBe(2);
        });
        (0, globals_1.it)('POST /api/v1/threats/:id/deprecate should deprecate a threat', async () => {
            const createResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send(validThreat);
            const threatId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app)
                .post(`/api/v1/threats/${threatId}/deprecate`)
                .set('x-author', 'deprecator');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.status).toBe('DEPRECATED');
        });
        (0, globals_1.it)('DELETE /api/v1/threats/:id should archive a threat', async () => {
            const createResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send(validThreat);
            const threatId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app)
                .delete(`/api/v1/threats/${threatId}`)
                .set('x-author', 'archiver');
            (0, globals_1.expect)(response.status).toBe(204);
            // Verify it's archived
            const getResponse = await (0, supertest_1.default)(server_js_1.app).get(`/api/v1/threats/${threatId}`);
            (0, globals_1.expect)(getResponse.body.data.status).toBe('ARCHIVED');
        });
        (0, globals_1.it)('GET /api/v1/threats should filter by status', async () => {
            await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send(validThreat);
            await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send({ ...validThreat, name: 'Deprecated', status: 'DEPRECATED' });
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/threats?status=ACTIVE');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.items.length).toBe(1);
            (0, globals_1.expect)(response.body.data.items[0].name).toBe('Test APT');
        });
        (0, globals_1.it)('GET /api/v1/threats should support pagination', async () => {
            // Create 5 threats
            for (let i = 0; i < 5; i++) {
                await (0, supertest_1.default)(server_js_1.app)
                    .post('/api/v1/threats')
                    .set('x-author', 'test')
                    .send({ ...validThreat, name: `Threat ${i}` });
            }
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/threats?page=1&limit=2');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.items.length).toBe(2);
            (0, globals_1.expect)(response.body.data.pagination.total).toBe(5);
            (0, globals_1.expect)(response.body.data.pagination.totalPages).toBe(3);
        });
    });
    (0, globals_1.describe)('TTP Endpoints', () => {
        const validTTP = {
            name: 'Test TTP',
            description: 'Test TTP description',
            tactic: 'INITIAL_ACCESS',
            techniqueId: 'T1566',
            techniqueName: 'Phishing',
            procedures: [],
            platforms: ['WINDOWS'],
            dataSources: ['Email'],
            mitreReference: {
                techniqueId: 'T1566',
                techniqueName: 'Phishing',
                tacticIds: ['TA0001'],
                mitreUrl: 'https://attack.mitre.org/techniques/T1566/',
            },
            severity: 'HIGH',
            prevalence: 'COMMON',
            status: 'ACTIVE',
        };
        (0, globals_1.it)('POST /api/v1/ttps should create a TTP', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/ttps')
                .set('x-author', 'test')
                .send(validTTP);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.data.techniqueId).toBe('T1566');
        });
        (0, globals_1.it)('GET /api/v1/ttps should list TTPs', async () => {
            await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/ttps')
                .set('x-author', 'test')
                .send(validTTP);
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/ttps');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.items.length).toBe(1);
        });
        (0, globals_1.it)('GET /api/v1/ttps/technique/:techniqueId should get TTPs by technique', async () => {
            await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/ttps')
                .set('x-author', 'test')
                .send(validTTP);
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/ttps/technique/T1566');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.length).toBe(1);
        });
    });
    (0, globals_1.describe)('Pattern Endpoints', () => {
        const validPattern = {
            name: 'Test Pattern',
            description: 'Test pattern',
            category: 'LATERAL_MOVEMENT',
            graphMotifs: [
                {
                    id: 'motif-1',
                    name: 'Test Motif',
                    description: 'Test',
                    nodes: [{ id: 'n1', type: 'THREAT_ACTOR' }],
                    edges: [],
                    weight: 1,
                },
            ],
            signals: [],
            indicators: [],
            ttps: [],
            requiredMotifMatches: 1,
            requiredSignalMatches: 0,
            severity: 'HIGH',
            status: 'ACTIVE',
        };
        (0, globals_1.it)('POST /api/v1/patterns should create a pattern', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/patterns')
                .set('x-author', 'test')
                .send(validPattern);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.data.name).toBe('Test Pattern');
        });
        (0, globals_1.it)('GET /api/v1/patterns/:id/validate should validate pattern coverage', async () => {
            const createResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/patterns')
                .set('x-author', 'test')
                .send(validPattern);
            const patternId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app).get(`/api/v1/patterns/${patternId}/validate`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.coverage).toBeDefined();
            (0, globals_1.expect)(response.body.data.coverage.hasGraphMotifs).toBe(true);
        });
    });
    (0, globals_1.describe)('Indicator Endpoints', () => {
        const validIndicator = {
            name: 'Test Indicator',
            description: 'Test indicator',
            type: 'IP_ADDRESS',
            pattern: '10.0.0.0/8',
            patternFormat: 'LITERAL',
            confidence: 'HIGH',
            severity: 'MEDIUM',
            validFrom: new Date().toISOString(),
            status: 'ACTIVE',
        };
        (0, globals_1.it)('POST /api/v1/indicators should create an indicator', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/indicators')
                .set('x-author', 'test')
                .send(validIndicator);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.data.type).toBe('IP_ADDRESS');
        });
        (0, globals_1.it)('GET /api/v1/indicators should list indicators', async () => {
            await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/indicators')
                .set('x-author', 'test')
                .send(validIndicator);
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/indicators');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.items.length).toBe(1);
        });
    });
    (0, globals_1.describe)('Detection Integration Endpoints', () => {
        (0, globals_1.it)('POST /api/v1/evaluate should generate pattern evaluation spec', async () => {
            // Create pattern first
            const patternResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/patterns')
                .set('x-author', 'test')
                .send({
                name: 'Test Pattern',
                description: 'Test pattern',
                category: 'LATERAL_MOVEMENT',
                graphMotifs: [
                    {
                        id: 'motif-1',
                        name: 'Test Motif',
                        description: 'Test',
                        nodes: [
                            { id: 'n1', type: 'THREAT_ACTOR' },
                            { id: 'n2', type: 'ASSET' },
                        ],
                        edges: [
                            {
                                id: 'e1',
                                sourceNodeId: 'n1',
                                targetNodeId: 'n2',
                                type: 'TARGETS',
                                direction: 'OUTGOING',
                            },
                        ],
                        weight: 1,
                    },
                ],
                signals: [],
                indicators: [],
                ttps: [],
                requiredMotifMatches: 1,
                requiredSignalMatches: 0,
                severity: 'HIGH',
                status: 'ACTIVE',
            });
            const patternId = patternResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app).post('/api/v1/evaluate').send({
                patternId,
                evaluationOptions: {
                    maxMatches: 50,
                    minConfidence: 0.5,
                    includePartialMatches: false,
                    timeout: 30000,
                },
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.specId).toBeDefined();
            (0, globals_1.expect)(response.body.data.cypherQueries.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Explanation Endpoints', () => {
        (0, globals_1.it)('GET /api/v1/threats/:threatId/explain should generate explanation', async () => {
            const threatResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send({
                name: 'Test APT',
                description: 'Test description',
                summary: 'Test summary',
                sophistication: 'EXPERT',
                motivation: ['ESPIONAGE'],
                targetSectors: ['GOVERNMENT'],
                typicalTTPs: [],
                patternTemplates: [],
                indicators: [],
                countermeasures: [
                    { id: 'c1', name: 'Counter', description: 'Test', effectiveness: 'HIGH' },
                ],
                riskScore: 85,
                prevalence: 'COMMON',
                active: true,
                status: 'ACTIVE',
            });
            const threatId = threatResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app).get(`/api/v1/threats/${threatId}/explain`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.threatId).toBe(threatId);
            (0, globals_1.expect)(response.body.data.explanation).toBeDefined();
            (0, globals_1.expect)(response.body.data.severity).toBe('CRITICAL');
        });
        (0, globals_1.it)('GET /api/v1/threats/:threatId/explain/brief should generate brief explanation', async () => {
            const threatResponse = await (0, supertest_1.default)(server_js_1.app)
                .post('/api/v1/threats')
                .set('x-author', 'test')
                .send({
                name: 'Test APT',
                description: 'Test description',
                summary: 'Brief summary',
                sophistication: 'ADVANCED',
                motivation: ['FINANCIAL_GAIN'],
                targetSectors: ['FINANCIAL'],
                typicalTTPs: [],
                patternTemplates: [],
                indicators: [],
                countermeasures: [],
                riskScore: 60,
                prevalence: 'COMMON',
                active: true,
                status: 'ACTIVE',
            });
            const threatId = threatResponse.body.data.id;
            const response = await (0, supertest_1.default)(server_js_1.app).get(`/api/v1/threats/${threatId}/explain/brief`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.summary).toBe('Brief summary');
            (0, globals_1.expect)(response.body.data.severity).toBe('HIGH');
        });
    });
    (0, globals_1.describe)('Statistics Endpoint', () => {
        (0, globals_1.it)('GET /api/v1/statistics should return library statistics', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/statistics');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.threatArchetypes).toBeDefined();
            (0, globals_1.expect)(response.body.data.ttps).toBeDefined();
            (0, globals_1.expect)(response.body.data.patterns).toBeDefined();
            (0, globals_1.expect)(response.body.data.indicators).toBeDefined();
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should return 404 for unknown endpoints', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app).get('/api/v1/unknown');
            (0, globals_1.expect)(response.status).toBe(404);
            (0, globals_1.expect)(response.body.error.code).toBe('NOT_FOUND');
        });
        (0, globals_1.it)('should handle validation errors', async () => {
            const response = await (0, supertest_1.default)(server_js_1.app).post('/api/v1/evaluate').send({
                // Missing required fields
                evaluationOptions: {},
            });
            (0, globals_1.expect)(response.status).toBe(400);
        });
    });
});
