"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../index.js");
(0, vitest_1.describe)('Citizen Service API', () => {
    (0, vitest_1.describe)('GET /health', () => {
        (0, vitest_1.it)('should return healthy status', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/health');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('healthy');
        });
    });
    (0, vitest_1.describe)('POST /api/v1/citizens', () => {
        (0, vitest_1.it)('should register a new citizen', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app)
                .post('/api/v1/citizens')
                .send({
                nationalId: 'API-001',
                firstName: 'API',
                lastName: 'Test',
                source: 'test',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body).toHaveProperty('id');
            (0, vitest_1.expect)(res.body.nationalId).toBe('API-001');
        });
        (0, vitest_1.it)('should reject invalid data', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app)
                .post('/api/v1/citizens')
                .send({
                firstName: 'Missing',
                // missing nationalId and lastName
            });
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body).toHaveProperty('error');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/citizens/:id', () => {
        (0, vitest_1.it)('should return 404 for non-existent citizen', async () => {
            const res = await (0, supertest_1.default)(index_js_1.app).get('/api/v1/citizens/00000000-0000-0000-0000-000000000000');
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
