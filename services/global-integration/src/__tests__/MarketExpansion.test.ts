/**
 * Tests for Market Expansion Service
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MarketExpansionService } from '../MarketExpansion';
import type { MarketRegion } from '../types';

describe('MarketExpansionService', () => {
  let service: MarketExpansionService;

  beforeEach(() => {
    service = new MarketExpansionService();
  });

  describe('getMarketProfile', () => {
    it('should return Baltic market profile', () => {
      const profile = service.getMarketProfile('Baltic');

      expect(profile).toBeDefined();
      expect(profile?.region).toBe('Baltic');
      expect(profile?.countries.length).toBe(3);
      expect(profile?.countries.map((c) => c.code)).toContain('EE');
      expect(profile?.countries.map((c) => c.code)).toContain('LV');
      expect(profile?.countries.map((c) => c.code)).toContain('LT');
    });

    it('should return Nordic market profile', () => {
      const profile = service.getMarketProfile('Nordic');

      expect(profile).toBeDefined();
      expect(profile?.region).toBe('Nordic');
      expect(profile?.digitalInfrastructure.hasXRoad).toBe(true);
      expect(profile?.digitalInfrastructure.apiMaturity).toBe('advanced');
    });

    it('should return EU market profile', () => {
      const profile = service.getMarketProfile('EU');

      expect(profile).toBeDefined();
      expect(profile?.languages.length).toBeGreaterThan(5);
      expect(profile?.complianceFrameworks).toContain('GDPR');
    });

    it('should return undefined for unknown region', () => {
      const profile = service.getMarketProfile('Unknown' as MarketRegion);

      expect(profile).toBeUndefined();
    });
  });

  describe('analyzeOpportunity', () => {
    it('should score Baltic region favorably', () => {
      const analysis = service.analyzeOpportunity('Baltic');

      expect(analysis.score).toBeGreaterThan(50);
      expect(['proceed', 'cautious']).toContain(analysis.recommendation);
      expect(analysis.factors.length).toBe(5);
    });

    it('should score Nordic region favorably', () => {
      const analysis = service.analyzeOpportunity('Nordic');

      expect(analysis.score).toBeGreaterThan(50);
      expect(['proceed', 'cautious']).toContain(analysis.recommendation);
    });

    it('should analyze EU with moderate score', () => {
      const analysis = service.analyzeOpportunity('EU');

      expect(analysis.score).toBeGreaterThan(50);
      expect(['proceed', 'cautious']).toContain(analysis.recommendation);
    });

    it('should provide reasoning for recommendation', () => {
      const analysis = service.analyzeOpportunity('Baltic');

      expect(analysis.reasoning).toContain('Baltic');
      expect(analysis.reasoning.length).toBeGreaterThan(20);
    });

    it('should handle unknown region gracefully', () => {
      const analysis = service.analyzeOpportunity('Unknown' as MarketRegion);

      expect(analysis.score).toBe(0);
      expect(analysis.recommendation).toBe('defer');
    });
  });

  describe('createExpansionPlan', () => {
    it('should create expansion plan for Baltic region', async () => {
      const plan = await service.createExpansionPlan('Baltic');

      expect(plan).toBeDefined();
      expect(plan.id).toMatch(/^exp-baltic-/);
      expect(plan.status).toBe('planning');
      expect(plan.targetRegion).toBe('Baltic');
      expect(plan.targetCountries).toContain('EE');
    });

    it('should create expansion plan with custom options', async () => {
      const plan = await service.createExpansionPlan('Nordic', {
        targetPartnerTypes: ['academia'],
        targetCountries: ['FI'],
        timeline: 'aggressive',
      });

      expect(plan.partnerTypes).toContain('academia');
      expect(plan.targetCountries).toEqual(['FI']);
    });

    it('should estimate partners correctly', async () => {
      const plan = await service.createExpansionPlan('Baltic', {
        targetPartnerTypes: ['government'],
      });

      expect(plan.estimatedPartners).toBeGreaterThan(0);
    });

    it('should set timeline based on approach', async () => {
      const aggressivePlan = await service.createExpansionPlan('Baltic', { timeline: 'aggressive' });
      const conservativePlan = await service.createExpansionPlan('Baltic', { timeline: 'conservative' });

      const aggressiveEnd = aggressivePlan.timeline.activationPhase.getTime();
      const conservativeEnd = conservativePlan.timeline.activationPhase.getTime();

      expect(conservativeEnd).toBeGreaterThan(aggressiveEnd);
    });

    it('should throw for unknown region', async () => {
      await expect(service.createExpansionPlan('Unknown' as MarketRegion)).rejects.toThrow(
        'Unknown market region'
      );
    });
  });

  describe('executeExpansionPlan', () => {
    it('should execute expansion plan successfully', async () => {
      const plan = await service.createExpansionPlan('Baltic');

      const result = await service.executeExpansionPlan(plan.id);

      expect(result.success).toBe(true);
      expect(result.partnersDiscovered).toBeGreaterThan(0);
      expect(result.integrationsGenerated).toBeGreaterThan(0);
      expect(result.integrationsActivated).toBeGreaterThan(0);
    });

    it('should call callbacks during execution', async () => {
      const plan = await service.createExpansionPlan('Baltic');

      const onPhaseStart = jest.fn();
      const onProgress = jest.fn();

      await service.executeExpansionPlan(plan.id, {
        onPhaseStart,
        onProgress,
      });

      expect(onPhaseStart).toHaveBeenCalledWith('discovery');
      expect(onPhaseStart).toHaveBeenCalledWith('integration');
      expect(onPhaseStart).toHaveBeenCalledWith('activation');
      expect(onProgress).toHaveBeenCalledWith(33);
      expect(onProgress).toHaveBeenCalledWith(66);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should update plan status to completed', async () => {
      const plan = await service.createExpansionPlan('Baltic');

      await service.executeExpansionPlan(plan.id);

      const updatedPlan = service.getExpansionPlanStatus(plan.id);
      expect(updatedPlan?.status).toBe('completed');
    });

    it('should throw for non-existent plan', async () => {
      await expect(service.executeExpansionPlan('non-existent')).rejects.toThrow(
        'Expansion plan not found'
      );
    });
  });

  describe('getExpansionStrategy', () => {
    it('should return strategy for Baltic region', () => {
      const strategy = service.getExpansionStrategy('Baltic');

      expect(strategy).toBeDefined();
      expect(['discovery', 'pilot', 'rollout', 'scale']).toContain(strategy.phase);
      expect(strategy.targetPartners).toBeGreaterThan(0);
      expect(strategy.timeline.milestones.length).toBeGreaterThan(0);
    });

    it('should estimate resources correctly', () => {
      const strategy = service.getExpansionStrategy('EU');

      expect(strategy.resources.estimated_cost).toBeGreaterThan(0);
      expect(strategy.resources.team_size).toBeGreaterThan(0);
      expect(strategy.resources.infrastructure.length).toBeGreaterThan(0);
    });

    it('should assess risks', () => {
      const strategy = service.getExpansionStrategy('APAC');

      expect(strategy.risks.length).toBeGreaterThan(0);
      strategy.risks.forEach((risk) => {
        expect(risk).toHaveProperty('description');
        expect(risk).toHaveProperty('probability');
        expect(risk).toHaveProperty('impact');
        expect(risk).toHaveProperty('mitigation');
      });
    });
  });

  describe('getSupportedRegions', () => {
    it('should return all supported regions', () => {
      const regions = service.getSupportedRegions();

      expect(regions).toContain('Baltic');
      expect(regions).toContain('Nordic');
      expect(regions).toContain('EU');
      expect(regions).toContain('NA');
      expect(regions).toContain('APAC');
    });
  });

  describe('listExpansionPlans', () => {
    it('should list all created plans', async () => {
      await service.createExpansionPlan('Baltic');
      await service.createExpansionPlan('Nordic');

      const plans = service.listExpansionPlans();

      expect(plans.length).toBe(2);
    });
  });
});
