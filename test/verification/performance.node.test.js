"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const BackpressureController_js_1 = require("../../server/src/runtime/backpressure/BackpressureController.js");
(0, node_test_1.describe)('Performance & Scale Controls', () => {
    let controller;
    (0, node_test_1.before)(() => {
        controller = BackpressureController_js_1.BackpressureController.getInstance();
    });
    (0, node_test_1.it)('should accept critical requests immediately', async () => {
        const result = await controller.requestAdmission({
            id: 'crit-1',
            tenantId: 't1',
            priority: BackpressureController_js_1.PriorityClass.CRITICAL
        });
        node_assert_1.default.strictEqual(result.allowed, true);
        node_assert_1.default.strictEqual(result.status, 'ACCEPTED');
        // Idempotent release
        controller.release('crit-1');
        controller.release('crit-1'); // Should not cause issues
    });
    (0, node_test_1.it)('should enforce tenant limits', async () => {
        // Flood tenant
        const promises = [];
        const tenantId = 'spam-tenant';
        // Simulate filling up tenant concurrency
        // We need to bypass the fact that we can't easily reach 50 active requests in a single-threaded test without holding them open
        // We can manually inject into the map for testing purposes if we exposed it, or just run 50 requests.
        const activeIds = [];
        // Fill 50 slots
        for (let i = 0; i < 50; i++) {
            const id = `req-${i}`;
            activeIds.push(id);
            await controller.requestAdmission({ id, tenantId, priority: BackpressureController_js_1.PriorityClass.NORMAL });
        }
        // 51st should be rejected
        const result = await controller.requestAdmission({ id: 'req-51', tenantId, priority: BackpressureController_js_1.PriorityClass.NORMAL });
        node_assert_1.default.strictEqual(result.allowed, false, 'Should reject due to tenant limit');
        // Cleanup
        activeIds.forEach(id => controller.release(id));
    });
    (0, node_test_1.it)('should have metrics', async () => {
        const metrics = controller.getMetrics();
        node_assert_1.default.ok(metrics.queueDepth >= 0);
    });
});
