"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const agent_factory_js_1 = require("../src/agent-factory.js");
const pki_js_1 = require("../src/pki.js");
(0, vitest_1.describe)('PkiManager', () => {
    (0, vitest_1.it)('issues and verifies mTLS certificates', () => {
        const pki = new pki_js_1.PkiManager('summit-qaf-ca');
        const client = pki.issueCertificate('client', 60);
        const server = pki.issueCertificate('server', 60);
        (0, vitest_1.expect)(pki.verifyCertificate(client.certificate).valid).toBe(true);
        (0, vitest_1.expect)(pki.verifyCertificate(server.certificate).valid).toBe(true);
        const mtls = pki.mutualTlsHandshake(client.certificate, server.certificate);
        (0, vitest_1.expect)(mtls.allowed).toBe(true);
        pki.revokeCertificate(client.certificate.id, 'compromised');
        const failed = pki.mutualTlsHandshake(client.certificate, server.certificate);
        (0, vitest_1.expect)(failed.allowed).toBe(false);
        (0, vitest_1.expect)(failed.reasons.some((reason) => reason.includes('revoked'))).toBe(true);
    });
});
(0, vitest_1.describe)('AgentFactory', () => {
    (0, vitest_1.it)('spawns agents with enforced controls and ROI tracking', () => {
        const factory = new agent_factory_js_1.AgentFactory('summit-qaf');
        const agent = factory.spawnAgent({
            name: 'reviewer',
            role: 'review',
            tenantId: 'tenant-a',
            capabilities: ['code-review'],
            allowedActions: ['review-pr', 'lint'],
            tags: ['secure'],
        });
        const allowed = agent.performAction({
            name: 'review-pr',
            durationMs: 45_000,
            contextSwitches: 1,
            defectsFound: 0,
        });
        (0, vitest_1.expect)(allowed.allowed).toBe(true);
        const denied = agent.performAction({ name: 'deploy' });
        (0, vitest_1.expect)(denied.allowed).toBe(false);
        (0, vitest_1.expect)(denied.reasons.some((reason) => reason.includes('not permitted'))).toBe(true);
        const roi = factory.roiDashboard.summarize();
        (0, vitest_1.expect)(roi.actionsTracked).toBe(1);
        (0, vitest_1.expect)(roi.velocityGain).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('produces compliance reports with security and ROI evidence', () => {
        const factory = new agent_factory_js_1.AgentFactory('summit-qaf');
        const agent = factory.spawnAgent({
            name: 'deployer',
            role: 'deploy',
            tenantId: 'tenant-a',
            capabilities: ['deploy'],
            allowedActions: ['deploy'],
            minimumAssurance: 0.9,
        });
        agent.performAction({
            name: 'deploy',
            durationMs: 35_000,
            contextSwitches: 1,
            defectsFound: 0,
        });
        const report = factory.generateComplianceReport();
        const mtls = report.checks.find((check) => check.name === 'mTLS-enforced');
        const roi = report.checks.find((check) => check.name === 'roi-telemetry');
        const controls = report.checks.find((check) => check.name === 'security-controls-coverage');
        (0, vitest_1.expect)(mtls?.passed).toBe(true);
        (0, vitest_1.expect)(roi?.passed).toBe(true);
        (0, vitest_1.expect)(controls?.passed).toBe(true);
    });
});
