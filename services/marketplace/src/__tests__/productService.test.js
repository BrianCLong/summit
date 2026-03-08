"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const productService_js_1 = require("../services/productService.js");
const db_js_1 = require("../utils/db.js");
const riskScorerService_js_1 = require("../services/riskScorerService.js");
// Mock dependencies
vitest_1.vi.mock('../utils/db.js', () => ({
    db: {
        query: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../services/riskScorerService.js', () => ({
    riskScorerService: {
        assess: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../utils/logger.js', () => ({
    logger: {
        info: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('productService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.resetAllMocks();
    });
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('should create a product with risk assessment', async () => {
            const mockRiskAssessment = {
                overallScore: 35,
                riskLevel: 'medium',
            };
            vitest_1.vi.mocked(riskScorerService_js_1.riskScorerService.assess).mockResolvedValue({
                id: 'assessment-1',
                productId: 'product-1',
                ...mockRiskAssessment,
                assessedAt: new Date(),
                assessedBy: 'system',
                findings: {},
                recommendations: [],
                automatedChecks: [],
            });
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [], rowCount: 1 });
            const input = {
                name: 'Test Dataset',
                description: 'A test dataset',
                category: 'financial',
                tags: ['test', 'demo'],
                schemaDefinition: { id: 'string', value: 'number' },
                classification: 'internal',
                piiFields: [],
                regulations: [],
                pricingModel: 'one_time',
                basePriceCents: 10000,
                currency: 'USD',
            };
            const result = await productService_js_1.productService.create('provider-1', input);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.name).toBe('Test Dataset');
            (0, vitest_1.expect)(result.providerId).toBe('provider-1');
            (0, vitest_1.expect)(result.riskScore).toBe(35);
            (0, vitest_1.expect)(result.riskLevel).toBe('medium');
            (0, vitest_1.expect)(result.status).toBe('draft');
            (0, vitest_1.expect)(riskScorerService_js_1.riskScorerService.assess).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(db_js_1.db.query).toHaveBeenCalledTimes(1);
        });
    });
    (0, vitest_1.describe)('findById', () => {
        (0, vitest_1.it)('should return product when found', async () => {
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
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [mockRow], rowCount: 1 });
            const result = await productService_js_1.productService.findById('product-1');
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.id).toBe('product-1');
            (0, vitest_1.expect)(result?.name).toBe('Test Dataset');
        });
        (0, vitest_1.it)('should return null when product not found', async () => {
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [], rowCount: 0 });
            const result = await productService_js_1.productService.findById('nonexistent');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('search', () => {
        (0, vitest_1.it)('should search products with filters', async () => {
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
            vitest_1.vi.mocked(db_js_1.db.query)
                .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 });
            const result = await productService_js_1.productService.search({
                query: 'financial',
                category: 'financial',
                maxRiskLevel: 'medium',
                limit: 10,
                offset: 0,
            });
            (0, vitest_1.expect)(result.products).toHaveLength(1);
            (0, vitest_1.expect)(result.total).toBe(1);
            (0, vitest_1.expect)(result.products[0].name).toBe('Financial Data');
        });
        (0, vitest_1.it)('should handle empty search results', async () => {
            vitest_1.vi.mocked(db_js_1.db.query)
                .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });
            const result = await productService_js_1.productService.search({});
            (0, vitest_1.expect)(result.products).toHaveLength(0);
            (0, vitest_1.expect)(result.total).toBe(0);
        });
    });
    (0, vitest_1.describe)('publish', () => {
        (0, vitest_1.it)('should publish a draft product', async () => {
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
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [mockRow], rowCount: 1 });
            const result = await productService_js_1.productService.publish('product-1', 'provider-1');
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.status).toBe('published');
        });
        (0, vitest_1.it)('should return null if product not found or wrong provider', async () => {
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [], rowCount: 0 });
            const result = await productService_js_1.productService.publish('product-1', 'wrong-provider');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
