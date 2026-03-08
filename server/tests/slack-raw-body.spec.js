"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const slack_js_1 = __importDefault(require("../src/routes/slack.js"));
describe('Slack raw-body route', () => {
    const app = (0, express_1.default)();
    app.use('/', slack_js_1.default);
    const HAS_SECRET = !!process.env.SLACK_SIGNING_SECRET;
    (HAS_SECRET ? it : it.skip)('accepts raw payload with valid signature', async () => {
        const bodyObj = { type: 'url_verification' };
        const raw = Buffer.from(JSON.stringify(bodyObj), 'utf8');
        const ts = Math.floor(Date.now() / 1000).toString();
        const base = `v0:${ts}:${raw.toString()}`;
        const hmac = crypto_1.default
            .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
            .update(base)
            .digest('hex');
        const sig = `v0=${hmac}`;
        const res = await (0, supertest_1.default)(app)
            .post('/webhooks/slack')
            .set('Content-Type', 'application/json')
            .set('x-slack-request-timestamp', ts)
            .set('x-slack-signature', sig)
            .send(raw);
        expect([200, 204, 503]).toContain(res.status);
    });
});
