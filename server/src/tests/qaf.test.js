"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const factory_js_1 = require("../qaf/factory.js");
(0, globals_1.describe)('SummitQAF Factory', () => {
    let factory;
    (0, globals_1.beforeEach)(() => {
        factory = new factory_js_1.SummitQAF();
    });
    (0, globals_1.it)('should spawn a quantum-secure agent with mTLS identity', async () => {
        const config = {
            name: 'TestAgent',
            role: 'PRReviewer',
            tenantId: 'tenant-1',
            capabilities: ['code-review'],
            securityLevel: 'quantum-secure',
        };
        const identity = await factory.spawnAgent(config);
        (0, globals_1.expect)(identity).toBeDefined();
        (0, globals_1.expect)(identity.id).toBeDefined();
        (0, globals_1.expect)(identity.quantumSafe).toBe(true);
        (0, globals_1.expect)(identity.certificate).toContain('BEGIN CERTIFICATE');
    });
    (0, globals_1.it)('should track ROI metrics', async () => {
        const config = {
            name: 'ROIAgent',
            role: 'FactoryAgent',
            tenantId: 'tenant-1',
            capabilities: [],
            securityLevel: 'standard',
        };
        await factory.spawnAgent(config);
        const metrics = factory.getTelemetry();
        (0, globals_1.expect)(metrics.tasksCompleted).toBeGreaterThan(0);
        (0, globals_1.expect)(metrics.complianceScore).toBe(100);
    });
    (0, globals_1.it)('should detect quantum vulnerabilities', async () => {
        const secureConfig = {
            name: 'SecureAgent',
            role: 'GovEnforcer',
            tenantId: 'tenant-1',
            capabilities: [],
            securityLevel: 'quantum-secure',
        };
        await factory.spawnAgent(secureConfig);
        const vulnerableConfig = {
            name: 'WeakAgent',
            role: 'LeakHunter',
            tenantId: 'tenant-1',
            capabilities: [],
            securityLevel: 'standard', // Vulnerable
        };
        await factory.spawnAgent(vulnerableConfig);
        const scanResult = await factory.runQuantumScan();
        (0, globals_1.expect)(scanResult.secure).toBe(false);
        (0, globals_1.expect)(scanResult.vulnerableAgents.length).toBe(1);
    });
});
