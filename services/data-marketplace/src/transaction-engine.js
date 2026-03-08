"use strict";
/**
 * Transaction Engine - Handles marketplace transactions and settlements
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionEngine = void 0;
const crypto_1 = __importDefault(require("crypto"));
class TransactionEngine {
    transactions = new Map();
    userTransactions = new Map();
    licenses = new Map();
    async recordTransaction(data) {
        const txId = crypto_1.default.randomUUID();
        const accessToken = crypto_1.default.randomBytes(32).toString('hex');
        const transaction = {
            id: txId,
            listingId: data.purchase.listingId,
            buyerId: data.purchase.buyerId,
            sellerId: '', // Populated from listing
            amount: 0, // Populated from listing
            currency: 'USD',
            status: data.blockchainTx.status === 'success' ? 'completed' : 'pending',
            blockchainTxHash: data.blockchainTx.txHash,
            accessToken,
            createdAt: new Date(),
            completedAt: data.blockchainTx.status === 'success' ? new Date() : undefined,
        };
        this.transactions.set(txId, transaction);
        // Index by user
        this.indexUserTransaction(data.purchase.buyerId, txId, 'buy');
        // Create license
        this.licenses.set(txId, {
            transactionId: txId,
            valid: true,
            usageRights: ['read', 'analyze'],
            usageCount: 0,
        });
        return { ...transaction, accessToken };
    }
    async getTransactions(userId, role) {
        const userTxs = this.userTransactions.get(userId);
        if (!userTxs) {
            return [];
        }
        const txIds = role === 'buyer' ? userTxs.buys :
            role === 'seller' ? userTxs.sells :
                [...userTxs.buys, ...userTxs.sells];
        return txIds
            .map((id) => this.transactions.get(id))
            .filter((t) => t !== undefined);
    }
    async verifyLicense(transactionId) {
        return this.licenses.get(transactionId);
    }
    async getRevenueAnalytics(sellerId, period) {
        const txs = await this.getTransactions(sellerId, 'seller');
        const completedTxs = txs.filter((t) => t.status === 'completed');
        const totalRevenue = completedTxs.reduce((sum, t) => sum + t.amount, 0);
        // Group by period
        const breakdown = new Map();
        for (const tx of completedTxs) {
            const key = tx.createdAt.toISOString().substring(0, 7); // YYYY-MM
            const existing = breakdown.get(key) || { revenue: 0, count: 0 };
            existing.revenue += tx.amount;
            existing.count++;
            breakdown.set(key, existing);
        }
        return {
            totalRevenue,
            transactionCount: completedTxs.length,
            periodBreakdown: Array.from(breakdown.entries()).map(([period, data]) => ({
                period,
                ...data,
            })),
        };
    }
    async processRefund(transactionId) {
        const tx = this.transactions.get(transactionId);
        if (!tx || tx.status !== 'completed') {
            return false;
        }
        tx.status = 'refunded';
        const license = this.licenses.get(transactionId);
        if (license) {
            license.valid = false;
        }
        return true;
    }
    indexUserTransaction(userId, txId, type) {
        const existing = this.userTransactions.get(userId) || { buys: [], sells: [] };
        if (type === 'buy') {
            existing.buys.push(txId);
        }
        else {
            existing.sells.push(txId);
        }
        this.userTransactions.set(userId, existing);
    }
}
exports.TransactionEngine = TransactionEngine;
