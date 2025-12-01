/**
 * Transaction Engine - Handles marketplace transactions and settlements
 */

import crypto from 'crypto';
import type { Purchase } from './index.js';

interface BlockchainTx {
  txHash: string;
  blockNumber: number;
  status: string;
}

interface Transaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  blockchainTxHash: string;
  accessToken: string;
  createdAt: Date;
  completedAt?: Date;
}

interface License {
  transactionId: string;
  valid: boolean;
  usageRights: string[];
  expiresAt?: Date;
  usageCount?: number;
}

interface RevenueAnalytics {
  totalRevenue: number;
  transactionCount: number;
  periodBreakdown: { period: string; revenue: number; count: number }[];
}

export class TransactionEngine {
  private transactions: Map<string, Transaction> = new Map();
  private userTransactions: Map<string, { buys: string[]; sells: string[] }> = new Map();
  private licenses: Map<string, License> = new Map();

  async recordTransaction(data: {
    purchase: Purchase;
    blockchainTx: BlockchainTx;
  }): Promise<Transaction & { accessToken: string }> {
    const txId = crypto.randomUUID();
    const accessToken = crypto.randomBytes(32).toString('hex');

    const transaction: Transaction = {
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

  async getTransactions(
    userId: string,
    role?: 'buyer' | 'seller',
  ): Promise<Transaction[]> {
    const userTxs = this.userTransactions.get(userId);
    if (!userTxs) return [];

    const txIds = role === 'buyer' ? userTxs.buys :
                  role === 'seller' ? userTxs.sells :
                  [...userTxs.buys, ...userTxs.sells];

    return txIds
      .map((id) => this.transactions.get(id))
      .filter((t): t is Transaction => t !== undefined);
  }

  async verifyLicense(transactionId: string): Promise<License | undefined> {
    return this.licenses.get(transactionId);
  }

  async getRevenueAnalytics(
    sellerId: string,
    period?: string,
  ): Promise<RevenueAnalytics> {
    const txs = await this.getTransactions(sellerId, 'seller');
    const completedTxs = txs.filter((t) => t.status === 'completed');

    const totalRevenue = completedTxs.reduce((sum, t) => sum + t.amount, 0);

    // Group by period
    const breakdown = new Map<string, { revenue: number; count: number }>();
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

  async processRefund(transactionId: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx || tx.status !== 'completed') return false;

    tx.status = 'refunded';
    const license = this.licenses.get(transactionId);
    if (license) {
      license.valid = false;
    }

    return true;
  }

  private indexUserTransaction(
    userId: string,
    txId: string,
    type: 'buy' | 'sell',
  ): void {
    const existing = this.userTransactions.get(userId) || { buys: [], sells: [] };
    if (type === 'buy') {
      existing.buys.push(txId);
    } else {
      existing.sells.push(txId);
    }
    this.userTransactions.set(userId, existing);
  }
}
