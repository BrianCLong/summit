"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionService = void 0;
const uuid_1 = require("uuid");
const db_js_1 = require("../utils/db.js");
const logger_js_1 = require("../utils/logger.js");
const productService_js_1 = require("./productService.js");
const consentService_js_1 = require("./consentService.js");
const PLATFORM_FEE_PERCENT = 10;
exports.transactionService = {
    async initiate(params) {
        const product = await productService_js_1.productService.findById(params.productId);
        if (!product) {
            throw new Error('Product not found');
        }
        if (product.status !== 'published') {
            throw new Error('Product is not available for purchase');
        }
        // Calculate pricing
        const agreedPriceCents = product.basePriceCents;
        const platformFeeCents = Math.round(agreedPriceCents * (PLATFORM_FEE_PERCENT / 100));
        const sellerPayoutCents = agreedPriceCents - platformFeeCents;
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const transaction = {
            id,
            buyerId: params.buyerId,
            sellerId: product.providerId,
            productId: params.productId,
            agreedPriceCents,
            platformFeeCents,
            sellerPayoutCents,
            currency: product.currency,
            licenseType: params.licenseType,
            usageTerms: params.usageTerms,
            durationDays: params.durationDays,
            status: 'pending_payment',
            consentVerified: false,
            complianceChecked: false,
            createdAt: now,
        };
        await db_js_1.db.query(`INSERT INTO transactions (
        id, buyer_id, seller_id, product_id,
        agreed_price_cents, platform_fee_cents, seller_payout_cents,
        currency, license_type, usage_terms, duration_days,
        status, consent_verified, compliance_checked, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
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
        ]);
        logger_js_1.logger.info('Transaction initiated', {
            transactionId: id,
            buyerId: params.buyerId,
            productId: params.productId,
        });
        return transaction;
    },
    async processPayment(transactionId, _paymentDetails) {
        // In production, integrate with Stripe/PayPal
        // For now, simulate payment success
        const result = await db_js_1.db.query(`UPDATE transactions
       SET status = 'payment_received', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_payment'
       RETURNING *`, [transactionId]);
        if (!result.rows[0]) {
            throw new Error('Transaction not found or invalid status');
        }
        logger_js_1.logger.info('Payment processed', { transactionId });
        // Trigger compliance check
        await this.runComplianceCheck(transactionId);
        return mapRowToTransaction(result.rows[0]);
    },
    async runComplianceCheck(transactionId) {
        const tx = await this.findById(transactionId);
        if (!tx) {
            return;
        }
        // Update status
        await db_js_1.db.query("UPDATE transactions SET status = 'compliance_check' WHERE id = $1", [transactionId]);
        // Verify consent
        const hasConsent = await consentService_js_1.consentService.verifyForTransaction(tx);
        // Check product risk level
        const product = await productService_js_1.productService.findById(tx.productId);
        const compliancePassed = hasConsent &&
            product &&
            (product.riskLevel === 'low' || product.riskLevel === 'medium');
        await db_js_1.db.query(`UPDATE transactions
       SET consent_verified = $1, compliance_checked = true,
           status = $2
       WHERE id = $3`, [
            hasConsent,
            compliancePassed ? 'preparing_data' : 'compliance_check',
            transactionId,
        ]);
        if (compliancePassed) {
            // Auto-complete for low-risk transactions
            await this.deliver(transactionId);
        }
        logger_js_1.logger.info('Compliance check completed', {
            transactionId,
            hasConsent,
            compliancePassed,
        });
    },
    async deliver(transactionId) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7-day download window
        const result = await db_js_1.db.query(`UPDATE transactions
       SET status = 'delivered', completed_at = NOW(), expires_at = $1
       WHERE id = $2
       RETURNING *`, [expiresAt, transactionId]);
        if (!result.rows[0]) {
            throw new Error('Transaction not found');
        }
        logger_js_1.logger.info('Transaction delivered', { transactionId });
        return mapRowToTransaction(result.rows[0]);
    },
    async findById(id) {
        const result = await db_js_1.db.query('SELECT * FROM transactions WHERE id = $1', [
            id,
        ]);
        return result.rows[0] ? mapRowToTransaction(result.rows[0]) : null;
    },
    async getByBuyer(buyerId, status) {
        let query = 'SELECT * FROM transactions WHERE buyer_id = $1';
        const params = [buyerId];
        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const result = await db_js_1.db.query(query, params);
        return result.rows.map(mapRowToTransaction);
    },
    async getBySeller(sellerId, status) {
        let query = 'SELECT * FROM transactions WHERE seller_id = $1';
        const params = [sellerId];
        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const result = await db_js_1.db.query(query, params);
        return result.rows.map(mapRowToTransaction);
    },
};
function mapRowToTransaction(row) {
    return {
        id: row.id,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        productId: row.product_id,
        agreedPriceCents: row.agreed_price_cents,
        platformFeeCents: row.platform_fee_cents,
        sellerPayoutCents: row.seller_payout_cents,
        currency: row.currency,
        licenseType: row.license_type,
        usageTerms: row.usage_terms,
        durationDays: row.duration_days,
        status: row.status,
        consentVerified: row.consent_verified,
        complianceChecked: row.compliance_checked,
        contractHash: row.contract_hash,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        expiresAt: row.expires_at,
    };
}
