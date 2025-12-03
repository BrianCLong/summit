import { describe, it, expect, beforeEach } from '@jest/globals';
import { RequirementsParser } from '../requirements-parser.js';

describe('RequirementsParser', () => {
  let parser: RequirementsParser;

  beforeEach(() => {
    parser = new RequirementsParser();
  });

  describe('parseRequirementsText', () => {
    it('should detect FedRAMP Moderate from text', () => {
      const result = parser.parseRequirementsText(
        'We need FedRAMP Moderate authorization for our cloud service',
      );
      expect(result.frameworks).toContain('FedRAMP_Moderate');
      expect(result.riskLevel).toBe('moderate');
    });

    it('should detect FedRAMP High from text', () => {
      const result = parser.parseRequirementsText(
        'Seeking FedRAMP High authorization',
      );
      expect(result.frameworks).toContain('FedRAMP_High');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect CMMC Level 2 from text', () => {
      const result = parser.parseRequirementsText(
        'Must achieve CMMC Level 2 certification',
      );
      expect(result.frameworks).toContain('CMMC_L2');
    });

    it('should detect IL5 from text', () => {
      const result = parser.parseRequirementsText(
        'DoD IL-5 authorization required',
      );
      expect(result.frameworks).toContain('IL5');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect multiple frameworks', () => {
      const result = parser.parseRequirementsText(
        'Need both FedRAMP Moderate and SOC 2 compliance',
      );
      expect(result.frameworks).toContain('FedRAMP_Moderate');
      expect(result.frameworks).toContain('SOC2');
    });

    it('should detect data classification from text', () => {
      const result = parser.parseRequirementsText(
        'System handles CUI data requiring FedRAMP',
      );
      expect(result.dataClassification).toBe('cui');
    });

    it('should default to FedRAMP_Moderate when no framework detected', () => {
      const result = parser.parseRequirementsText(
        'We need cloud authorization',
      );
      expect(result.frameworks).toContain('FedRAMP_Moderate');
    });
  });

  describe('parseStructuredRequirements', () => {
    it('should return correct requirements for FedRAMP_High', () => {
      const result = parser.parseStructuredRequirements({
        frameworks: ['FedRAMP_High'],
        dataClassification: 'cui',
      });

      expect(result.frameworks).toEqual(['FedRAMP_High']);
      expect(result.riskLevel).toBe('high');
      expect(result.requiredDocuments).toContain('SSP');
      expect(result.requiredDocuments).toContain('SAR');
      expect(result.requiredDocuments).toContain('SBOM');
      expect(result.requiredDocuments).toContain('PENETRATION_TEST');
      expect(result.estimatedControls).toBeGreaterThan(400);
    });

    it('should aggregate control families from multiple frameworks', () => {
      const result = parser.parseStructuredRequirements({
        frameworks: ['FedRAMP_Moderate', 'HIPAA'],
      });

      expect(result.controlFamilies).toContain('AC');
      expect(result.controlFamilies).toContain('AU');
      expect(result.controlFamilies).toContain('SC');
    });

    it('should calculate correct risk level for secret classification', () => {
      const result = parser.parseStructuredRequirements({
        frameworks: ['FedRAMP_Moderate'],
        dataClassification: 'secret',
      });

      expect(result.riskLevel).toBe('high');
    });

    it('should provide gap analysis', () => {
      const result = parser.parseStructuredRequirements({
        frameworks: ['FedRAMP_Moderate'],
      });

      expect(result.gapAnalysis.length).toBeGreaterThan(0);
      expect(result.gapAnalysis[0]).toHaveProperty('family');
      expect(result.gapAnalysis[0]).toHaveProperty('familyName');
      expect(result.gapAnalysis[0]).toHaveProperty('priority');
    });
  });

  describe('generateInitialControls', () => {
    it('should generate controls from parsed requirements', () => {
      const requirements = parser.parseStructuredRequirements({
        frameworks: ['FedRAMP_Moderate'],
      });

      const controls = parser.generateInitialControls(requirements);

      expect(controls.length).toBeGreaterThan(0);
      expect(controls[0]).toHaveProperty('id');
      expect(controls[0]).toHaveProperty('family');
      expect(controls[0]).toHaveProperty('title');
      expect(controls[0]).toHaveProperty('status');
      expect(controls[0].status).toBe('not_started');
    });

    it('should assign correct priorities to controls', () => {
      const requirements = parser.parseStructuredRequirements({
        frameworks: ['FedRAMP_High'],
      });

      const controls = parser.generateInitialControls(requirements);

      const acControls = controls.filter((c) => c.family === 'AC');
      expect(acControls.length).toBeGreaterThan(0);
      expect(acControls[0].priority).toBe('P0'); // AC is critical
    });
  });
});
