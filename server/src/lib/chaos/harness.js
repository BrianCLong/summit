"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosHarness = void 0;
class ChaosHarness {
    static instance;
    configs = new Map();
    constructor() { }
    static getInstance() {
        if (!ChaosHarness.instance) {
            ChaosHarness.instance = new ChaosHarness();
        }
        return ChaosHarness.instance;
    }
    setConfig(target, config) {
        this.configs.set(target, config);
    }
    getConfig(target) {
        return this.configs.get(target) || { mode: 'none' };
    }
    shouldFail(target) {
        const config = this.getConfig(target);
        if (config.mode === 'error') {
            return Math.random() < (config.errorRate || 1.0);
        }
        return false;
    }
    async delay(target) {
        const config = this.getConfig(target);
        if (config.mode === 'latency' && config.latencyMs) {
            await new Promise(resolve => setTimeout(resolve, config.latencyMs));
        }
    }
    reset() {
        this.configs.clear();
    }
}
exports.ChaosHarness = ChaosHarness;
