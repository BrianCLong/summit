"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const SECRET = 'super-secret-key';
function createRegistry() {
    return new index_js_1.ToolRiskRegistry();
}
(0, vitest_1.describe)('ToolRiskRegistry end-to-end', () => {
    (0, vitest_1.it)('updates risk scores and manifests deterministically from NVD feed changes', () => {
        const registry = createRegistry();
        registry.registerTool({
            tool: 'tesq-tool',
            version: '1.0.0',
            sbomDigest: 'sha256:abc123',
            dataAccessScope: 'write',
            networkEgressClasses: ['restricted'],
        });
        const initialFeed = {
            vulnerabilities: [
                {
                    published: '2024-01-02T00:00:00.000Z',
                    cve: {
                        id: 'CVE-2024-0001',
                        descriptions: [{ lang: 'en', value: 'Initial vulnerability.' }],
                        metrics: {
                            cvssMetricV31: [
                                {
                                    cvssData: {
                                        baseScore: 8.1,
                                        baseSeverity: 'HIGH',
                                    },
                                },
                            ],
                        },
                        configurations: {
                            nodes: [
                                {
                                    cpeMatch: [
                                        {
                                            vulnerable: true,
                                            criteria: 'cpe:/a:acme:tesq-tool:1.0.0',
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            ],
        };
        registry.ingestNvdFeed(initialFeed);
        const afterInitial = registry.getProfile('tesq-tool', '1.0.0');
        (0, vitest_1.expect)(afterInitial?.riskScore).toBe(1 + (0, index_js_1.severityWeights)().HIGH + 3 + 1);
        const signer = new index_js_1.AllowlistSigner({
            secret: SECRET,
            keyId: 'tesq-test-key',
            deterministicBase: '2024-01-01T00:00:00.000Z',
        });
        const manifest = registry.generateAllowlistManifest(signer, {
            environment: 'prod',
            riskThreshold: 15,
        });
        (0, vitest_1.expect)(manifest.entries).toHaveLength(1);
        (0, vitest_1.expect)(manifest.signature).toMatch(/^[a-f0-9]+$/);
        const manifestCopy = registry.generateAllowlistManifest(signer, {
            environment: 'prod',
            riskThreshold: 15,
        });
        (0, vitest_1.expect)(manifestCopy).toEqual(manifest);
        const updatedFeed = {
            vulnerabilities: [
                ...initialFeed.vulnerabilities,
                {
                    published: '2024-02-10T00:00:00.000Z',
                    cve: {
                        id: 'CVE-2024-1000',
                        descriptions: [{ lang: 'en', value: 'Critical remote execution.' }],
                        metrics: {
                            cvssMetricV31: [
                                {
                                    cvssData: {
                                        baseScore: 9.9,
                                        baseSeverity: 'CRITICAL',
                                    },
                                },
                            ],
                        },
                        configurations: {
                            nodes: [
                                {
                                    cpeMatch: [
                                        {
                                            vulnerable: true,
                                            criteria: 'cpe:/a:acme:tesq-tool:1.0.0',
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            ],
        };
        registry.ingestNvdFeed(updatedFeed);
        const afterUpdate = registry.getProfile('tesq-tool', '1.0.0');
        (0, vitest_1.expect)(afterUpdate?.riskScore).toBe(1 + (0, index_js_1.severityWeights)().HIGH + (0, index_js_1.severityWeights)().CRITICAL + 3 + 1);
        const updatedManifest = registry.generateAllowlistManifest(signer, {
            environment: 'prod',
            riskThreshold: 15,
        });
        (0, vitest_1.expect)(updatedManifest.entries).toHaveLength(0);
        (0, vitest_1.expect)(updatedManifest.signature).not.toEqual(manifest.signature);
    });
    (0, vitest_1.it)('TESQ policy hook enforces the allowlist manifest', () => {
        const registry = createRegistry();
        registry.registerTool({
            tool: 'tesq-tool',
            version: '1.0.0',
            sbomDigest: 'sha256:abc123',
            dataAccessScope: 'read',
            networkEgressClasses: ['none'],
        });
        const feed = {
            vulnerabilities: [],
        };
        registry.ingestNvdFeed(feed);
        const signer = new index_js_1.AllowlistSigner({
            secret: SECRET,
            keyId: 'tesq-test-key',
            deterministicBase: '2024-01-01T00:00:00.000Z',
        });
        const manifest = registry.generateAllowlistManifest(signer, {
            environment: 'sandbox',
            riskThreshold: 10,
        });
        const enforce = (0, index_js_1.createTesqPolicyHook)(manifest);
        const allowed = enforce({
            tool: 'tesq-tool',
            version: '1.0.0',
            environment: 'sandbox',
        });
        (0, vitest_1.expect)(allowed.riskScore).toBeLessThanOrEqual(10);
        (0, vitest_1.expect)(() => enforce({ tool: 'tesq-tool', version: '2.0.0', environment: 'sandbox' })).toThrowError();
        (0, vitest_1.expect)(() => enforce({ tool: 'tesq-tool', version: '1.0.0', environment: 'prod' })).toThrowError();
    });
});
