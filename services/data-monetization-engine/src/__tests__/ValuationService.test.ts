import { describe, it, expect, beforeEach } from '@jest/globals';
import { ValuationService } from '../services/ValuationService.js';
import { DataAsset } from '@intelgraph/data-monetization-types';

describe('ValuationService', () => {
  let service: ValuationService;
  let testAsset: DataAsset;

  beforeEach(() => {
    service = new ValuationService();
    testAsset = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Transaction Data',
      description: 'Financial transaction records',
      category: 'TRANSACTION',
      qualityLevel: 'CURATED',
      sensitivityLevel: 'CONFIDENTIAL',
      sourceSystem: 'Payment Gateway',
      schema: {
        transaction_id: 'uuid',
        amount: 'decimal',
        timestamp: 'datetime',
        merchant: 'string',
      },
      metadata: {
        recordCount: 5000000,
        sizeBytes: 2500000000,
        lastUpdated: new Date().toISOString(),
      },
      tags: ['financial', 'transactions'],
      owner: 'data-team',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  describe('valuateAsset', () => {
    it('should return a valuation with all required fields', async () => {
      const valuation = await service.valuateAsset(testAsset);

      expect(valuation.id).toBeDefined();
      expect(valuation.assetId).toBe(testAsset.id);
      expect(valuation.estimatedValueCents).toBeGreaterThan(0);
      expect(valuation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(valuation.confidenceScore).toBeLessThanOrEqual(1);
      expect(valuation.methodology).toBe('AI_MODEL');
      expect(valuation.factors).toBeDefined();
      expect(valuation.factors.length).toBe(7);
      expect(valuation.recommendation).toBeDefined();
    });

    it('should value high-quality data higher than raw data', async () => {
      const curatedAsset = { ...testAsset, qualityLevel: 'CURATED' as const };
      const rawAsset = { ...testAsset, qualityLevel: 'RAW' as const };

      const curatedValuation = await service.valuateAsset(curatedAsset);
      const rawValuation = await service.valuateAsset(rawAsset);

      expect(curatedValuation.estimatedValueCents).toBeGreaterThan(
        rawValuation.estimatedValueCents,
      );
    });

    it('should value transaction data higher than unstructured data', async () => {
      const transactionAsset = { ...testAsset, category: 'TRANSACTION' as const };
      const unstructuredAsset = { ...testAsset, category: 'UNSTRUCTURED' as const };

      const transactionValuation = await service.valuateAsset(transactionAsset);
      const unstructuredValuation = await service.valuateAsset(unstructuredAsset);

      expect(transactionValuation.estimatedValueCents).toBeGreaterThan(
        unstructuredValuation.estimatedValueCents,
      );
    });

    it('should include all valuation factors', async () => {
      const valuation = await service.valuateAsset(testAsset);

      const factorNames = valuation.factors.map((f) => f.name);
      expect(factorNames).toContain('uniqueness');
      expect(factorNames).toContain('freshness');
      expect(factorNames).toContain('completeness');
      expect(factorNames).toContain('accuracy');
      expect(factorNames).toContain('volume');
      expect(factorNames).toContain('demand');
      expect(factorNames).toContain('compliance');
    });

    it('should provide pricing recommendation', async () => {
      const valuation = await service.valuateAsset(testAsset);

      expect(valuation.recommendation.suggestedPriceCents).toBeGreaterThan(0);
      expect(valuation.recommendation.priceRangeLow).toBeLessThan(
        valuation.recommendation.suggestedPriceCents,
      );
      expect(valuation.recommendation.priceRangeHigh).toBeGreaterThan(
        valuation.recommendation.suggestedPriceCents,
      );
      expect(valuation.recommendation.pricingModel).toBeDefined();
      expect(valuation.recommendation.rationale).toBeDefined();
    });

    it('should recommend subscription pricing for frequently refreshed data', async () => {
      const refreshedAsset = {
        ...testAsset,
        metadata: {
          ...testAsset.metadata,
          refreshFrequency: 'hourly',
        },
      };

      const valuation = await service.valuateAsset(refreshedAsset);

      expect(valuation.recommendation.pricingModel).toBe('SUBSCRIPTION');
    });

    it('should have higher confidence for consistent factor scores', async () => {
      const consistentAsset: DataAsset = {
        ...testAsset,
        qualityLevel: 'CERTIFIED',
        category: 'BEHAVIORAL',
        metadata: {
          recordCount: 10000000,
          sizeBytes: 5000000000,
          lastUpdated: new Date().toISOString(),
        },
      };

      const valuation = await service.valuateAsset(consistentAsset);

      expect(valuation.confidenceScore).toBeGreaterThan(0.5);
    });
  });
});
