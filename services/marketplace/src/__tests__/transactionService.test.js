"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const transactionService_js_1 = require("../services/transactionService.js");
const productService_js_1 = require("../services/productService.js");
const consentService_js_1 = require("../services/consentService.js");
const db_js_1 = require("../utils/db.js");
vitest_1.vi.mock('../utils/db.js', () => ({
    db: {
        query: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../services/productService.js', () => ({
    productService: {
        findById: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../services/consentService.js', () => ({
    consentService: {
        verifyForTransaction: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../utils/logger.js', () => ({
    logger: {
        info: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('transactionService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('initiate', () => {
        (0, vitest_1.it)('should create a transaction with correct pricing', async () => {
            const mockProduct = {
                id: 'product-1',
                providerId: 'provider-1',
                basePriceCents: 10000,
                currency: 'USD',
                status: 'published',
            };
            vitest_1.vi.mocked(productService_js_1.productService.findById).mockResolvedValue(mockProduct);
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [], rowCount: 1 });
            const result = await transactionService_js_1.transactionService.initiate({
                buyerId: 'buyer-1',
                productId: 'product-1',
                licenseType: 'single_use',
                usageTerms: { purpose: 'analytics' },
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.buyerId).toBe('buyer-1');
            (0, vitest_1.expect)(result.sellerId).toBe('provider-1');
            (0, vitest_1.expect)(result.agreedPriceCents).toBe(10000);
            (0, vitest_1.expect)(result.platformFeeCents).toBe(1000); // 10%
            (0, vitest_1.expect)(result.sellerPayoutCents).toBe(9000);
            (0, vitest_1.expect)(result.status).toBe('pending_payment');
        });
        (0, vitest_1.it)('should reject if product not found', async () => {
            vitest_1.vi.mocked(productService_js_1.productService.findById).mockResolvedValue(null);
            await (0, vitest_1.expect)(transactionService_js_1.transactionService.initiate({
                buyerId: 'buyer-1',
                productId: 'nonexistent',
                licenseType: 'single_use',
                usageTerms: {},
            })).rejects.toThrow('Product not found');
        });
        (0, vitest_1.it)('should reject if product not published', async () => {
            vitest_1.vi.mocked(productService_js_1.productService.findById).mockResolvedValue({
                id: 'product-1',
                status: 'draft',
            });
            await (0, vitest_1.expect)(transactionService_js_1.transactionService.initiate({
                buyerId: 'buyer-1',
                productId: 'product-1',
                licenseType: 'single_use',
                usageTerms: {},
            })).rejects.toThrow('Product is not available');
        });
    });
    (0, vitest_1.describe)('processPayment', () => {
        (0, vitest_1.it)('should update transaction status on successful payment', async () => {
            const mockTx = {
                id: 'tx-1',
                buyer_id: 'buyer-1',
                seller_id: 'seller-1',
                product_id: 'product-1',
                agreed_price_cents: 10000,
                platform_fee_cents: 1000,
                seller_payout_cents: 9000,
                currency: 'USD',
                license_type: 'single_use',
                usage_terms: {},
                status: 'payment_received',
                consent_verified: false,
                compliance_checked: false,
                created_at: new Date(),
            };
            vitest_1.vi.mocked(db_js_1.db.query)
                .mockResolvedValueOnce({ rows: [mockTx], rowCount: 1 }) // processPayment update
                .mockResolvedValueOnce({ rows: [mockTx], rowCount: 1 }) // findById
                .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // compliance check update
                .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // deliver
            vitest_1.vi.mocked(consentService_js_1.consentService.verifyForTransaction).mockResolvedValue(true);
            vitest_1.vi.mocked(productService_js_1.productService.findById).mockResolvedValue({
                id: 'product-1',
                riskLevel: 'low',
            });
            const result = await transactionService_js_1.transactionService.processPayment('tx-1', {
                paymentMethodId: 'pm_123',
            });
            (0, vitest_1.expect)(result.status).toBe('payment_received');
        });
    });
    (0, vitest_1.describe)('findById', () => {
        (0, vitest_1.it)('should return transaction when found', async () => {
            const mockRow = {
                id: 'tx-1',
                buyer_id: 'buyer-1',
                seller_id: 'seller-1',
                product_id: 'product-1',
                agreed_price_cents: 10000,
                platform_fee_cents: 1000,
                seller_payout_cents: 9000,
                currency: 'USD',
                license_type: 'single_use',
                usage_terms: {},
                status: 'completed',
                consent_verified: true,
                compliance_checked: true,
                created_at: new Date(),
                completed_at: new Date(),
            };
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [mockRow], rowCount: 1 });
            const result = await transactionService_js_1.transactionService.findById('tx-1');
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.id).toBe('tx-1');
            (0, vitest_1.expect)(result?.status).toBe('completed');
        });
        (0, vitest_1.it)('should return null when not found', async () => {
            vitest_1.vi.mocked(db_js_1.db.query).mockResolvedValue({ rows: [], rowCount: 0 });
            const result = await transactionService_js_1.transactionService.findById('nonexistent');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
