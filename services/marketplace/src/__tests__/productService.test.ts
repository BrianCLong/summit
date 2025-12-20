import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { productService } from '../services/productService.js';
import { db } from '../utils/db.js';
import { riskScorerService } from '../services/riskScorerService.js';

// Mock dependencies
vi.mock('../utils/db.js', () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock('../services/riskScorerService.js', () => ({
  riskScorerService: {
    assess: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a product with risk assessment', async () => {
      const mockRiskAssessment = {
        overallScore: 35,
        riskLevel: 'medium' as const,
      };

      vi.mocked(riskScorerService.assess).mockResolvedValue({
        id: 'assessment-1',
        productId: 'product-1',
        ...mockRiskAssessment,
        assessedAt: new Date(),
        assessedBy: 'system',
        findings: {},
        recommendations: [],
        automatedChecks: [],
      });

      vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 1 });

      const input = {
        name: 'Test Dataset',
        description: 'A test dataset',
        category: 'financial' as const,
        tags: ['test', 'demo'],
        schemaDefinition: { id: 'string', value: 'number' },
        classification: 'internal' as const,
        piiFields: [],
        regulations: [],
        pricingModel: 'one_time',
        basePriceCents: 10000,
        currency: 'USD',
      };

      const result = await productService.create('provider-1', input);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Dataset');
      expect(result.providerId).toBe('provider-1');
      expect(result.riskScore).toBe(35);
      expect(result.riskLevel).toBe('medium');
      expect(result.status).toBe('draft');

      expect(riskScorerService.assess).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      const mockRow = {
        id: 'product-1',
        provider_id: 'provider-1',
        name: 'Test Dataset',
        category: 'financial',
        tags: ['test'],
        schema_definition: { id: 'string' },
        classification: 'internal',
        pii_fields: [],
        regulations: [],
        pricing_model: 'one_time',
        base_price_cents: 10000,
        currency: 'USD',
        status: 'published',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(db.query).mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await productService.findById('product-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('product-1');
      expect(result?.name).toBe('Test Dataset');
    });

    it('should return null when product not found', async () => {
      vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await productService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search products with filters', async () => {
      const mockRows = [
        {
          id: 'product-1',
          provider_id: 'provider-1',
          name: 'Financial Data',
          category: 'financial',
          tags: [],
          schema_definition: {},
          classification: 'internal',
          pii_fields: [],
          regulations: [],
          pricing_model: 'one_time',
          base_price_cents: 5000,
          currency: 'USD',
          status: 'published',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 });

      const result = await productService.search({
        query: 'financial',
        category: 'financial',
        maxRiskLevel: 'medium',
        limit: 10,
        offset: 0,
      });

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.products[0].name).toBe('Financial Data');
    });

    it('should handle empty search results', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await productService.search({});

      expect(result.products).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('publish', () => {
    it('should publish a draft product', async () => {
      const mockRow = {
        id: 'product-1',
        provider_id: 'provider-1',
        name: 'Test Dataset',
        category: 'financial',
        tags: [],
        schema_definition: {},
        classification: 'internal',
        pii_fields: [],
        regulations: [],
        pricing_model: 'one_time',
        base_price_cents: 5000,
        currency: 'USD',
        status: 'published',
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(db.query).mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await productService.publish('product-1', 'provider-1');

      expect(result).toBeDefined();
      expect(result?.status).toBe('published');
    });

    it('should return null if product not found or wrong provider', async () => {
      vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await productService.publish('product-1', 'wrong-provider');

      expect(result).toBeNull();
    });
  });
});
