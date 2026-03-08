"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SupplyChainRiskEngine_js_1 = require("../SupplyChainRiskEngine.js");
const SBOMParser_js_1 = require("../SBOMParser.js");
const VulnerabilityService_js_1 = require("../VulnerabilityService.js");
(0, globals_1.describe)('SupplyChainRiskEngine', () => {
    let engine;
    let mockVendor;
    (0, globals_1.beforeEach)(() => {
        engine = new SupplyChainRiskEngine_js_1.SupplyChainRiskEngine();
        mockVendor = {
            id: 'v1',
            name: 'Acme Corp',
            domain: 'acme.com',
            tier: 'strategic',
            status: 'active',
            complianceStatus: {
                soc2: true,
                iso27001: true,
                gdpr: true,
            },
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
        };
    });
    (0, globals_1.it)('should calculate perfect score for safe vendor', () => {
        const score = engine.calculateScore(mockVendor, [], {
            id: 'c1',
            vendorId: 'v1',
            hasIndemnification: true,
            hasSLA: true,
            hasSecurityRequirements: true,
            hasIncidentReporting: true,
            riskFactors: [],
            analyzedAt: '2023-01-01',
        });
        (0, globals_1.expect)(score.overallScore).toBe(100);
        (0, globals_1.expect)(score.riskLevel).toBe('low');
    });
    (0, globals_1.it)('should penalize for missing compliance', () => {
        mockVendor.complianceStatus.soc2 = false;
        const score = engine.calculateScore(mockVendor, [], {
            id: 'c1',
            vendorId: 'v1',
            hasIndemnification: true,
            hasSLA: true,
            hasSecurityRequirements: true,
            hasIncidentReporting: true,
            riskFactors: [],
            analyzedAt: '2023-01-01',
        });
        (0, globals_1.expect)(score.overallScore).toBeLessThan(100);
        (0, globals_1.expect)(score.breakdown.complianceRisk).toBeGreaterThan(0);
    });
});
(0, globals_1.describe)('SBOMParser', () => {
    const parser = new SBOMParser_js_1.SBOMParser();
    (0, globals_1.it)('should parse simple JSON', async () => {
        const json = {
            components: [
                { name: 'lib-a', version: '1.0.0', purl: 'pkg:npm/lib-a@1.0.0' }
            ]
        };
        const result = await parser.parse(json, 'v1', 'ProductA', '1.0');
        (0, globals_1.expect)(result.components).toHaveLength(1);
        (0, globals_1.expect)(result.components[0].name).toBe('lib-a');
    });
});
(0, globals_1.describe)('VulnerabilityService', () => {
    const service = new VulnerabilityService_js_1.VulnerabilityService();
    (0, globals_1.it)('should detect known vulnerabilities', async () => {
        const components = [
            { name: 'log4j-core', version: '2.14.1' }, // Known vulnerable
            { name: 'safe-lib', version: '1.0.0' }
        ];
        const findings = await service.scanComponents(components);
        (0, globals_1.expect)(findings).toHaveLength(1);
        (0, globals_1.expect)(findings[0].cveId).toBe('CVE-2021-44228');
    });
});
