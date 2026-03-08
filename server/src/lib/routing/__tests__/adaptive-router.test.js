"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const adaptive_router_js_1 = __importDefault(require("../adaptive-router.js"));
(0, globals_1.describe)('AdaptiveRouter (Write-Aware Sharding Pilot)', () => {
    const backends = [
        { id: 'us-east-primary', address: '10.0.0.1', weight: 1, connections: 0, latency: 10, status: 'UP', role: 'PRIMARY', region: 'us-east' },
        { id: 'us-east-replica', address: '10.0.0.2', weight: 1, connections: 0, latency: 10, status: 'UP', role: 'REPLICA', region: 'us-east' },
        { id: 'eu-west-replica', address: '10.0.0.3', weight: 1, connections: 0, latency: 50, status: 'UP', role: 'REPLICA', region: 'eu-west' },
    ]; // Cast to any because we haven't updated the interface yet
    (0, globals_1.beforeEach)(() => {
        adaptive_router_js_1.default.updateBackends(backends);
    });
    (0, globals_1.it)('should route writes to PRIMARY', () => {
        const backend = adaptive_router_js_1.default.getWriteBackend('tenant-1');
        (0, globals_1.expect)(backend).toBeDefined();
        (0, globals_1.expect)(backend.role).toBe('PRIMARY');
    });
    (0, globals_1.it)('should route reads to local REPLICA if available', () => {
        const backend = adaptive_router_js_1.default.getReadBackend('tenant-1', 'us-east');
        (0, globals_1.expect)(backend).toBeDefined();
        (0, globals_1.expect)(backend.id).toBe('us-east-replica');
    });
    (0, globals_1.it)('should fallback read to PRIMARY if local replica is down', () => {
        const downBackends = [
            { ...backends[0] }, // Primary UP
            { ...backends[1], status: 'DOWN' }, // Local Replica DOWN
            { ...backends[2] } // Remote Replica UP
        ];
        adaptive_router_js_1.default.updateBackends(downBackends);
        const backend = adaptive_router_js_1.default.getReadBackend('tenant-1', 'us-east');
        (0, globals_1.expect)(backend).toBeDefined();
        (0, globals_1.expect)(backend.id).toBe('us-east-primary');
    });
});
