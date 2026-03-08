"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const sbom_integration_js_1 = require("../sbom-integration.js");
(0, globals_1.describe)('SBOMIntegration', () => {
    let sbomIntegration;
    (0, globals_1.beforeEach)(() => {
        sbomIntegration = new sbom_integration_js_1.SBOMIntegration();
    });
    (0, globals_1.describe)('parseCycloneDX', () => {
        (0, globals_1.it)('should parse CycloneDX SBOM', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                version: 1,
                metadata: {
                    timestamp: '2024-01-15T10:00:00Z',
                },
                components: [
                    {
                        name: 'express',
                        version: '4.18.2',
                        purl: 'pkg:npm/express@4.18.2',
                        licenses: [{ license: { id: 'MIT' } }],
                    },
                    {
                        name: 'lodash',
                        version: '4.17.21',
                        purl: 'pkg:npm/lodash@4.17.21',
                        licenses: [{ license: { id: 'MIT' } }],
                    },
                ],
                vulnerabilities: [],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.sbom.format).toBe('cyclonedx-json');
            (0, globals_1.expect)(result.sbom.components).toBe(2);
            (0, globals_1.expect)(result.components.length).toBe(2);
            (0, globals_1.expect)(result.components[0].name).toBe('express');
        });
        (0, globals_1.it)('should count vulnerabilities correctly', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                version: 1,
                components: [
                    {
                        name: 'vulnerable-pkg',
                        version: '1.0.0',
                        purl: 'pkg:npm/vulnerable-pkg@1.0.0',
                    },
                ],
                vulnerabilities: [
                    {
                        id: 'CVE-2024-0001',
                        ratings: [{ severity: 'critical' }],
                        affects: [{ ref: 'pkg:npm/vulnerable-pkg@1.0.0' }],
                    },
                    {
                        id: 'CVE-2024-0002',
                        ratings: [{ severity: 'high' }],
                        affects: [{ ref: 'pkg:npm/vulnerable-pkg@1.0.0' }],
                    },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.vulnerabilities.critical).toBe(1);
            (0, globals_1.expect)(result.vulnerabilities.high).toBe(1);
            (0, globals_1.expect)(result.vulnerabilities.total).toBe(2);
        });
        (0, globals_1.it)('should analyze licenses', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'pkg1', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
                    { name: 'pkg2', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
                    { name: 'pkg3', version: '1.0', licenses: [{ license: { id: 'Apache-2.0' } }] },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.licenses.length).toBe(2);
            const mitLicense = result.licenses.find((l) => l.name === 'MIT');
            (0, globals_1.expect)(mitLicense?.count).toBe(2);
            (0, globals_1.expect)(mitLicense?.approved).toBe(true);
        });
    });
    (0, globals_1.describe)('parseSPDX', () => {
        (0, globals_1.it)('should parse SPDX SBOM', () => {
            const mockSBOM = {
                spdxVersion: 'SPDX-2.3',
                creationInfo: {
                    created: '2024-01-15T10:00:00Z',
                },
                packages: [
                    {
                        name: 'react',
                        versionInfo: '18.2.0',
                        licenseDeclared: 'MIT',
                    },
                    {
                        name: 'typescript',
                        versionInfo: '5.3.3',
                        licenseDeclared: 'Apache-2.0',
                    },
                ],
            };
            const result = sbomIntegration.parseSPDX(mockSBOM);
            (0, globals_1.expect)(result.sbom.format).toBe('spdx-json');
            (0, globals_1.expect)(result.sbom.components).toBe(2);
            (0, globals_1.expect)(result.components[0].name).toBe('react');
        });
    });
    (0, globals_1.describe)('checkCompliance', () => {
        (0, globals_1.it)('should pass when no vulnerabilities', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'safe-pkg', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
                ],
                vulnerabilities: [],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.complianceStatus.passesSecurityThreshold).toBe(true);
            (0, globals_1.expect)(result.complianceStatus.passesLicensePolicy).toBe(true);
        });
        (0, globals_1.it)('should fail when critical vulnerabilities exceed threshold', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'vuln-pkg', version: '1.0', purl: 'pkg:npm/vuln-pkg@1.0' },
                ],
                vulnerabilities: [
                    {
                        id: 'CVE-2024-0001',
                        ratings: [{ severity: 'critical' }],
                        affects: [{ ref: 'pkg:npm/vuln-pkg@1.0' }],
                    },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.complianceStatus.passesSecurityThreshold).toBe(false);
            (0, globals_1.expect)(result.complianceStatus.issues.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should fail when denied license is present', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'gpl-pkg', version: '1.0', licenses: [{ license: { id: 'GPL-3.0' } }] },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.complianceStatus.passesLicensePolicy).toBe(false);
            (0, globals_1.expect)(result.complianceStatus.issues.some((i) => i.includes('Denied license'))).toBe(true);
        });
        (0, globals_1.it)('should flag licenses requiring review', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'epl-pkg', version: '1.0', licenses: [{ license: { id: 'EPL-2.0' } }] },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.complianceStatus.requiresReview).toBe(true);
        });
    });
    (0, globals_1.describe)('generateAttestation', () => {
        (0, globals_1.it)('should generate attestation document', () => {
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'pkg1', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
                ],
                vulnerabilities: [],
            };
            const analysis = sbomIntegration.parseCycloneDX(mockSBOM);
            const attestation = sbomIntegration.generateAttestation(analysis);
            (0, globals_1.expect)(attestation).toContain('SBOM Compliance Attestation');
            (0, globals_1.expect)(attestation).toContain('Vulnerability Summary');
            (0, globals_1.expect)(attestation).toContain('License Summary');
            (0, globals_1.expect)(attestation).toContain('Compliance Status');
        });
    });
    (0, globals_1.describe)('setLicensePolicy', () => {
        (0, globals_1.it)('should allow custom license policy', () => {
            sbomIntegration.setLicensePolicy({
                approved: ['MIT'],
                denied: ['Apache-2.0'],
                requiresReview: [],
            });
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'apache-pkg', version: '1.0', licenses: [{ license: { id: 'Apache-2.0' } }] },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            (0, globals_1.expect)(result.complianceStatus.passesLicensePolicy).toBe(false);
        });
    });
    (0, globals_1.describe)('setVulnerabilityThreshold', () => {
        (0, globals_1.it)('should allow custom vulnerability thresholds', () => {
            sbomIntegration.setVulnerabilityThreshold({
                maxCritical: 5,
                maxHigh: 10,
                maxMedium: 50,
                maxTotal: 100,
                maxAgeForCriticalDays: 30,
                maxAgeForHighDays: 60,
            });
            const mockSBOM = {
                bomFormat: 'CycloneDX',
                components: [
                    { name: 'vuln-pkg', version: '1.0', purl: 'pkg:npm/vuln-pkg@1.0' },
                ],
                vulnerabilities: [
                    {
                        id: 'CVE-2024-0001',
                        ratings: [{ severity: 'critical' }],
                        affects: [{ ref: 'pkg:npm/vuln-pkg@1.0' }],
                    },
                ],
            };
            const result = sbomIntegration.parseCycloneDX(mockSBOM);
            // With maxCritical=5, 1 critical should pass
            (0, globals_1.expect)(result.complianceStatus.passesSecurityThreshold).toBe(true);
        });
    });
});
