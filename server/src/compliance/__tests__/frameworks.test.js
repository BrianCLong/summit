"use strict";
/**
 * Compliance Frameworks Integration Tests
 *
 * Tests for framework discovery, control mapping, and stable IDs.
 * These tests serve as contract snapshots to catch accidental renames.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC3.1 (Risk Assessment)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../frameworks/index.js");
(0, globals_1.describe)('Compliance Frameworks', () => {
    (0, globals_1.describe)('Framework Discovery', () => {
        (0, globals_1.it)('should return all implemented frameworks', () => {
            const frameworks = (0, index_js_1.getFrameworkMetadata)();
            (0, globals_1.expect)(frameworks).toHaveLength(4);
            (0, globals_1.expect)(frameworks.map((f) => f.id)).toEqual([
                'FedRAMP',
                'PCI-DSS',
                'NIST-CSF',
                'CMMC',
            ]);
        });
        (0, globals_1.it)('should have valid metadata for each framework', () => {
            const frameworks = (0, index_js_1.getFrameworkMetadata)();
            for (const framework of frameworks) {
                (0, globals_1.expect)(framework.id).toBeTruthy();
                (0, globals_1.expect)(framework.name).toBeTruthy();
                (0, globals_1.expect)(framework.version).toBeTruthy();
                (0, globals_1.expect)(framework.description).toBeTruthy();
                (0, globals_1.expect)(framework.controlCount).toBeGreaterThan(0);
                (0, globals_1.expect)(framework.applicableTo).toBeInstanceOf(Array);
                (0, globals_1.expect)(framework.applicableTo.length).toBeGreaterThan(0);
                (0, globals_1.expect)(typeof framework.certificationRequired).toBe('boolean');
            }
        });
        (0, globals_1.it)('should match expected control counts (contract snapshot)', () => {
            const frameworks = (0, index_js_1.getFrameworkMetadata)();
            const countMap = Object.fromEntries(frameworks.map((f) => [f.id, f.controlCount]));
            // These are contract values - if they change, the test should fail
            // to alert us to potentially breaking changes
            (0, globals_1.expect)(countMap['FedRAMP']).toBe(325);
            (0, globals_1.expect)(countMap['PCI-DSS']).toBe(250);
            (0, globals_1.expect)(countMap['NIST-CSF']).toBe(106);
            (0, globals_1.expect)(countMap['CMMC']).toBe(130);
        });
    });
    (0, globals_1.describe)('FedRAMP Controls Service', () => {
        const service = (0, index_js_1.getFedRAMPControlsService)();
        (0, globals_1.it)('should be a singleton', () => {
            const service2 = (0, index_js_1.getFedRAMPControlsService)();
            (0, globals_1.expect)(service).toBe(service2);
        });
        (0, globals_1.it)('should return control families', () => {
            const families = service.getControlFamilies();
            const familyIds = Object.keys(families.data);
            (0, globals_1.expect)(familyIds.length).toBeGreaterThan(0);
            // Verify expected families exist
            (0, globals_1.expect)(familyIds).toContain('AC');
            (0, globals_1.expect)(familyIds).toContain('AU');
            (0, globals_1.expect)(familyIds).toContain('SC');
            (0, globals_1.expect)(familyIds).toContain('SI');
        });
        (0, globals_1.it)('should return controls for a family', () => {
            const acControls = service.getControlsByFamily('AC');
            (0, globals_1.expect)(acControls.data.length).toBeGreaterThan(0);
            // Verify AC-1 exists (Access Control Policy and Procedures)
            const ac1 = acControls.data.find((c) => c.controlId === 'AC-1');
            (0, globals_1.expect)(ac1).toBeDefined();
            (0, globals_1.expect)(ac1?.title).toBeTruthy();
        });
        (0, globals_1.it)('should have stable control IDs (contract snapshot)', () => {
            const allFamilies = service.getControlFamilies();
            const familyIds = Object.keys(allFamilies.data).sort();
            // These family IDs should remain stable
            (0, globals_1.expect)(familyIds).toEqual([
                'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP',
                'PE', 'PL', 'PM', 'PS', 'PT', 'RA', 'SA', 'SC', 'SI', 'SR',
            ]);
        });
    });
    (0, globals_1.describe)('PCI-DSS Controls Service', () => {
        const service = (0, index_js_1.getPCIDSSControlsService)();
        (0, globals_1.it)('should be a singleton', () => {
            const service2 = (0, index_js_1.getPCIDSSControlsService)();
            (0, globals_1.expect)(service).toBe(service2);
        });
        (0, globals_1.it)('should return all requirements', () => {
            const requirementIds = Object.keys(index_js_1.REQUIREMENT_METADATA);
            (0, globals_1.expect)(requirementIds.length).toBe(12);
        });
        (0, globals_1.it)('should return controls for a requirement', () => {
            const req1Controls = service.getControlsByRequirement('Requirement1');
            (0, globals_1.expect)(req1Controls.data.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should have stable requirement IDs (contract snapshot)', () => {
            const reqIds = Object.keys(index_js_1.REQUIREMENT_METADATA).sort();
            (0, globals_1.expect)(reqIds).toEqual([
                'Requirement1',
                'Requirement10',
                'Requirement11',
                'Requirement12',
                'Requirement2',
                'Requirement3',
                'Requirement4',
                'Requirement5',
                'Requirement6',
                'Requirement7',
                'Requirement8',
                'Requirement9',
            ]);
        });
        (0, globals_1.it)('should support SAQ types', () => {
            const saqTypes = ['SAQ-A', 'SAQ-A-EP', 'SAQ-B', 'SAQ-B-IP', 'SAQ-C', 'SAQ-C-VT', 'SAQ-D', 'SAQ-P2PE'];
            for (const saqType of saqTypes) {
                const applicableControls = service.getControlsBySAQType(saqType);
                (0, globals_1.expect)(applicableControls.data).toBeInstanceOf(Array);
            }
        });
    });
    (0, globals_1.describe)('NIST CSF Controls Service', () => {
        const service = (0, index_js_1.getNISTCSFControlsService)();
        (0, globals_1.it)('should be a singleton', () => {
            const service2 = (0, index_js_1.getNISTCSFControlsService)();
            (0, globals_1.expect)(service).toBe(service2);
        });
        (0, globals_1.it)('should return all functions', () => {
            const functionIds = Object.keys(index_js_1.FUNCTION_METADATA);
            (0, globals_1.expect)(functionIds.length).toBe(6);
        });
        (0, globals_1.it)('should have stable function IDs (contract snapshot)', () => {
            const funcIds = Object.keys(index_js_1.FUNCTION_METADATA).sort();
            // CSF 2.0 has 6 functions including GOVERN
            (0, globals_1.expect)(funcIds).toEqual([
                'DETECT', 'GOVERN', 'IDENTIFY', 'PROTECT', 'RECOVER', 'RESPOND',
            ]);
        });
        (0, globals_1.it)('should return categories for a function', () => {
            const identifySubcategories = service.getSubcategoriesByFunction('IDENTIFY');
            (0, globals_1.expect)(identifySubcategories.data.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should support implementation tiers', () => {
            const tiers = [1, 2, 3, 4];
            for (const tier of tiers) {
                const description = service.getTierDescription(tier);
                (0, globals_1.expect)(description.data).toBeDefined();
            }
        });
        (0, globals_1.it)('should provide cross-framework mappings', () => {
            const mappings = service.getCrossFrameworkReferences('ID.AM-01');
            (0, globals_1.expect)(mappings.data).toBeDefined();
        });
    });
    (0, globals_1.describe)('CMMC Controls Service', () => {
        const service = (0, index_js_1.getCMMCControlsService)();
        (0, globals_1.it)('should be a singleton', () => {
            const service2 = (0, index_js_1.getCMMCControlsService)();
            (0, globals_1.expect)(service).toBe(service2);
        });
        (0, globals_1.it)('should return all domains', () => {
            const domainIds = Object.keys(index_js_1.DOMAIN_METADATA);
            (0, globals_1.expect)(domainIds.length).toBe(14);
        });
        (0, globals_1.it)('should have stable domain IDs (contract snapshot)', () => {
            const domainIds = Object.keys(index_js_1.DOMAIN_METADATA).sort();
            (0, globals_1.expect)(domainIds).toEqual([
                'AC', 'AT', 'AU', 'CA', 'CM', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'SC', 'SI',
            ]);
        });
        (0, globals_1.it)('should return practices by level', () => {
            const level1Practices = service.getPracticesByLevel(1);
            const level2Practices = service.getPracticesByLevel(2);
            const level3Practices = service.getPracticesByLevel(3);
            (0, globals_1.expect)(level1Practices.data.length).toBeGreaterThan(0);
            (0, globals_1.expect)(level2Practices.data.length).toBeGreaterThan(level1Practices.data.length);
            (0, globals_1.expect)(level3Practices.data.length).toBeGreaterThan(level2Practices.data.length);
        });
        (0, globals_1.it)('should support POA&M generation', () => {
            const now = new Date();
            service.recordImplementation('test-tenant', {
                practiceId: 'AC.L1-3.1.1',
                status: 'partially_implemented',
                evidence: [],
                notes: 'Partially implemented',
                lastReviewedAt: now,
                nextReviewDue: new Date(now.getTime() + 86400000),
            });
            const poams = service.getPOAMs('test-tenant');
            (0, globals_1.expect)(poams.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(poams.data.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Cross-Framework Consistency', () => {
        (0, globals_1.it)('should all services emit DataEnvelope responses', () => {
            const fedRamp = (0, index_js_1.getFedRAMPControlsService)();
            const pciDss = (0, index_js_1.getPCIDSSControlsService)();
            const nistCsf = (0, index_js_1.getNISTCSFControlsService)();
            const cmmc = (0, index_js_1.getCMMCControlsService)();
            // All responses should have the DataEnvelope structure
            const fedRampResult = fedRamp.getControlFamilies();
            const pciResult = pciDss.getControlsByRequirement('Requirement1');
            const nistResult = nistCsf.getSubcategoriesByFunction('IDENTIFY');
            const cmmcResult = cmmc.getPracticesByLevel(1);
            for (const result of [fedRampResult, pciResult, nistResult, cmmcResult]) {
                (0, globals_1.expect)(result).toHaveProperty('data');
                (0, globals_1.expect)(result).toHaveProperty('provenance');
                (0, globals_1.expect)(result).toHaveProperty('governanceVerdict');
                (0, globals_1.expect)(result).toHaveProperty('classification');
                (0, globals_1.expect)(result).toHaveProperty('dataHash');
                (0, globals_1.expect)(result).toHaveProperty('warnings');
            }
        });
        (0, globals_1.it)('should all services include GovernanceVerdict', () => {
            const fedRamp = (0, index_js_1.getFedRAMPControlsService)();
            const pciDss = (0, index_js_1.getPCIDSSControlsService)();
            const nistCsf = (0, index_js_1.getNISTCSFControlsService)();
            const cmmc = (0, index_js_1.getCMMCControlsService)();
            const results = [
                fedRamp.getControlFamilies(),
                pciDss.getControlsByRequirement('Requirement1'),
                nistCsf.getSubcategoriesByFunction('IDENTIFY'),
                cmmc.getPracticesByLevel(1),
            ];
            for (const result of results) {
                (0, globals_1.expect)(result.governanceVerdict).toBeDefined();
                (0, globals_1.expect)(result.governanceVerdict?.result).toBe('ALLOW');
                (0, globals_1.expect)(result.governanceVerdict?.policyId).toBeDefined();
                (0, globals_1.expect)(result.governanceVerdict?.evaluator).toBeDefined();
            }
        });
    });
});
