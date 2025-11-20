/**
 * Transaction Pool (Mempool) implementation
 */

import { Logger } from 'pino';
import { Transaction } from './types.js';

export class TransactionPool {
  private transactions: Map<string, Transaction> = new Map();
  private logger: Logger;
  private maxPoolSize: number = 10000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Add transaction to pool
   */
  async addTransaction(tx: Transaction): Promise<void> {
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
  async removeTransaction(txId: string): Promise<void> {
    this.transactions.delete(txId);
  }

  /**
   * Get transaction by ID
   */
  getTransaction(txId: string): Transaction | undefined {
    return this.transactions.get(txId);
  }

  /**
   * Get pending transactions up to limit
   */
  async getPendingTransactions(maxSize: number): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
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
  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Clear pool
   */
  clear(): void {
    this.transactions.clear();
  }

  /**
   * Get pool size
   */
  size(): number {
    return this.transactions.size;
  }

  /**
   * Check if transaction exists
   */
  has(txId: string): boolean {
    return this.transactions.has(txId);
  }
}
