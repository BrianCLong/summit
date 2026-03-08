"use strict";
/**
 * Transaction Pool (Mempool) implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionPool = void 0;
class TransactionPool {
    transactions = new Map();
    logger;
    maxPoolSize = 10000;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Add transaction to pool
     */
    async addTransaction(tx) {
        if (this.transactions.has(tx.id)) {
            throw new Error('Transaction already in pool');
        }
        if (this.transactions.size >= this.maxPoolSize) {
            throw new Error('Transaction pool is full');
        }
        this.transactions.set(tx.id, tx);
        this.logger.debug({ txId: tx.id }, 'Transaction added to pool');
    }
    /**
     * Remove transaction from pool
     */
    async removeTransaction(txId) {
        this.transactions.delete(txId);
    }
    /**
     * Get transaction by ID
     */
    getTransaction(txId) {
        return this.transactions.get(txId);
    }
    /**
     * Get pending transactions up to limit
     */
    async getPendingTransactions(maxSize) {
        const transactions = [];
        let totalSize = 0;
        for (const tx of this.transactions.values()) {
            const txSize = JSON.stringify(tx).length;
            if (totalSize + txSize > maxSize) {
                break;
            }
            transactions.push(tx);
            totalSize += txSize;
        }
        // Sort by timestamp (FIFO)
        return transactions.sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Get all transactions
     */
    getAllTransactions() {
        return Array.from(this.transactions.values());
    }
    /**
     * Clear pool
     */
    clear() {
        this.transactions.clear();
    }
    /**
     * Get pool size
     */
    size() {
        return this.transactions.size;
    }
    /**
     * Check if transaction exists
     */
    has(txId) {
        return this.transactions.has(txId);
    }
}
exports.TransactionPool = TransactionPool;
