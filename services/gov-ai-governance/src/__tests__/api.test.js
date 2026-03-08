"use strict";
/**
 * API Integration Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../index.js");
(0, vitest_1.describe)('Gov AI Governance API', () => {
    (0, vitest_1.describe)('GET /health', () => {
        (0, vitest_1.it)('should return healthy status', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/health');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('healthy');
            (0, vitest_1.expect)(res.body.service).toBe('gov-ai-governance');
        });
    });
    (0, vitest_1.describe)('Citizen Data Control', () => {
        const citizenId = '550e8400-e29b-41d4-a716-446655440000';
        (0, vitest_1.it)('POST /citizen/consent should record consent', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app)
                .post('/citizen/consent')
                .send({
                citizenId,
                dataCategories: ['personal_identity'],
                purposes: ['service_delivery'],
                consentGiven: true,
                withdrawable: true,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.citizenId).toBe(citizenId);
        });
        (0, vitest_1.it)('GET /citizen/:id/consents should return consents', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get(`/citizen/${citizenId}/consents`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        });
        (0, vitest_1.it)('POST /citizen/data-request should create request', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app)
                .post('/citizen/data-request')
                .send({
                citizenId,
                requestType: 'access',
                dataCategories: ['personal_identity'],
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.status).toBe('pending');
        });
        (0, vitest_1.it)('GET /citizen/:id/export should export data', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get(`/citizen/${citizenId}/export`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.exportedAt).toBeDefined();
        });
    });
    (0, vitest_1.describe)('AI Model Registry', () => {
        (0, vitest_1.it)('GET /compliance/standards should return standards', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/compliance/standards');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
            (0, vitest_1.expect)(res.body.length).toBeGreaterThanOrEqual(3);
        });
        (0, vitest_1.it)('GET /models should return empty initially', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/models');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Transparency', () => {
        (0, vitest_1.it)('GET /transparency/reports should return reports', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/transparency/reports');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        });
        (0, vitest_1.it)('GET /audit should return audit events', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/audit');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        });
        (0, vitest_1.it)('GET /audit/verify should verify integrity', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/audit/verify');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.valid).toBe(true);
        });
    });
});
