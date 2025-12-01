import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionService } from '../services/transactionService.js';
import { productService } from '../services/productService.js';
import { consentService } from '../services/consentService.js';
import { db } from '../utils/db.js';

vi.mock('../utils/db.js', () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock('../services/productService.js', () => ({
  productService: {
    findById: vi.fn(),
  },
}));

vi.mock('../services/consentService.js', () => ({
  consentService: {
    verifyForTransaction: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('transactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiate', () => {
    it('should create a transaction with correct pricing', async () => {
      const mockProduct = {
        id: 'product-1',
        providerId: 'provider-1',
        basePriceCents: 10000,
        currency: 'USD',
        status: 'published',
      };

      vi.mocked(productService.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await transactionService.initiate({
        buyerId: 'buyer-1',
        productId: 'product-1',
        licenseType: 'single_use',
        usageTerms: { purpose: 'analytics' },
      });

      expect(result).toBeDefined();
      expect(result.buyerId).toBe('buyer-1');
      expect(result.sellerId).toBe('provider-1');
      expect(result.agreedPriceCents).toBe(10000);
      expect(result.platformFeeCents).toBe(1000); // 10%
      expect(result.sellerPayoutCents).toBe(9000);
      expect(result.status).toBe('pending_payment');
    });

    it('should reject if product not found', async () => {
      vi.mocked(productService.findById).mockResolvedValue(null);

      await expect(
        transactionService.initiate({
          buyerId: 'buyer-1',
          productId: 'nonexistent',
          licenseType: 'single_use',
          usageTerms: {},
        })
      ).rejects.toThrow('Product not found');
    });

    it('should reject if product not published', async () => {
      vi.mocked(productService.findById).mockResolvedValue({
        id: 'product-1',
        status: 'draft',
      } as any);

      await expect(
        transactionService.initiate({
          buyerId: 'buyer-1',
          productId: 'product-1',
          licenseType: 'single_use',
          usageTerms: {},
        })
      ).rejects.toThrow('Product is not available');
    });
  });

  describe('processPayment', () => {
    it('should update transaction status on successful payment', async () => {
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

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [mockTx], rowCount: 1 }) // processPayment update
        .mockResolvedValueOnce({ rows: [mockTx], rowCount: 1 }) // findById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // compliance check update
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // deliver

      vi.mocked(consentService.verifyForTransaction).mockResolvedValue(true);
      vi.mocked(productService.findById).mockResolvedValue({
        id: 'product-1',
        riskLevel: 'low',
      } as any);

      const result = await transactionService.processPayment('tx-1', {
        paymentMethodId: 'pm_123',
      });

      expect(result.status).toBe('payment_received');
    });
  });

  describe('findById', () => {
    it('should return transaction when found', async () => {
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

      vi.mocked(db.query).mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await transactionService.findById('tx-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('tx-1');
      expect(result?.status).toBe('completed');
    });

    it('should return null when not found', async () => {
      vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await transactionService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
