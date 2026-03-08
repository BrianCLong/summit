"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const guard_js_1 = require("../guard.js");
(0, globals_1.describe)('BackpressureGuard', () => {
    let guard;
    (0, globals_1.beforeEach)(() => {
        guard = guard_js_1.BackpressureGuard.getInstance();
        guard.setEnabledOverride(null); // Reset to default
        guard.setMockQueueDepth(0);
        guard.setThreshold(100);
        process.env.BACKPRESSURE_ENABLED = 'false';
    });
    (0, globals_1.afterEach)(() => {
        delete process.env.BACKPRESSURE_ENABLED;
    });
    (0, globals_1.it)('should not block when disabled (default)', () => {
        guard.setMockQueueDepth(200); // Above threshold
        (0, globals_1.expect)(guard.shouldBlock()).toBe(false);
    });
    (0, globals_1.it)('should not block when enabled and queue depth is below threshold', () => {
        process.env.BACKPRESSURE_ENABLED = 'true';
        guard.setMockQueueDepth(50);
        (0, globals_1.expect)(guard.shouldBlock()).toBe(false);
    });
    (0, globals_1.it)('should block when enabled and queue depth is above threshold', () => {
        process.env.BACKPRESSURE_ENABLED = 'true';
        guard.setMockQueueDepth(150);
        (0, globals_1.expect)(guard.shouldBlock()).toBe(true);
    });
    (0, globals_1.it)('should respect manual override', () => {
        guard.setEnabledOverride(true);
        guard.setMockQueueDepth(150);
        (0, globals_1.expect)(guard.shouldBlock()).toBe(true);
        guard.setEnabledOverride(false);
        (0, globals_1.expect)(guard.shouldBlock()).toBe(false);
    });
});
