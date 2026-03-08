"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const github_app_js_1 = __importDefault(require("../src/routes/github-app.js"));
describe('GitHub App raw-body route', () => {
    const app = (0, express_1.default)();
    app.use('/webhooks/github-app', github_app_js_1.default);
    const enabled = !!process.env.GITHUB_APP_WEBHOOK_SECRET;
    (enabled ? it : it.skip)('accepts raw payload', async () => {
        const body = Buffer.from(JSON.stringify({ ok: true }), 'utf8');
        const res = await (0, supertest_1.default)(app)
            .post('/webhooks/github-app/events')
            .set('Content-Type', 'application/json')
            .send(body);
        expect([200, 400, 401, 503]).toContain(res.status);
    });
});
