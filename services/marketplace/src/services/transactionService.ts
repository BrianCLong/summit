import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { productService } from './productService.js';
import { consentService } from './consentService.js';
import type { Transaction } from '../models/types.js';

const PLATFORM_FEE_PERCENT = 10;

export const transactionService = {
  async initiate(params: {
    buyerId: string;
    productId: string;
    licenseType: string;
    usageTerms: Record<string, unknown>;
    durationDays?: number;
  }): Promise<Transaction> {
    const product = await productService.findById(params.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status !== 'published') {
      throw new Error('Product is not available for purchase');
    }

    // Calculate pricing
    const agreedPriceCents = product.basePriceCents;
    const platformFeeCents = Math.round(
      agreedPriceCents * (PLATFORM_FEE_PERCENT / 100)
    );
    const sellerPayoutCents = agreedPriceCents - platformFeeCents;

    const id = uuidv4();
    const now = new Date();

    const transaction: Transaction = {
      id,
      buyerId: params.buyerId,
      sellerId: product.providerId,
      productId: params.productId,
      agreedPriceCents,
      platformFeeCents,
      sellerPayoutCents,
      currency: product.currency,
      licenseType: params.licenseType as Transaction['licenseType'],
      usageTerms: params.usageTerms,
      durationDays: params.durationDays,
      status: 'pending_payment',
      consentVerified: false,
      complianceChecked: false,
      createdAt: now,
    };

    await db.query(
      `INSERT INTO transactions (
        id, buyer_id, seller_id, product_id,
        agreed_price_cents, platform_fee_cents, seller_payout_cents,
        currency, license_type, usage_terms, duration_days,
        status, consent_verified, compliance_checked, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        transaction.id,
        transaction.buyerId,
        transaction.sellerId,
        transaction.productId,
        transaction.agreedPriceCents,
        transaction.platformFeeCents,
        transaction.sellerPayoutCents,
        transaction.currency,
        transaction.licenseType,
        JSON.stringify(transaction.usageTerms),
        transaction.durationDays,
        transaction.status,
        transaction.consentVerified,
        transaction.complianceChecked,
        transaction.createdAt,
      ]
    );

    logger.info('Transaction initiated', {
      transactionId: id,
      buyerId: params.buyerId,
      productId: params.productId,
    });

    return transaction;
  },

  async processPayment(
    transactionId: string,
    _paymentDetails: Record<string, unknown>
  ): Promise<Transaction> {
    // In production, integrate with Stripe/PayPal
    // For now, simulate payment success

    const result = await db.query(
      `UPDATE transactions
       SET status = 'payment_received', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_payment'
       RETURNING *`,
      [transactionId]
    );

    if (!result.rows[0]) {
      throw new Error('Transaction not found or invalid status');
    }

    logger.info('Payment processed', { transactionId });

    // Trigger compliance check
    await this.runComplianceCheck(transactionId);

    return mapRowToTransaction(result.rows[0]);
  },

  async runComplianceCheck(transactionId: string): Promise<void> {
    const tx = await this.findById(transactionId);
    if (!tx) return;

    // Update status
    await db.query(
      "UPDATE transactions SET status = 'compliance_check' WHERE id = $1",
      [transactionId]
    );

    // Verify consent
    const hasConsent = await consentService.verifyForTransaction(tx);

    // Check product risk level
    const product = await productService.findById(tx.productId);
    const compliancePassed =
      hasConsent &&
      product &&
      (product.riskLevel === 'low' || product.riskLevel === 'medium');

    await db.query(
      `UPDATE transactions
       SET consent_verified = $1, compliance_checked = true,
           status = $2
       WHERE id = $3`,
      [
        hasConsent,
        compliancePassed ? 'preparing_data' : 'compliance_check',
        transactionId,
      ]
    );

    if (compliancePassed) {
      // Auto-complete for low-risk transactions
      await this.deliver(transactionId);
    }

    logger.info('Compliance check completed', {
      transactionId,
      hasConsent,
      compliancePassed,
    });
  },

  async deliver(transactionId: string): Promise<Transaction> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day download window

    const result = await db.query(
      `UPDATE transactions
       SET status = 'delivered', completed_at = NOW(), expires_at = $1
       WHERE id = $2
       RETURNING *`,
      [expiresAt, transactionId]
    );

    if (!result.rows[0]) {
      throw new Error('Transaction not found');
    }

    logger.info('Transaction delivered', { transactionId });
    return mapRowToTransaction(result.rows[0]);
  },

  async findById(id: string): Promise<Transaction | null> {
    const result = await db.query('SELECT * FROM transactions WHERE id = $1', [
      id,
    ]);
    return result.rows[0] ? mapRowToTransaction(result.rows[0]) : null;
  },

  async getByBuyer(
    buyerId: string,
    status?: string
  ): Promise<Transaction[]> {
    let query = 'SELECT * FROM transactions WHERE buyer_id = $1';
    const params: unknown[] = [buyerId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(mapRowToTransaction);
  },

  async getBySeller(
    sellerId: string,
    status?: string
  ): Promise<Transaction[]> {
    let query = 'SELECT * FROM transactions WHERE seller_id = $1';
    const params: unknown[] = [sellerId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(mapRowToTransaction);
  },
};

function mapRowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    productId: row.product_id as string,
    agreedPriceCents: row.agreed_price_cents as number,
    platformFeeCents: row.platform_fee_cents as number,
    sellerPayoutCents: row.seller_payout_cents as number,
    currency: row.currency as string,
    licenseType: row.license_type as Transaction['licenseType'],
    usageTerms: row.usage_terms as Record<string, unknown>,
    durationDays: row.duration_days as number | undefined,
    status: row.status as Transaction['status'],
    consentVerified: row.consent_verified as boolean,
    complianceChecked: row.compliance_checked as boolean,
    contractHash: row.contract_hash as string | undefined,
    createdAt: row.created_at as Date,
    completedAt: row.completed_at as Date | undefined,
    expiresAt: row.expires_at as Date | undefined,
  };
}
