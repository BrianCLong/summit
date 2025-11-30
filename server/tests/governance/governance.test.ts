
import { GovernanceRiskService } from '../../src/services/governance/GovernanceRiskService';
import { MissionGuardrailService } from '../../src/services/governance/MissionGuardrailService';
import { PhilanthropyService } from '../../src/services/governance/PhilanthropyService';
import { describe, it, expect } from '@jest/globals';

describe('Governance & Ethics Layer', () => {

  describe('GovernanceRiskService', () => {
    const service = GovernanceRiskService.getInstance();

    it('should assign HIGH risk and DENY mitigation for authoritarian partnerships', () => {
      const result = service.calculateRisk({
        partnerships: ['authoritarian_regime_support']
      });
      expect(result.score).toBeGreaterThanOrEqual(100);
      expect(result.requiredMitigation).toBe('DENY');
    });

    it('should assign MEDIUM risk and REVIEW for high-risk use cases', () => {
      const result = service.calculateRisk({
        useCase: 'surveillance'
      });
      expect(result.score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('MissionGuardrailService', () => {
    const service = MissionGuardrailService.getInstance();

    it('should block disallowed sectors', () => {
      const result = service.checkGuardrails({
        sector: 'gambling'
      });
      expect(result.allowed).toBe(false);
      expect(result.violations[0]).toContain('disallowed');
    });

    it('should pass allowed sectors with safe parameters', () => {
      const result = service.checkGuardrails({
        sector: 'healthcare',
        useCase: 'data_analysis'
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('PhilanthropyService', () => {
    const service = PhilanthropyService.getInstance();

    it('should calculate correct sliding scale contribution', () => {
      const smallEvent = service.calculateObligation({
        id: '1', type: 'PROFIT_DISTRIBUTION', amount: 100000, entityId: 'e1', timestamp: new Date()
      });
      expect(smallEvent.contribution).toBe(1000); // 1%

      const largeEvent = service.calculateObligation({
        id: '2', type: 'PROFIT_DISTRIBUTION', amount: 20000000, entityId: 'e1', timestamp: new Date()
      });
      expect(largeEvent.contribution).toBe(1000000); // 5%
    });
  });
});
