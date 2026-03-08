"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const adaptive_router_js_1 = __importDefault(require("../adaptive-router.js"));
const mockBackends = [
    { id: 'backend-1', address: '1.1.1.1', weight: 5, connections: 10, latency: 50, status: 'UP' },
    { id: 'backend-2', address: '2.2.2.2', weight: 2, connections: 20, latency: 100, status: 'UP' },
    { id: 'backend-3', address: '3.3.3.3', weight: 3, connections: 5, latency: 20, status: 'UP' },
    { id: 'backend-4', address: '4.4.4.4', weight: 1, connections: 15, latency: 80, status: 'DOWN' },
];
(0, globals_1.describe)('AdaptiveRouter', () => {
    let router;
    (0, globals_1.beforeEach)(() => {
        router = adaptive_router_js_1.default;
        router.updateBackends(JSON.parse(JSON.stringify(mockBackends))); // Deep copy to avoid test interference
    });
    test('weightedRoundRobin should distribute requests according to weights', () => {
        const selections = {
            'backend-1': 0,
            'backend-2': 0,
            'backend-3': 0,
        };
        const totalRequests = 10;
        for (let i = 0; i < totalRequests; i++) {
            const backend = router.weightedRoundRobin();
            if (backend) {
                selections[backend.id]++;
            }
        }
        (0, globals_1.expect)(selections['backend-1']).toBe(5);
        (0, globals_1.expect)(selections['backend-2']).toBe(2);
        (0, globals_1.expect)(selections['backend-3']).toBe(3);
    });
    test('leastConnections should select the backend with the fewest connections', () => {
        const backend = router.leastConnections();
        (0, globals_1.expect)(backend?.id).toBe('backend-3');
    });
    test('lowestLatency should select the backend with the lowest latency', () => {
        const backend = router.lowestLatency();
        (0, globals_1.expect)(backend?.id).toBe('backend-3');
    });
    test('should not select unhealthy backends', () => {
        const unhealthyBackend = mockBackends.find(b => b.status === 'DOWN');
        const selectedBackendRR = router.weightedRoundRobin();
        (0, globals_1.expect)(selectedBackendRR?.id).not.toBe(unhealthyBackend?.id);
        const selectedBackendLC = router.leastConnections();
        (0, globals_1.expect)(selectedBackendLC?.id).not.toBe(unhealthyBackend?.id);
        const selectedBackendLL = router.lowestLatency();
        (0, globals_1.expect)(selectedBackendLL?.id).not.toBe(unhealthyBackend?.id);
    });
});
