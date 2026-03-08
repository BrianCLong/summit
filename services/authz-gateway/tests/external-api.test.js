"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const index_1 = require("../src/index");
const api_keys_1 = require("../src/api-keys");
const observability_1 = require("../src/observability");
const eventsPath = path_1.default.join(__dirname, 'fixtures', 'api-events.log');
let opaServer;
beforeAll((done) => {
    const opa = (0, express_1.default)();
    opa.use(express_1.default.json());
    opa.post('/v1/data/summit/abac/decision', (_req, res) => {
        res.json({ result: { allow: true, reason: 'allow', obligations: [] } });
    });
    opaServer = opa.listen(0, () => {
        const port = opaServer.address().port;
        process.env.OPA_URL = `http://localhost:${port}/v1/data/summit/abac/decision`;
        done();
    });
});
afterAll(async () => {
    opaServer.close();
    if (fs_1.default.existsSync(eventsPath)) {
        fs_1.default.unlinkSync(eventsPath);
    }
    await (0, observability_1.stopObservability)();
});
beforeEach(() => {
    if (fs_1.default.existsSync(eventsPath)) {
        fs_1.default.unlinkSync(eventsPath);
    }
    process.env.API_EVENT_LOG = eventsPath;
    process.env.API_RATE_WINDOW_MS = '1000';
    process.env.API_QUOTA_WINDOW_MS = '60000';
});
afterEach(() => {
    delete process.env.API_EVENT_LOG;
    delete process.env.API_RATE_LIMIT;
    delete process.env.API_RATE_WINDOW_MS;
    delete process.env.API_QUOTA_LIMIT;
    delete process.env.API_QUOTA_WINDOW_MS;
});
describe('external decision API', () => {
    it('returns decision payloads with governance headers and audit trail', async () => {
        process.env.API_RATE_LIMIT = '5';
        process.env.API_QUOTA_LIMIT = '5';
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .post('/v1/companyos/decisions:check')
            .set('x-api-key', api_keys_1.TEST_API_KEY)
            .send({ subject: { id: 'alice' }, action: 'dataset:read' });
        expect(res.status).toBe(200);
        expect(res.body.trace_id).toBeTruthy();
        expect(res.headers['x-ratelimit-limit']).toBe('5');
        expect(res.headers['x-quota-limit']).toBe('5');
        const events = fs_1.default
            .readFileSync(eventsPath, 'utf8')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
        expect(events[0].apiMethod).toBe('companyos.decisions.check');
        expect(events[0].statusCode).toBe(200);
    });
    it('enforces per-key rate limits', async () => {
        process.env.API_RATE_LIMIT = '1';
        process.env.API_QUOTA_LIMIT = '5';
        const app = await (0, index_1.createApp)();
        const first = await (0, supertest_1.default)(app)
            .post('/v1/companyos/decisions:check')
            .set('x-api-key', api_keys_1.TEST_API_KEY)
            .send({ subject: { id: 'alice' }, action: 'dataset:read' });
        expect(first.status).toBe(200);
        const second = await (0, supertest_1.default)(app)
            .post('/v1/companyos/decisions:check')
            .set('x-api-key', api_keys_1.TEST_API_KEY)
            .send({ subject: { id: 'alice' }, action: 'dataset:read' });
        expect(second.status).toBe(429);
        expect(second.body.error).toBe('rate_limit_exceeded');
        expect(second.headers['x-ratelimit-remaining']).toBe('0');
    });
    it('enforces quotas with explicit headers', async () => {
        process.env.API_RATE_LIMIT = '5';
        process.env.API_QUOTA_LIMIT = '1';
        const app = await (0, index_1.createApp)();
        const first = await (0, supertest_1.default)(app)
            .post('/v1/companyos/decisions:check')
            .set('x-api-key', api_keys_1.TEST_API_KEY)
            .send({ subject: { id: 'alice' }, action: 'dataset:read' });
        expect(first.status).toBe(200);
        const second = await (0, supertest_1.default)(app)
            .post('/v1/companyos/decisions:check')
            .set('x-api-key', api_keys_1.TEST_API_KEY)
            .send({ subject: { id: 'alice' }, action: 'dataset:read' });
        expect(second.status).toBe(429);
        expect(second.body.error).toBe('quota_exhausted');
        expect(second.headers['x-quota-remaining']).toBe('0');
    });
});
