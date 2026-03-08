"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveActiveHealthService = void 0;
class ActiveActiveHealthService {
    static instance;
    isSafeModeEnabled = false;
    constructor() { }
    static getInstance() {
        if (!ActiveActiveHealthService.instance) {
            ActiveActiveHealthService.instance = new ActiveActiveHealthService();
        }
        return ActiveActiveHealthService.instance;
    }
    async checkHealth() {
        // Mock health check logic
        // Real logic would query replication lag from DB metrics or DualWriter stats
        return {
            region: process.env.REGION || 'us-east-1',
            isPrimary: true, // simplified
            lagMs: 0,
            divergenceCount: 0,
            lastReconciledAt: new Date(),
            status: 'HEALTHY',
        };
    }
    async getDivergence() {
        // Mock divergence check
        return 0;
    }
    isSafeMode() {
        return this.isSafeModeEnabled;
    }
    enableSafeMode() {
        console.warn('Active-Active Safe Mode ENABLED. All writes forced to primary region only.');
        this.isSafeModeEnabled = true;
    }
    disableSafeMode() {
        console.info('Active-Active Safe Mode DISABLED.');
        this.isSafeModeEnabled = false;
    }
    async shouldBlockExpansion() {
        const divergence = await this.getDivergence();
        return divergence > 0;
    }
}
exports.ActiveActiveHealthService = ActiveActiveHealthService;
