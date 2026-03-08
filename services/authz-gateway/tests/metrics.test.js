"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const observability_1 = require("../src/observability");
describe('metrics', () => {
    beforeAll(() => {
        process.env.AUTHZ_DEMO_USERNAME = 'alice';
        process.env.AUTHZ_DEMO_PASSWORD = 'password123';
    });
    afterAll(async () => {
        delete process.env.AUTHZ_DEMO_USERNAME;
        delete process.env.AUTHZ_DEMO_PASSWORD;
        await (0, observability_1.stopObservability)();
    });
    it('exposes prometheus metrics', async () => {
        const app = await (0, index_1.createApp)();
        await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const res = await (0, supertest_1.default)(app).get('/metrics');
        expect(res.status).toBe(200);
        expect(res.text).toContain('process_cpu_user_seconds_total');
        expect(res.text).toContain('authz_gateway_requests_total');
        expect(res.text).toContain('authz_gateway_request_duration_seconds');
        expect(res.text).toContain('authz_gateway_active_requests');
    });
});
