"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siemManager = exports.SIEMManager = void 0;
class SIEMManager {
    // In-memory cache of sinks for performance (stubbed)
    sinks = new Map();
    async getSink(tenantId) {
        if (this.sinks.has(tenantId)) {
            return this.sinks.get(tenantId);
        }
        // Fetch config from DB (assuming table siem_configs exists)
        // For now, return null or mock
        return null;
    }
    async exportEvent(tenantId, event) {
        const sink = await this.getSink(tenantId);
        if (sink) {
            await sink.send([event]);
        }
    }
}
exports.SIEMManager = SIEMManager;
exports.siemManager = new SIEMManager();
