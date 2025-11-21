import { describe, it, expect, vi, beforeEach } from 'vitest';
import { riskScorerService } from '../services/riskScorerService.js';
import { db } from '../utils/db.js';
import type { DataProduct } from '../models/types.js';

vi.mock('../utils/db.js', () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('riskScorerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 1 });
  });

  describe('assess', () => {
    it('should return low risk for public data without PII', async () => {
      const product: DataProduct = {
        id: 'product-1',
        providerId: 'provider-1',
        name: 'Public Weather Data',
        category: 'environmental',
        tags: ['weather'],
        schemaDefinition: {
          date: 'string',
          temperature: 'number',
          humidity: 'number',
        },
        classification: 'public',
        piiFields: [],
        regulations: [],
        pricingModel: 'free',
        basePriceCents: 0,
        currency: 'USD',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await riskScorerService.assess(product);

      expect(result.overallScore).toBeLessThanOrEqual(25);
      expect(result.riskLevel).toBe('low');
      expect(result.piiScore).toBe(0);
    });

    it('should return high risk for data with PII fields', async () => {
      const product: DataProduct = {
        id: 'product-2',
        providerId: 'provider-1',
        name: 'Customer Data',
        category: 'demographic',
        tags: ['customers'],
        schemaDefinition: {
          email: 'string',
          phone_number: 'string',
          ssn: 'string',
          address: 'string',
        },
        classification: 'confidential',
        piiFields: ['email', 'phone_number', 'ssn', 'address'],
        regulations: ['GDPR', 'CCPA'],
        pricingModel: 'one_time',
        basePriceCents: 50000,
        currency: 'USD',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await riskScorerService.assess(product);

      expect(result.overallScore).toBeGreaterThan(50);
      expect(['high', 'critical']).toContain(result.riskLevel);
      expect(result.piiScore).toBeGreaterThan(0);
    });

    it('should detect undocumented PII in schema', async () => {
      const product: DataProduct = {
        id: 'product-3',
        providerId: 'provider-1',
        name: 'User Data',
        category: 'behavioral',
        tags: [],
        schemaDefinition: {
          user_email: 'string',
          credit_card: 'string',
        },
        classification: 'internal',
        piiFields: [], // Not documented
        regulations: [],
        pricingModel: 'one_time',
        basePriceCents: 10000,
        currency: 'USD',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await riskScorerService.assess(product);

      // Should penalize undocumented PII
      expect(result.piiScore).toBeGreaterThan(0);
      expect(result.recommendations).toContain(
        'Document all PII fields in the product metadata'
      );
    });

    it('should apply regulatory weight correctly', async () => {
      const hipaaProduct: DataProduct = {
        id: 'product-4',
        providerId: 'provider-1',
        name: 'Medical Records',
        category: 'healthcare',
        tags: ['health'],
        schemaDefinition: {
          patient_id: 'string',
          diagnosis: 'string',
        },
        classification: 'restricted',
        piiFields: ['patient_id'],
        regulations: ['HIPAA'],
        pricingModel: 'enterprise',
        basePriceCents: 100000,
        currency: 'USD',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await riskScorerService.assess(hipaaProduct);

      expect(result.regulatoryScore).toBeGreaterThan(30);
    });

    it('should run all automated checks', async () => {
      const product: DataProduct = {
        id: 'product-5',
        providerId: 'provider-1',
        name: 'Test Data',
        category: 'other',
        tags: [],
        schemaDefinition: { id: 'string' },
        classification: 'public',
        piiFields: [],
        regulations: [],
        pricingModel: 'one_time',
        basePriceCents: 1000,
        currency: 'USD',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await riskScorerService.assess(product);

      expect(result.automatedChecks).toBeInstanceOf(Array);
      expect(result.automatedChecks.length).toBeGreaterThan(0);

      const checkNames = result.automatedChecks.map((c) => c.name);
      expect(checkNames).toContain('schema_defined');
      expect(checkNames).toContain('classification_set');
      expect(checkNames).toContain('pricing_valid');
    });
  });
});
