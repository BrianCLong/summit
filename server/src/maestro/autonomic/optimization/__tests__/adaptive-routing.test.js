"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const adaptive_routing_js_1 = require("../adaptive-routing.js");
(0, globals_1.describe)('AdaptiveRoutingService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new adaptive_routing_js_1.AdaptiveRoutingService();
        // Disable random exploration for deterministic tests
        service.epsilon = 0;
    });
    (0, globals_1.it)('should update profile and prefer better performing agent', () => {
        // Train Agent A (Good)
        for (let i = 0; i < 10; i++) {
            service.updateProfile('agent-a', 'code', 100, true, 0.01);
        }
        // Train Agent B (Bad: High latency, fails often)
        for (let i = 0; i < 10; i++) {
            service.updateProfile('agent-b', 'code', 2000, false, 0.05);
        }
        const choice = service.getBestAgent('code', ['agent-a', 'agent-b']);
        (0, globals_1.expect)(choice).toBe('agent-a');
    });
    (0, globals_1.it)('should handle cold start', () => {
        const choice = service.getBestAgent('unknown-task', ['agent-new-1', 'agent-new-2']);
        // Should default to first one if scores identical
        (0, globals_1.expect)(choice).toBe('agent-new-1');
    });
});
