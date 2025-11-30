/**
 * ESG Compliance Frameworks Tests
 * Tests for framework definitions and compliance assessment
 */

import {
  getAllFrameworks,
  getFramework,
  getFrameworksByCategory,
  getRequirementsByMetric,
  assessCompliance,
  GRI_FRAMEWORK,
  SASB_FRAMEWORK,
  TCFD_FRAMEWORK,
  CDP_FRAMEWORK,
  CSRD_FRAMEWORK,
} from '@intelgraph/esg-reporting';

describe('ESG Compliance Frameworks', () => {
  describe('getAllFrameworks', () => {
    it('should return all available frameworks', () => {
      const frameworks = getAllFrameworks();
      expect(frameworks.length).toBeGreaterThanOrEqual(5);

      const ids = frameworks.map((f) => f.id);
      expect(ids).toContain('gri');
      expect(ids).toContain('sasb');
      expect(ids).toContain('tcfd');
      expect(ids).toContain('cdp');
      expect(ids).toContain('csrd');
    });
  });

  describe('getFramework', () => {
    it('should return framework by ID', () => {
      const gri = getFramework('gri');
      expect(gri).toBeDefined();
      expect(gri?.name).toBe('GRI Standards');
    });

    it('should return undefined for unknown framework', () => {
      const unknown = getFramework('unknown');
      expect(unknown).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const lower = getFramework('gri');
      const upper = getFramework('GRI');
      expect(lower).toEqual(upper);
    });
  });

  describe('getFrameworksByCategory', () => {
    it('should return frameworks that cover environmental metrics', () => {
      const frameworks = getFrameworksByCategory('environmental');
      expect(frameworks.length).toBeGreaterThan(0);

      for (const fw of frameworks) {
        expect(fw.categories).toContain('environmental');
      }
    });

    it('should return frameworks that cover social metrics', () => {
      const frameworks = getFrameworksByCategory('social');
      expect(frameworks.length).toBeGreaterThan(0);

      for (const fw of frameworks) {
        expect(fw.categories).toContain('social');
      }
    });

    it('should return frameworks that cover governance metrics', () => {
      const frameworks = getFrameworksByCategory('governance');
      expect(frameworks.length).toBeGreaterThan(0);

      for (const fw of frameworks) {
        expect(fw.categories).toContain('governance');
      }
    });
  });

  describe('getRequirementsByMetric', () => {
    it('should find frameworks requiring scope1Emissions', () => {
      const results = getRequirementsByMetric('scope1Emissions');
      expect(results.length).toBeGreaterThan(0);

      const frameworks = results.map((r) => r.framework);
      expect(frameworks).toContain('gri');
      expect(frameworks).toContain('tcfd');
    });

    it('should return empty array for unknown metric', () => {
      const results = getRequirementsByMetric('unknownMetric');
      expect(results).toEqual([]);
    });
  });

  describe('assessCompliance', () => {
    it('should assess GRI compliance correctly', () => {
      const reportedMetrics = [
        'totalEnergyConsumption',
        'renewableEnergy',
        'energyIntensity',
        'energyReduction',
        'waterWithdrawal',
        'waterDischarge',
        'waterConsumption',
        'waterRecycled',
        'scope1Emissions',
        'scope2Emissions',
        'scope3Emissions',
        'emissionsIntensity',
        'emissionsReduction',
      ];

      const assessment = assessCompliance('gri', reportedMetrics);

      expect(assessment.framework).toBe('gri');
      expect(assessment.totalRequirements).toBeGreaterThan(0);
      expect(assessment.compliancePercentage).toBeGreaterThanOrEqual(0);
      expect(assessment.compliancePercentage).toBeLessThanOrEqual(100);
      expect(['compliant', 'partially_compliant', 'non_compliant']).toContain(
        assessment.status,
      );
    });

    it('should identify compliance gaps', () => {
      const reportedMetrics = ['scope1Emissions']; // Only one metric

      const assessment = assessCompliance('gri', reportedMetrics);

      expect(assessment.gaps.length).toBeGreaterThan(0);
      expect(assessment.mandatoryCompliancePercentage).toBeLessThan(100);
    });

    it('should show full compliance when all mandatory metrics reported', () => {
      // Report all mandatory GRI metrics
      const allMetrics = GRI_FRAMEWORK.requirements
        .filter((r) => r.mandatory)
        .flatMap((r) => r.metrics);

      const assessment = assessCompliance('gri', allMetrics);

      expect(assessment.mandatoryCompliancePercentage).toBe(100);
      expect(assessment.status).toBe('compliant');
    });

    it('should throw error for unknown framework', () => {
      expect(() => assessCompliance('unknown', [])).toThrow('Unknown framework');
    });
  });

  describe('GRI Framework', () => {
    it('should have all required properties', () => {
      expect(GRI_FRAMEWORK).toHaveProperty('id', 'gri');
      expect(GRI_FRAMEWORK).toHaveProperty('name');
      expect(GRI_FRAMEWORK).toHaveProperty('fullName');
      expect(GRI_FRAMEWORK).toHaveProperty('version');
      expect(GRI_FRAMEWORK).toHaveProperty('description');
      expect(GRI_FRAMEWORK).toHaveProperty('website');
      expect(GRI_FRAMEWORK).toHaveProperty('requirements');
    });

    it('should cover all ESG categories', () => {
      expect(GRI_FRAMEWORK.categories).toContain('environmental');
      expect(GRI_FRAMEWORK.categories).toContain('social');
      expect(GRI_FRAMEWORK.categories).toContain('governance');
    });

    it('should have valid requirements', () => {
      for (const req of GRI_FRAMEWORK.requirements) {
        expect(req).toHaveProperty('id');
        expect(req).toHaveProperty('name');
        expect(req).toHaveProperty('description');
        expect(req).toHaveProperty('category');
        expect(req).toHaveProperty('metrics');
        expect(req.metrics.length).toBeGreaterThan(0);
      }
    });
  });

  describe('TCFD Framework', () => {
    it('should focus on climate-related disclosures', () => {
      expect(TCFD_FRAMEWORK.categories).toContain('environmental');
      expect(TCFD_FRAMEWORK.categories).toContain('governance');
    });

    it('should have governance and strategy requirements', () => {
      const categories = TCFD_FRAMEWORK.requirements.map((r) => r.subcategory);
      expect(categories).toContain('boardOversight');
      expect(categories).toContain('climateRisk');
      expect(categories).toContain('emissions');
    });
  });

  describe('CSRD Framework', () => {
    it('should be EU-focused', () => {
      expect(CSRD_FRAMEWORK.geographicScope).toContain('EU');
    });

    it('should include ESRS requirements', () => {
      const ids = CSRD_FRAMEWORK.requirements.map((r) => r.id);
      expect(ids.some((id) => id.startsWith('esrs'))).toBe(true);
    });

    it('should cover circular economy', () => {
      const subcategories = CSRD_FRAMEWORK.requirements.map((r) => r.subcategory);
      expect(subcategories).toContain('circularEconomy');
    });
  });
});
