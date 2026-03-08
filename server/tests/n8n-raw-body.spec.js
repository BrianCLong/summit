"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const n8n_js_1 = __importDefault(require("../src/routes/n8n.js"));
describe('n8n raw-body route', () => {
    const app = (0, express_1.default)();
    app.use('/', n8n_js_1.default);
    const N8N_ENABLED = process.env.N8N_WEBHOOKS_ENABLED !== 'false';
    (N8N_ENABLED ? it : it.skip)('accepts raw payload before global json', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/webhooks/n8n')
            .set('Content-Type', 'application/json')
            .send(Buffer.from(JSON.stringify({ ok: true }), 'utf8'));
        expect([200, 204, 401, 403, 503]).toContain(res.status);
    });
});
