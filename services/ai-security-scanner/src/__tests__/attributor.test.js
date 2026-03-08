"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const vulnerability_attributor_js_1 = require("../attribution/vulnerability-attributor.js");
(0, vitest_1.describe)('VulnerabilityAttributor', () => {
    let attributor;
    (0, vitest_1.beforeEach)(() => {
        attributor = new vulnerability_attributor_js_1.VulnerabilityAttributor({
            enableAIAnalysis: false,
            enableThreatIntel: false,
            correlationWindow: 86400000,
            minConfidence: 0.7,
        });
    });
    const createTestVuln = (overrides = {}) => ({
        id: 'TEST-001',
        title: 'Test Vulnerability',
        description: 'A test vulnerability',
        severity: 'high',
        category: 'injection',
        cvssScore: 7.5,
        location: {
            file: '/home/user/summit/services/test/src/handler.ts',
            startLine: 10,
            endLine: 15,
            codeSnippet: 'const query = req.body.input;',
        },
        attribution: {
            source: 'static-analysis',
            confidence: 0.85,
            scanId: 'scan-123',
            timestamp: new Date(),
        },
        evidence: [],
        remediation: {
            description: 'Sanitize input',
            priority: 'high',
            estimatedEffort: '2 hours',
            automatable: true,
            verificationSteps: ['Test with malicious input'],
        },
        complianceImpact: [],
        detectedAt: new Date(),
        status: 'open',
        ...overrides,
    });
    (0, vitest_1.describe)('attribution', () => {
        (0, vitest_1.it)('should attribute a vulnerability', async () => {
            const vuln = createTestVuln();
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(result.vulnerabilityId).toBe(vuln.id);
            (0, vitest_1.expect)(result.attribution).toBeDefined();
            (0, vitest_1.expect)(result.attribution.rootCauseAnalysis).toBeDefined();
            (0, vitest_1.expect)(result.riskAssessment).toBeDefined();
        });
        (0, vitest_1.it)('should perform root cause analysis', async () => {
            const vuln = createTestVuln({
                location: {
                    file: '/test.ts',
                    startLine: 1,
                    endLine: 5,
                    codeSnippet: 'const query = req.body.user input;',
                },
            });
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(result.attribution.rootCauseAnalysis.primaryCause).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(result.attribution.rootCauseAnalysis.contributingFactors)).toBe(true);
        });
        (0, vitest_1.it)('should map to MITRE ATT&CK', async () => {
            const vuln = createTestVuln({ category: 'injection' });
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(result.attribution.mitreTactics).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(result.attribution.mitreTactics)).toBe(true);
        });
        (0, vitest_1.it)('should build attack chain', async () => {
            const vuln = createTestVuln();
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(result.attribution.attackChain).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(result.attribution.attackChain)).toBe(true);
            if (result.attribution.attackChain && result.attribution.attackChain.length > 0) {
                (0, vitest_1.expect)(result.attribution.attackChain[0].step).toBe(1);
            }
        });
    });
    (0, vitest_1.describe)('batch attribution', () => {
        (0, vitest_1.it)('should attribute multiple vulnerabilities', async () => {
            const vulns = [
                createTestVuln({ id: 'VULN-1' }),
                createTestVuln({ id: 'VULN-2', category: 'authentication' }),
                createTestVuln({ id: 'VULN-3', category: 'cryptographic' }),
            ];
            const results = await attributor.attributeVulnerabilities(vulns);
            (0, vitest_1.expect)(results.length).toBe(3);
            results.forEach((result, index) => {
                (0, vitest_1.expect)(result.vulnerabilityId).toBe(vulns[index].id);
            });
        });
    });
    (0, vitest_1.describe)('risk assessment', () => {
        (0, vitest_1.it)('should calculate overall risk', async () => {
            const vuln = createTestVuln({ severity: 'critical', cvssScore: 9.5 });
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(result.riskAssessment.overallRisk).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.riskAssessment.overallRisk).toBeLessThanOrEqual(100);
        });
        (0, vitest_1.it)('should include risk factors', async () => {
            const vuln = createTestVuln();
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(Array.isArray(result.riskAssessment.factors)).toBe(true);
            (0, vitest_1.expect)(result.riskAssessment.factors.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should calculate exploitability and impact', async () => {
            const vuln = createTestVuln();
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(result.riskAssessment.exploitability).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.riskAssessment.impact).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.riskAssessment.likelihood).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('correlation', () => {
        (0, vitest_1.it)('should correlate related vulnerabilities', async () => {
            // First vulnerability
            const vuln1 = createTestVuln({ id: 'VULN-A' });
            await attributor.attributeVulnerability(vuln1);
            // Second vulnerability in same file
            const vuln2 = createTestVuln({ id: 'VULN-B' });
            const result = await attributor.attributeVulnerability(vuln2);
            (0, vitest_1.expect)(Array.isArray(result.correlatedVulnerabilities)).toBe(true);
        });
    });
    (0, vitest_1.describe)('timeline', () => {
        (0, vitest_1.it)('should build vulnerability timeline', async () => {
            const vuln = createTestVuln();
            const result = await attributor.attributeVulnerability(vuln);
            (0, vitest_1.expect)(Array.isArray(result.timeline)).toBe(true);
            (0, vitest_1.expect)(result.timeline.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.timeline[0].event).toBe('Vulnerability detected');
        });
    });
});
