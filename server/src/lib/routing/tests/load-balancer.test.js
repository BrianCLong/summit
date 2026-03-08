"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const load_balancer_js_1 = __importDefault(require("../load-balancer.js"));
// Mock backend data for testing
const mockBackends = [
    { id: 'backend-1', address: '1.1.1.1', weight: 1, connections: 10, latency: 50, status: 'UP' },
    { id: 'backend-2', address: '2.2.2.2', weight: 1, connections: 20, latency: 100, status: 'UP' },
];
(0, globals_1.describe)('LoadBalancer', () => {
    let loadBalancer;
    (0, globals_1.beforeEach)(() => {
        loadBalancer = load_balancer_js_1.default;
        loadBalancer.initialize(JSON.parse(JSON.stringify(mockBackends)));
    });
    (0, globals_1.afterEach)(() => {
        loadBalancer.shutdown();
    });
    test('should initialize with a set of backends', () => {
        const backend = loadBalancer.getNextBackend('weightedRoundRobin');
        (0, globals_1.expect)(backend).toBeDefined();
    });
    test('should add a new backend', () => {
        const newBackend = { id: 'backend-3', address: '3.3.3.3', weight: 1, connections: 5, latency: 20, status: 'UP' };
        loadBalancer.addBackend(newBackend);
        // This is a simplification; in a real scenario, we'd need to inspect the internal state.
        // For this test, we'll just check that the router can select it.
        const backends = Array.from({ length: 3 }, () => loadBalancer.getNextBackend('weightedRoundRobin'));
        (0, globals_1.expect)(backends.some(b => b?.id === 'backend-3')).toBe(true);
    });
    test('should remove a backend', () => {
        loadBalancer.removeBackend('backend-2');
        const backends = Array.from({ length: 3 }, () => loadBalancer.getNextBackend('weightedRoundRobin'));
        (0, globals_1.expect)(backends.every(b => b?.id === 'backend-1')).toBe(true);
    });
    test('health checks should remove failed backends from rotation', async () => {
        // This is a simplified test for health check behavior.
        // In a real implementation, we would mock the health check mechanism.
        const backend1 = loadBalancer.getNextBackend('weightedRoundRobin');
        (0, globals_1.expect)(backend1?.id).toBe('backend-1');
        const backend2 = loadBalancer.getNextBackend('weightedRoundRobin');
        (0, globals_1.expect)(backend2?.id).toBe('backend-2');
        // Manually set a backend to 'DOWN' to simulate a failed health check.
        const downBackend = { id: 'backend-1', address: '1.1.1.1', weight: 1, connections: 10, latency: 50, status: 'DOWN' };
        loadBalancer.removeBackend('backend-1');
        loadBalancer.addBackend(downBackend);
        const nextBackend = loadBalancer.getNextBackend('weightedRoundRobin');
        (0, globals_1.expect)(nextBackend?.id).toBe('backend-2');
    });
    test('should support sticky sessions', () => {
        const sessionId = 'test-session';
        const firstBackend = loadBalancer.getNextBackend('weightedRoundRobin', sessionId);
        (0, globals_1.expect)(firstBackend).toBeDefined();
        for (let i = 0; i < 5; i++) {
            const nextBackend = loadBalancer.getNextBackend('weightedRoundRobin', sessionId);
            (0, globals_1.expect)(nextBackend?.id).toBe(firstBackend?.id);
        }
    });
});
