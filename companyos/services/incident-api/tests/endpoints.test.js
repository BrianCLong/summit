"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const index_1 = __importDefault(require("../src/index"));
const incident_service_1 = require("../src/services/incident.service");
const axios_1 = __importDefault(require("axios"));
// Mock the axios library
vitest_1.vi.mock('axios');
const mockedAxios = vitest_1.vi.mocked(axios_1.default);
(0, vitest_1.describe)('Incident API', () => {
    const incidentService = new incident_service_1.IncidentService();
    let createdIncidentId;
    (0, vitest_1.beforeAll)(() => {
        // Always return a successful authorization from the mock
        mockedAxios.post.mockResolvedValue({ data: { result: true } });
        // Seed an incident for GET and PATCH tests
        const incident = incidentService.createIncident({
            tenant_id: 'tenant-123',
            title: 'Initial Incident',
            severity: 'high',
            owner_id: 'user-456',
            tags: ['initial-tag'],
        });
        createdIncidentId = incident.id;
    });
    (0, vitest_1.describe)('POST /incidents', () => {
        (0, vitest_1.it)('should create a new incident and return it', async () => {
            const incidentData = {
                tenant_id: 'tenant-123',
                title: 'Critical System Outage',
                description: 'The primary database is unresponsive.',
                severity: 'critical',
                owner_id: 'user-456',
                tags: ['database', 'critical-impact'],
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/incidents')
                .send(incidentData)
                .set('Accept', 'application/json');
            (0, vitest_1.expect)(response.status).toBe(201);
            (0, vitest_1.expect)(response.body.message).toBe('Incident created successfully');
            (0, vitest_1.expect)(response.body.data).toBeInstanceOf(Object);
            (0, vitest_1.expect)(response.body.data.id).toBeDefined();
            (0, vitest_1.expect)(response.body.data.status).toBe('open');
            (0, vitest_1.expect)(response.body.data.title).toBe(incidentData.title);
        });
        (0, vitest_1.it)('should return a 400 Bad Request if required fields are missing', async () => {
            const incidentData = {
                tenant_id: 'tenant-123',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/incidents')
                .send(incidentData)
                .set('Accept', 'application/json');
            (0, vitest_1.expect)(response.status).toBe(400);
        });
    });
    (0, vitest_1.describe)('GET /incidents', () => {
        (0, vitest_1.it)('should return a list of incidents', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/incidents')
                .set('x-tenant-id', 'tenant-123');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data).toBeInstanceOf(Array);
            (0, vitest_1.expect)(response.body.data.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should filter incidents by tag', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/incidents?tag=initial-tag')
                .set('x-tenant-id', 'tenant-123');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data).toBeInstanceOf(Array);
            (0, vitest_1.expect)(response.body.data[0].tags).toContain('initial-tag');
        });
    });
    (0, vitest_1.describe)('GET /incidents/:id', () => {
        (0, vitest_1.it)('should return a single incident', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/incidents/${createdIncidentId}`)
                .set('x-tenant-id', 'tenant-123');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.id).toBe(createdIncidentId);
        });
        (0, vitest_1.it)('should return 404 for a non-existent incident', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/incidents/non-existent-id')
                .set('x-tenant-id', 'tenant-123');
            (0, vitest_1.expect)(response.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('PATCH /incidents/:id', () => {
        (0, vitest_1.it)('should update an incident', async () => {
            const updates = {
                status: 'investigating',
                severity: 'medium',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .patch(`/incidents/${createdIncidentId}`)
                .send(updates)
                .set('x-tenant-id', 'tenant-123');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.status).toBe(updates.status);
            (0, vitest_1.expect)(response.body.data.severity).toBe(updates.severity);
        });
        (0, vitest_1.it)('should return 404 for a non-existent incident', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .patch('/incidents/non-existent-id')
                .send({ status: 'closed' })
                .set('x-tenant-id', 'tenant-123');
            (0, vitest_1.expect)(response.status).toBe(404);
        });
    });
});
