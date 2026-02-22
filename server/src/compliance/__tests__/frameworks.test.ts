/**
 * Compliance Frameworks Integration Tests
 *
 * Tests for framework discovery, control mapping, and stable IDs.
 * These tests serve as contract snapshots to catch accidental renames.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC3.1 (Risk Assessment)
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  getFrameworkMetadata,
  getFedRAMPControlsService,
  getPCIDSSControlsService,
  getNISTCSFControlsService,
  getCMMCControlsService,
  REQUIREMENT_METADATA,
  FUNCTION_METADATA,
  DOMAIN_METADATA,
} from '../frameworks/index';

describe('Compliance Frameworks', () => {
  describe('Framework Discovery', () => {
    it('should return all implemented frameworks', () => {
      const frameworks = getFrameworkMetadata();

      expect(frameworks).toHaveLength(4);
      expect(frameworks.map((f) => f.id)).toEqual([
        'FedRAMP',
        'PCI-DSS',
        'NIST-CSF',
        'CMMC',
      ]);
    });

    it('should have valid metadata for each framework', () => {
      const frameworks = getFrameworkMetadata();

      for (const framework of frameworks) {
        expect(framework.id).toBeTruthy();
        expect(framework.name).toBeTruthy();
        expect(framework.version).toBeTruthy();
        expect(framework.description).toBeTruthy();
        expect(framework.controlCount).toBeGreaterThan(0);
        expect(framework.applicableTo).toBeInstanceOf(Array);
        expect(framework.applicableTo.length).toBeGreaterThan(0);
        expect(typeof framework.certificationRequired).toBe('boolean');
      }
    });

    it('should match expected control counts (contract snapshot)', () => {
      const frameworks = getFrameworkMetadata();
      const countMap = Object.fromEntries(
        frameworks.map((f) => [f.id, f.controlCount])
      );

      // These are contract values - if they change, the test should fail
      // to alert us to potentially breaking changes
      expect(countMap['FedRAMP']).toBe(325);
      expect(countMap['PCI-DSS']).toBe(250);
      expect(countMap['NIST-CSF']).toBe(106);
      expect(countMap['CMMC']).toBe(130);
    });
  });

  describe('FedRAMP Controls Service', () => {
    const service = getFedRAMPControlsService();

    it('should be a singleton', () => {
      const service2 = getFedRAMPControlsService();
      expect(service).toBe(service2);
    });

    it('should return control families', () => {
      const families = service.getControlFamilies();
      const familyIds = Object.keys(families.data);
      expect(familyIds.length).toBeGreaterThan(0);

      // Verify expected families exist
      expect(familyIds).toContain('AC');
      expect(familyIds).toContain('AU');
      expect(familyIds).toContain('SC');
      expect(familyIds).toContain('SI');
    });

    it('should return controls for a family', () => {
      const acControls = service.getControlsByFamily('AC');
      expect(acControls.data.length).toBeGreaterThan(0);

      // Verify AC-1 exists (Access Control Policy and Procedures)
      const ac1 = acControls.data.find((c) => c.controlId === 'AC-1');
      expect(ac1).toBeDefined();
      expect(ac1?.title).toBeTruthy();
    });

    it('should have stable control IDs (contract snapshot)', () => {
      const allFamilies = service.getControlFamilies();
      const familyIds = Object.keys(allFamilies.data).sort();

      // These family IDs should remain stable
      expect(familyIds).toEqual([
        'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP',
        'PE', 'PL', 'PM', 'PS', 'PT', 'RA', 'SA', 'SC', 'SI', 'SR',
      ]);
    });
  });

  describe('PCI-DSS Controls Service', () => {
    const service = getPCIDSSControlsService();

    it('should be a singleton', () => {
      const service2 = getPCIDSSControlsService();
      expect(service).toBe(service2);
    });

    it('should return all requirements', () => {
      const requirementIds = Object.keys(REQUIREMENT_METADATA);
      expect(requirementIds.length).toBe(12);
    });

    it('should return controls for a requirement', () => {
      const req1Controls = service.getControlsByRequirement('Requirement1');
      expect(req1Controls.data.length).toBeGreaterThan(0);
    });

    it('should have stable requirement IDs (contract snapshot)', () => {
      const reqIds = Object.keys(REQUIREMENT_METADATA).sort();

      expect(reqIds).toEqual([
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

    it('should support SAQ types', () => {
      const saqTypes = ['SAQ-A', 'SAQ-A-EP', 'SAQ-B', 'SAQ-B-IP', 'SAQ-C', 'SAQ-C-VT', 'SAQ-D', 'SAQ-P2PE'];

      for (const saqType of saqTypes) {
        const applicableControls = service.getControlsBySAQType(saqType as any);
        expect(applicableControls.data).toBeInstanceOf(Array);
      }
    });
  });

  describe('NIST CSF Controls Service', () => {
    const service = getNISTCSFControlsService();

    it('should be a singleton', () => {
      const service2 = getNISTCSFControlsService();
      expect(service).toBe(service2);
    });

    it('should return all functions', () => {
      const functionIds = Object.keys(FUNCTION_METADATA);
      expect(functionIds.length).toBe(6);
    });

    it('should have stable function IDs (contract snapshot)', () => {
      const funcIds = Object.keys(FUNCTION_METADATA).sort();

      // CSF 2.0 has 6 functions including GOVERN
      expect(funcIds).toEqual([
        'DETECT', 'GOVERN', 'IDENTIFY', 'PROTECT', 'RECOVER', 'RESPOND',
      ]);
    });

    it('should return categories for a function', () => {
      const identifySubcategories = service.getSubcategoriesByFunction('IDENTIFY');
      expect(identifySubcategories.data.length).toBeGreaterThan(0);
    });

    it('should support implementation tiers', () => {
      const tiers = [1, 2, 3, 4];

      for (const tier of tiers) {
        const description = service.getTierDescription(tier as any);
        expect(description.data).toBeDefined();
      }
    });

    it('should provide cross-framework mappings', () => {
      const mappings = service.getCrossFrameworkReferences('ID.AM-01');
      expect(mappings.data).toBeDefined();
    });
  });

  describe('CMMC Controls Service', () => {
    const service = getCMMCControlsService();

    it('should be a singleton', () => {
      const service2 = getCMMCControlsService();
      expect(service).toBe(service2);
    });

    it('should return all domains', () => {
      const domainIds = Object.keys(DOMAIN_METADATA);
      expect(domainIds.length).toBe(14);
    });

    it('should have stable domain IDs (contract snapshot)', () => {
      const domainIds = Object.keys(DOMAIN_METADATA).sort();

      expect(domainIds).toEqual([
        'AC', 'AT', 'AU', 'CA', 'CM', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'SC', 'SI',
      ]);
    });

    it('should return practices by level', () => {
      const level1Practices = service.getPracticesByLevel(1);
      const level2Practices = service.getPracticesByLevel(2);
      const level3Practices = service.getPracticesByLevel(3);

      expect(level1Practices.data.length).toBeGreaterThan(0);
      expect(level2Practices.data.length).toBeGreaterThan(level1Practices.data.length);
      expect(level3Practices.data.length).toBeGreaterThan(level2Practices.data.length);
    });

    it('should support POA&M generation', () => {
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
      expect(poams.data).toBeInstanceOf(Array);
      expect(poams.data.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Framework Consistency', () => {
    it('should all services emit DataEnvelope responses', () => {
      const fedRamp = getFedRAMPControlsService();
      const pciDss = getPCIDSSControlsService();
      const nistCsf = getNISTCSFControlsService();
      const cmmc = getCMMCControlsService();

      // All responses should have the DataEnvelope structure
      const fedRampResult = fedRamp.getControlFamilies();
      const pciResult = pciDss.getControlsByRequirement('Requirement1');
      const nistResult = nistCsf.getSubcategoriesByFunction('IDENTIFY');
      const cmmcResult = cmmc.getPracticesByLevel(1);

      for (const result of [fedRampResult, pciResult, nistResult, cmmcResult]) {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('provenance');
        expect(result).toHaveProperty('governanceVerdict');
        expect(result).toHaveProperty('classification');
        expect(result).toHaveProperty('dataHash');
        expect(result).toHaveProperty('warnings');
      }
    });

    it('should all services include GovernanceVerdict', () => {
      const fedRamp = getFedRAMPControlsService();
      const pciDss = getPCIDSSControlsService();
      const nistCsf = getNISTCSFControlsService();
      const cmmc = getCMMCControlsService();

      const results = [
        fedRamp.getControlFamilies(),
        pciDss.getControlsByRequirement('Requirement1'),
        nistCsf.getSubcategoriesByFunction('IDENTIFY'),
        cmmc.getPracticesByLevel(1),
      ];

      for (const result of results) {
        expect(result.governanceVerdict).toBeDefined();
        expect(result.governanceVerdict?.result).toBe('ALLOW');
        expect(result.governanceVerdict?.policyId).toBeDefined();
        expect(result.governanceVerdict?.evaluator).toBeDefined();
      }
    });
  });
});
