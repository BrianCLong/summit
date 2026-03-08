"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ramp_js_1 = require("../ramp.js");
const basePolicyBundle = (tenantId, ramp) => ({
    tenantId,
    baseProfile: {
        id: 'test-profile',
        version: '1.0.0',
        regoPackage: 'intelgraph.policies.test',
        entrypoints: ['allow'],
        guardrails: {
            defaultDeny: true,
            requirePurpose: false,
            requireJustification: false,
        },
        crossTenant: {
            mode: 'deny',
            allow: [],
            requireAgreements: true,
        },
        ramp,
        rules: [
            {
                id: 'allow-read',
                effect: 'allow',
                conditions: { actions: ['read'] },
            },
        ],
    },
    overlays: [],
});
(0, globals_1.describe)('ramp policy evaluation', () => {
    (0, globals_1.it)('applies allow/deny percentages by tenant, action, and workflow', () => {
        const rampConfig = {
            enabled: true,
            defaultAllowPercentage: 60,
            salt: 'salt-1',
            rules: [
                {
                    id: 'rtbf-start',
                    action: 'START',
                    workflow: 'rtbf_request',
                    allowPercentage: 30,
                },
                {
                    id: 'rtbf-export',
                    action: 'EXPORT',
                    workflow: 'rtbf_audit',
                    allowPercentage: 80,
                },
            ],
        };
        const bundle = basePolicyBundle('tenant-a', rampConfig);
        const startDecision = (0, ramp_js_1.evaluateRampDecision)(bundle, {
            tenantId: 'tenant-a',
            action: 'START',
            workflow: 'rtbf_request',
            key: 'job-123',
        });
        const startBucket = (0, ramp_js_1.computeRampBucket)({
            tenantId: 'tenant-a',
            action: 'START',
            workflow: 'rtbf_request',
            key: 'job-123',
            salt: 'salt-1',
        });
        (0, globals_1.expect)(startDecision.percentage).toBe(30);
        (0, globals_1.expect)(startDecision.bucket).toBe(startBucket);
        (0, globals_1.expect)(startDecision.allow).toBe(startBucket < startDecision.percentage);
        const exportDecision = (0, ramp_js_1.evaluateRampDecision)(bundle, {
            tenantId: 'tenant-a',
            action: 'EXPORT',
            workflow: 'rtbf_audit',
            key: 'export-456',
        });
        (0, globals_1.expect)(exportDecision.percentage).toBe(80);
        (0, globals_1.expect)(exportDecision.allow).toBe(exportDecision.bucket < exportDecision.percentage);
        const cancelDecision = (0, ramp_js_1.evaluateRampDecision)(bundle, {
            tenantId: 'tenant-a',
            action: 'CANCEL',
            workflow: 'rtbf_request',
            key: 'job-789',
        });
        (0, globals_1.expect)(cancelDecision.percentage).toBe(60);
        (0, globals_1.expect)(cancelDecision.allow).toBe(cancelDecision.bucket < cancelDecision.percentage);
    });
});
