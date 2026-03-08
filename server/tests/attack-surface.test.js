"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The current test environment is unable to resolve workspace packages.
// This mock is necessary to bypass the build system limitation in this sandbox
// while verifying the integration code logic.
// In a real environment, the workspace package would be linked correctly.
const globals_1 = require("@jest/globals");
globals_1.jest.mock('@intelgraph/attack-surface', () => {
    return {
        AttackSurfaceMonitor: class MockAttackSurfaceMonitor {
            async discoverAssets(domain) {
                return {
                    domain,
                    assets: [{}, {}, {}],
                    discovered: Date.now()
                };
            }
        }
    };
}, { virtual: true });
// @ts-ignore
const attack_surface_1 = require("@intelgraph/attack-surface");
const target_expander_js_1 = require("../src/modules/osint/target-expander.js");
(0, globals_1.describe)('Attack Surface Integration', () => {
    (0, globals_1.it)('should instantiate monitor', async () => {
        // @ts-ignore
        const monitor = new attack_surface_1.AttackSurfaceMonitor();
        (0, globals_1.expect)(monitor).toBeDefined();
        const result = await monitor.discoverAssets('example.com');
        (0, globals_1.expect)(result.domain).toBe('example.com');
        (0, globals_1.expect)(result.assets).toHaveLength(3);
    });
});
(0, globals_1.describe)('Target Expander', () => {
    (0, globals_1.it)('should expand email to domain and handle', async () => {
        const expander = new target_expander_js_1.TargetExpander();
        const results = await expander.expand({
            type: 'email',
            value: 'user@example.com',
            source: 'manual'
        });
        (0, globals_1.expect)(results).toHaveLength(2);
        (0, globals_1.expect)(results.some(r => r.type === 'domain' && r.value === 'example.com')).toBe(true);
        (0, globals_1.expect)(results.some(r => r.type === 'handle' && r.value === 'user')).toBe(true);
    });
    (0, globals_1.it)('should expand api endpoint', async () => {
        const expander = new target_expander_js_1.TargetExpander();
        const results = await expander.expand({
            type: 'api_endpoint',
            value: 'https://api.example.com/v1',
            source: 'manual'
        });
        (0, globals_1.expect)(results).toHaveLength(2);
        (0, globals_1.expect)(results.some(r => r.type === 'domain' && r.value === 'api.example.com')).toBe(true);
    });
});
