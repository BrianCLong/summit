"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureGuard = void 0;
class BackpressureGuard {
    static instance;
    mockQueueDepth = 0;
    threshold = 100;
    enabledOverride = null;
    constructor() { }
    static getInstance() {
        if (!BackpressureGuard.instance) {
            BackpressureGuard.instance = new BackpressureGuard();
        }
        return BackpressureGuard.instance;
    }
    shouldBlock() {
        const isEnabled = this.isEnabled();
        if (!isEnabled) {
            return false;
        }
        // In a real implementation, this would check the real queue depth.
        // For now, we use the mocked queue depth as requested.
        const currentDepth = this.getQueueDepth();
        return currentDepth > this.threshold;
    }
    isEnabled() {
        if (this.enabledOverride !== null) {
            return this.enabledOverride;
        }
        // Default to false as per constraints
        return process.env.BACKPRESSURE_ENABLED === 'true';
    }
    // --- Methods for testing/mocking ---
    setMockQueueDepth(depth) {
        this.mockQueueDepth = depth;
    }
    setThreshold(threshold) {
        this.threshold = threshold;
    }
    setEnabledOverride(enabled) {
        this.enabledOverride = enabled;
    }
    getQueueDepth() {
        return this.mockQueueDepth;
    }
}
exports.BackpressureGuard = BackpressureGuard;
