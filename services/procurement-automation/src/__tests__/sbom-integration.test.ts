import { describe, it, expect, beforeEach } from '@jest/globals';
import { SBOMIntegration } from '../sbom-integration.js';

describe('SBOMIntegration', () => {
  let sbomIntegration: SBOMIntegration;

  beforeEach(() => {
    sbomIntegration = new SBOMIntegration();
  });

  describe('parseCycloneDX', () => {
    it('should parse CycloneDX SBOM', () => {
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

      expect(result.sbom.format).toBe('cyclonedx-json');
      expect(result.sbom.components).toBe(2);
      expect(result.components.length).toBe(2);
      expect(result.components[0].name).toBe('express');
    });

    it('should count vulnerabilities correctly', () => {
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

      expect(result.vulnerabilities.critical).toBe(1);
      expect(result.vulnerabilities.high).toBe(1);
      expect(result.vulnerabilities.total).toBe(2);
    });

    it('should analyze licenses', () => {
      const mockSBOM = {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'pkg1', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
          { name: 'pkg2', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
          { name: 'pkg3', version: '1.0', licenses: [{ license: { id: 'Apache-2.0' } }] },
        ],
      };

      const result = sbomIntegration.parseCycloneDX(mockSBOM);

      expect(result.licenses.length).toBe(2);
      const mitLicense = result.licenses.find((l) => l.name === 'MIT');
      expect(mitLicense?.count).toBe(2);
      expect(mitLicense?.approved).toBe(true);
    });
  });

  describe('parseSPDX', () => {
    it('should parse SPDX SBOM', () => {
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

      expect(result.sbom.format).toBe('spdx-json');
      expect(result.sbom.components).toBe(2);
      expect(result.components[0].name).toBe('react');
    });
  });

  describe('checkCompliance', () => {
    it('should pass when no vulnerabilities', () => {
      const mockSBOM = {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'safe-pkg', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
        ],
        vulnerabilities: [],
      };

      const result = sbomIntegration.parseCycloneDX(mockSBOM);

      expect(result.complianceStatus.passesSecurityThreshold).toBe(true);
      expect(result.complianceStatus.passesLicensePolicy).toBe(true);
    });

    it('should fail when critical vulnerabilities exceed threshold', () => {
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

      expect(result.complianceStatus.passesSecurityThreshold).toBe(false);
      expect(result.complianceStatus.issues.length).toBeGreaterThan(0);
    });

    it('should fail when denied license is present', () => {
      const mockSBOM = {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'gpl-pkg', version: '1.0', licenses: [{ license: { id: 'GPL-3.0' } }] },
        ],
      };

      const result = sbomIntegration.parseCycloneDX(mockSBOM);

      expect(result.complianceStatus.passesLicensePolicy).toBe(false);
      expect(
        result.complianceStatus.issues.some((i) => i.includes('Denied license')),
      ).toBe(true);
    });

    it('should flag licenses requiring review', () => {
      const mockSBOM = {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'epl-pkg', version: '1.0', licenses: [{ license: { id: 'EPL-2.0' } }] },
        ],
      };

      const result = sbomIntegration.parseCycloneDX(mockSBOM);

      expect(result.complianceStatus.requiresReview).toBe(true);
    });
  });

  describe('generateAttestation', () => {
    it('should generate attestation document', () => {
      const mockSBOM = {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'pkg1', version: '1.0', licenses: [{ license: { id: 'MIT' } }] },
        ],
        vulnerabilities: [],
      };

      const analysis = sbomIntegration.parseCycloneDX(mockSBOM);
      const attestation = sbomIntegration.generateAttestation(analysis);

      expect(attestation).toContain('SBOM Compliance Attestation');
      expect(attestation).toContain('Vulnerability Summary');
      expect(attestation).toContain('License Summary');
      expect(attestation).toContain('Compliance Status');
    });
  });

  describe('setLicensePolicy', () => {
    it('should allow custom license policy', () => {
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

      expect(result.complianceStatus.passesLicensePolicy).toBe(false);
    });
  });

  describe('setVulnerabilityThreshold', () => {
    it('should allow custom vulnerability thresholds', () => {
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
      expect(result.complianceStatus.passesSecurityThreshold).toBe(true);
    });
  });
});
