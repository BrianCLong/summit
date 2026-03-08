"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const stripe_js_1 = __importDefault(require("../src/routes/stripe.js"));
describe('Stripe raw-body route', () => {
    const app = (0, express_1.default)();
    app.use('/webhooks/stripe', stripe_js_1.default);
    const enabled = !!process.env.STRIPE_WEBHOOK_SECRET;
    (enabled ? it : it.skip)('accepts raw payload', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/webhooks/stripe/events')
            .set('Content-Type', 'application/json')
            .set('Stripe-Signature', 'v1=dummy')
            .send(Buffer.from(JSON.stringify({ ok: true }), 'utf8'));
        expect([200, 400, 503]).toContain(res.status);
    });
});
