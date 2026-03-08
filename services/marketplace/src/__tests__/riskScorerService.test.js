"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const riskScorerService_js_1 = require("../services/riskScorerService.js");
const db_js_1 = require("../utils/db.js");
vitest_1.vi.mock('../utils/db.js', () => ({
    db: {
        query: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../utils/logger.js', () => ({
    logger: {
        info: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('riskScorerService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [], rowCount: 1 });
    });
    (0, vitest_1.describe)('assess', () => {
        (0, vitest_1.it)('should return low risk for public data without PII', async () => {
            const product = {
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
            const result = await riskScorerService_js_1.riskScorerService.assess(product);
            (0, vitest_1.expect)(result.overallScore).toBeLessThanOrEqual(25);
            (0, vitest_1.expect)(result.riskLevel).toBe('low');
            (0, vitest_1.expect)(result.piiScore).toBe(0);
        });
        (0, vitest_1.it)('should return high risk for data with PII fields', async () => {
            const product = {
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
            const result = await riskScorerService_js_1.riskScorerService.assess(product);
            (0, vitest_1.expect)(result.overallScore).toBeGreaterThan(50);
            (0, vitest_1.expect)(['high', 'critical']).toContain(result.riskLevel);
            (0, vitest_1.expect)(result.piiScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should detect undocumented PII in schema', async () => {
            const product = {
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
            const result = await riskScorerService_js_1.riskScorerService.assess(product);
            // Should penalize undocumented PII
            (0, vitest_1.expect)(result.piiScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.recommendations).toContain('Document all PII fields in the product metadata');
        });
        (0, vitest_1.it)('should apply regulatory weight correctly', async () => {
            const hipaaProduct = {
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
            const result = await riskScorerService_js_1.riskScorerService.assess(hipaaProduct);
            (0, vitest_1.expect)(result.regulatoryScore).toBeGreaterThan(30);
        });
        (0, vitest_1.it)('should run all automated checks', async () => {
            const product = {
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
            const result = await riskScorerService_js_1.riskScorerService.assess(product);
            (0, vitest_1.expect)(result.automatedChecks).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.automatedChecks.length).toBeGreaterThan(0);
            const checkNames = result.automatedChecks.map((c) => c.name);
            (0, vitest_1.expect)(checkNames).toContain('schema_defined');
            (0, vitest_1.expect)(checkNames).toContain('classification_set');
            (0, vitest_1.expect)(checkNames).toContain('pricing_valid');
        });
    });
});
