/**
 * Compliance Frameworks Integration Tests
 *
 * Tests for framework discovery, control mapping, and stable IDs.
 * These tests serve as contract snapshots to catch accidental renames.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC3.1 (Risk Assessment)
 */

import {
  getFrameworkMetadata,
  getFedRAMPControlsService,
  getPCIDSSControlsService,
  getNISTCSFControlsService,
  getCMMCControlsService,
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
      expect(families.data.length).toBeGreaterThan(0);

      // Verify expected families exist
      const familyIds = families.data.map((f) => f.id);
      expect(familyIds).toContain('AC');
      expect(familyIds).toContain('AU');
      expect(familyIds).toContain('SC');
      expect(familyIds).toContain('SI');
    });

    it('should return controls for a family', () => {
      const acControls = service.getControlsByFamily('AC');
      expect(acControls.data.length).toBeGreaterThan(0);

      // Verify AC-1 exists (Access Control Policy and Procedures)
      const ac1 = acControls.data.find((c) => c.id === 'AC-1');
      expect(ac1).toBeDefined();
      expect(ac1?.title).toContain('Access Control');
    });

    it('should have stable control IDs (contract snapshot)', () => {
      const allFamilies = service.getControlFamilies();
      const familyIds = allFamilies.data.map((f) => f.id).sort();

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
      const requirements = service.getRequirements();
      expect(requirements.data.length).toBe(12);
    });

    it('should return controls for a requirement', () => {
      const req1Controls = service.getControlsByRequirement('1');
      expect(req1Controls.data.length).toBeGreaterThan(0);
    });

    it('should have stable requirement IDs (contract snapshot)', () => {
      const requirements = service.getRequirements();
      const reqIds = requirements.data.map((r: any) => r.id).sort();

      expect(reqIds).toEqual([
        '1', '10', '11', '12', '2', '3', '4', '5', '6', '7', '8', '9',
      ]);
    });

    it('should support SAQ types', () => {
      const saqTypes = ['SAQ-A', 'SAQ-A-EP', 'SAQ-B', 'SAQ-B-IP', 'SAQ-C', 'SAQ-C-VT', 'SAQ-D', 'SAQ-P2PE'];

      for (const saqType of saqTypes) {
        const applicableControls = service.getControlsBySAQ(saqType as any);
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
      const functions = service.getFunctions();
      expect(functions.data.length).toBe(6);
    });

    it('should have stable function IDs (contract snapshot)', () => {
      const functions = service.getFunctions();
      const funcIds = functions.data.map((f) => f.id).sort();

      // CSF 2.0 has 6 functions including GOVERN
      expect(funcIds).toEqual([
        'DETECT', 'GOVERN', 'IDENTIFY', 'PROTECT', 'RECOVER', 'RESPOND',
      ]);
    });

    it('should return categories for a function', () => {
      const identifyCategories = service.getCategoriesByFunction('IDENTIFY');
      expect(identifyCategories.data.length).toBeGreaterThan(0);
    });

    it('should support implementation tiers', () => {
      const tiers = [1, 2, 3, 4];

      for (const tier of tiers) {
        const assessment = service.assessTier(tier as any);
        expect(assessment.data).toBeDefined();
        expect(assessment.data.tier).toBe(tier);
      }
    });

    it('should provide cross-framework mappings', () => {
      // NIST CSF should map to NIST 800-53 and ISO 27001
      const mappings = service.getCrossFrameworkMappings('IDENTIFY');
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
      const domains = service.getDomains();
      expect(domains.data.length).toBe(14);
    });

    it('should have stable domain IDs (contract snapshot)', () => {
      const domains = service.getDomains();
      const domainIds = domains.data.map((d) => d.id).sort();

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
      // Record a practice implementation
      service.recordImplementation('AC.L1-3.1.1', {
        status: 'partial',
        evidence: [],
        notes: 'Partially implemented',
      });

      // Generate POA&M for gaps
      const poam = service.generatePOAM('test-tenant', 2);
      expect(poam.data).toBeDefined();
      expect(poam.data.items).toBeInstanceOf(Array);
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
      const pciResult = pciDss.getRequirements();
      const nistResult = nistCsf.getFunctions();
      const cmmcResult = cmmc.getDomains();

      for (const result of [fedRampResult, pciResult, nistResult, cmmcResult]) {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('metadata');
        expect(result).toHaveProperty('verdict');
        expect(result.metadata).toHaveProperty('source');
        expect(result.verdict).toHaveProperty('result');
      }
    });

    it('should all services include GovernanceVerdict', () => {
      const fedRamp = getFedRAMPControlsService();
      const pciDss = getPCIDSSControlsService();
      const nistCsf = getNISTCSFControlsService();
      const cmmc = getCMMCControlsService();

      const results = [
        fedRamp.getControlFamilies(),
        pciDss.getRequirements(),
        nistCsf.getFunctions(),
        cmmc.getDomains(),
      ];

      for (const result of results) {
        expect(result.verdict).toBeDefined();
        expect(result.verdict.result).toBe('ALLOW');
        expect(result.verdict.policyId).toBeDefined();
        expect(result.verdict.evaluator).toBeDefined();
      }
    });
  });
});
