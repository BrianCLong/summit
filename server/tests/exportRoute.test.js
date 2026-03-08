"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../src/app.js");
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
function sign(params, secret) {
    const base = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
    return crypto_1.default.createHmac('sha256', secret).update(base).digest('hex');
}
describeIf('GET /export/provenance', () => {
    const secret = 'test-secret';
    const baseParams = {
        scope: 'investigation',
        id: 'inv1',
        format: 'json',
        ts: String(Date.now()),
        tenant: 'tenant-1',
        reasonCodeIn: '',
    };
    let app;
    (0, globals_1.beforeAll)(async () => {
        process.env.EXPORT_SIGNING_SECRET = secret;
        app = await (0, app_js_1.createApp)();
    });
    (0, globals_1.test)('400 when tenant missing', async () => {
        const params = { ...baseParams };
        const sig = sign(params, secret);
        const res = await (0, supertest_1.default)(app)
            .get('/export/provenance')
            .query({ ...params, sig })
            .set('x-tenant-id', '');
        (0, globals_1.expect)(res.status).toBe(400);
    });
    (0, globals_1.test)('403 when tenant mismatch', async () => {
        const params = { ...baseParams };
        const sig = sign(params, secret);
        const res = await (0, supertest_1.default)(app)
            .get('/export/provenance')
            .query({ ...params, sig })
            .set('x-tenant-id', 'wrong');
        (0, globals_1.expect)(res.status).toBe(403);
    });
    (0, globals_1.test)('403 when signature invalid', async () => {
        const params = { ...baseParams };
        const res = await (0, supertest_1.default)(app)
            .get('/export/provenance')
            .query({ ...params, sig: 'bad' })
            .set('x-tenant-id', params.tenant);
        (0, globals_1.expect)(res.status).toBe(403);
    });
    (0, globals_1.test)('403 when expired', async () => {
        const params = {
            ...baseParams,
            ts: String(Date.now() - 16 * 60 * 1000),
        };
        const sig = sign(params, secret);
        const res = await (0, supertest_1.default)(app)
            .get('/export/provenance')
            .query({ ...params, sig })
            .set('x-tenant-id', params.tenant);
        (0, globals_1.expect)(res.status).toBe(403);
    });
});
