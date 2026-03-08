"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReconciliation = void 0;
const crypto_1 = __importDefault(require("crypto"));
class PaymentReconciliation {
    transactions = new Map();
    reports = new Map();
    async recordTransaction(params) {
        const id = `txn_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 24)}`;
        const transaction = {
            id,
            externalId: params.externalId,
            type: params.type,
            amount: params.amount,
            currency: params.currency.toLowerCase(),
            status: 'pending',
            createdAt: new Date(),
        };
        this.transactions.set(id, transaction);
        return transaction;
    }
    async reconcile(transactionId, externalData) {
        const txn = this.transactions.get(transactionId);
        if (!txn)
            throw new Error('transaction_not_found');
        if (txn.amount !== externalData.amount) {
            throw new Error('amount_mismatch');
        }
        txn.status = 'completed';
        txn.reconciledAt = new Date();
        return txn;
    }
    async generateReport(periodStart, periodEnd) {
        const periodTxns = Array.from(this.transactions.values()).filter((t) => t.createdAt >= periodStart && t.createdAt <= periodEnd);
        const reconciled = periodTxns.filter((t) => t.reconciledAt);
        const discrepancies = periodTxns
            .filter((t) => !t.reconciledAt && t.status !== 'completed')
            .map((t) => ({
            transactionId: t.id,
            type: 'missing_external',
            expectedAmount: t.amount,
            details: `Transaction ${t.id} not reconciled`,
        }));
        const report = {
            id: `rpt_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 24)}`,
            periodStart,
            periodEnd,
            totalTransactions: periodTxns.length,
            reconciledCount: reconciled.length,
            discrepancies,
            generatedAt: new Date(),
        };
        this.reports.set(report.id, report);
        return report;
    }
    async getTransaction(transactionId) {
        return this.transactions.get(transactionId) || null;
    }
    async getReport(reportId) {
        return this.reports.get(reportId) || null;
    }
    async listPendingReconciliation() {
        return Array.from(this.transactions.values()).filter((t) => !t.reconciledAt && t.status === 'pending');
    }
}
exports.PaymentReconciliation = PaymentReconciliation;
exports.default = PaymentReconciliation;
