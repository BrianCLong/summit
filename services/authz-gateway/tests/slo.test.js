"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const slo_1 = require("../src/slo");
describe('SLO tracker', () => {
    beforeEach(() => {
        (0, slo_1.resetSloTracker)();
    });
    it('computes percentiles and error rate per tenant', () => {
        slo_1.sloTracker.record('tenant-a', '/route', 0.05, 200);
        slo_1.sloTracker.record('tenant-a', '/route', 0.5, 503);
        slo_1.sloTracker.record('tenant-a', '/route', 0.2, 200);
        const snapshot = slo_1.sloTracker.snapshot('tenant-a', '/route');
        expect(snapshot.requestCount).toBe(3);
        expect(snapshot.errorRate).toBeCloseTo(1 / 3);
        expect(snapshot.latency.p50).toBeGreaterThan(0.05);
        expect(snapshot.latency.p95).toBeGreaterThanOrEqual(snapshot.latency.p50);
        expect(snapshot.availability).toBeCloseTo(2 / 3);
    });
    it('tracks fleet aggregates separately from tenants', () => {
        slo_1.sloTracker.record('tenant-a', '/fleet-route', 0.1, 200);
        slo_1.sloTracker.record('tenant-b', '/fleet-route', 0.2, 200);
        const fleetSnapshot = slo_1.sloTracker.snapshot('fleet', '/fleet-route');
        expect(fleetSnapshot.requestCount).toBe(2);
        expect(fleetSnapshot.errorRate).toBe(0);
    });
    it('captures middleware measurements for authorized routes', async () => {
        const app = (0, express_1.default)();
        app.use(slo_1.sloMiddleware);
        app.get('/demo', (_req, res) => res.status(200).json({ ok: true }));
        await (0, supertest_1.default)(app).get('/demo').set('x-tenant-id', 'tenant-42');
        const snapshot = slo_1.sloTracker.snapshot('tenant-42', '/demo');
        expect(snapshot.requestCount).toBeGreaterThanOrEqual(1);
        expect(snapshot.latency.p50).toBeGreaterThan(0);
    });
});
