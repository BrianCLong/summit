/**
 * Revenue Share Service
 *
 * Manages 70/30 revenue sharing between plugin developers and the platform.
 * Handles commission calculations, developer earnings, and platform fees.
 *
 * SOC 2 Controls: CC6.7 (Financial Processing), CC7.1 (Billing Operations)
 *
 * @module marketplace/RevenueShareService
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type PricingModel = 'free' | 'one_time' | 'subscription' | 'usage_based';
export type TransactionType = 'purchase' | 'subscription' | 'usage' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface RevenueShareConfig {
  /** Developer share percentage (default: 70%) */
  developerSharePercent: number;
  /** Platform share percentage (default: 30%) */
  platformSharePercent: number;
  /** Minimum payout threshold in cents */
  minPayoutThresholdCents: number;
  /** Payout frequency in days */
  payoutFrequencyDays: number;
  /** Enable volume-based tier adjustments */
  enableVolumeTiers: boolean;
  /** Volume tier thresholds and rates */
  volumeTiers: VolumeTier[];
}

export interface VolumeTier {
  minRevenueCents: number;
  maxRevenueCents: number | null;
  developerSharePercent: number;
}

export interface Transaction {
  id: string;
  pluginId: string;
  developerId: string;
  tenantId: string;
  type: TransactionType;
  status: TransactionStatus;
  pricingModel: PricingModel;
  grossAmountCents: number;
  developerShareCents: number;
  platformShareCents: number;
  processingFeeCents: number;
  netDeveloperCents: number;
  currency: string;
  stripePaymentIntentId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface DeveloperEarnings {
  developerId: string;
  periodStart: string;
  periodEnd: string;
  totalGrossRevenueCents: number;
  totalDeveloperShareCents: number;
  totalPlatformShareCents: number;
  totalProcessingFeesCents: number;
  netEarningsCents: number;
  transactionCount: number;
  byPlugin: PluginEarnings[];
  byPricingModel: Record<PricingModel, number>;
  pendingPayoutCents: number;
  lifetimeEarningsCents: number;
}

export interface PluginEarnings {
  pluginId: string;
  pluginName: string;
  grossRevenueCents: number;
  developerShareCents: number;
  transactionCount: number;
  refundCount: number;
}

export interface RevenueReport {
  id: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  periodStart: string;
  periodEnd: string;
  totalGrossRevenueCents: number;
  totalDeveloperPayoutsCents: number;
  totalPlatformRevenueCents: number;
  totalProcessingFeesCents: number;
  transactionCount: number;
  uniqueDevelopers: number;
  uniquePlugins: number;
  byPricingModel: Record<PricingModel, RevenueBreakdown>;
  topPlugins: Array<{ pluginId: string; revenueCents: number }>;
  topDevelopers: Array<{ developerId: string; revenueCents: number }>;
  generatedAt: string;
  governanceVerdict: GovernanceVerdict;
}

export interface RevenueBreakdown {
  grossRevenueCents: number;
  transactionCount: number;
  averageTransactionCents: number;
  developerShareCents: number;
  platformShareCents: number;
}

export interface RevenueShareStats {
  totalTransactions: number;
  totalGrossRevenueCents: number;
  totalDeveloperPayoutsCents: number;
  totalPlatformRevenueCents: number;
  averageTransactionCents: number;
  refundRate: number;
  activeDevelopers: number;
  lastTransactionAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'revenue-share-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'RevenueShareService',
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RevenueShareConfig = {
  developerSharePercent: 70,
  platformSharePercent: 30,
  minPayoutThresholdCents: 10000, // $100 minimum
  payoutFrequencyDays: 30,
  enableVolumeTiers: true,
  volumeTiers: [
    { minRevenueCents: 0, maxRevenueCents: 1000000, developerSharePercent: 70 }, // Up to $10k
    { minRevenueCents: 1000001, maxRevenueCents: 10000000, developerSharePercent: 75 }, // $10k-$100k
    { minRevenueCents: 10000001, maxRevenueCents: null, developerSharePercent: 80 }, // $100k+
  ],
};

// Processing fee (Stripe-like: 2.9% + $0.30)
const PROCESSING_FEE_PERCENT = 2.9;
const PROCESSING_FEE_FIXED_CENTS = 30;

// ============================================================================
// Revenue Calculator
// ============================================================================

class RevenueCalculator {
  private config: RevenueShareConfig;

  constructor(config: RevenueShareConfig) {
    this.config = config;
  }

  /**
   * Calculate revenue split for a transaction
   */
  calculate(
    grossAmountCents: number,
    developerId: string,
    lifetimeRevenueCents: number = 0
  ): {
    developerShareCents: number;
    platformShareCents: number;
    processingFeeCents: number;
    netDeveloperCents: number;
    sharePercent: number;
  } {
    // Calculate processing fee
    const processingFeeCents = Math.round(
      (grossAmountCents * PROCESSING_FEE_PERCENT / 100) + PROCESSING_FEE_FIXED_CENTS
    );

    // Determine developer share percentage (possibly tiered)
    const sharePercent = this.getDeveloperSharePercent(lifetimeRevenueCents);

    // Calculate shares from gross (before processing fee)
    const developerShareCents = Math.round(grossAmountCents * sharePercent / 100);
    const platformShareCents = grossAmountCents - developerShareCents;

    // Net to developer is their share minus processing fees
    // (Platform absorbs processing fee from their share typically)
    const netDeveloperCents = developerShareCents;

    return {
      developerShareCents,
      platformShareCents,
      processingFeeCents,
      netDeveloperCents,
      sharePercent,
    };
  }

  /**
   * Get developer share percentage based on volume tiers
   */
  private getDeveloperSharePercent(lifetimeRevenueCents: number): number {
    if (!this.config.enableVolumeTiers) {
      return this.config.developerSharePercent;
    }

    for (const tier of this.config.volumeTiers) {
      if (lifetimeRevenueCents >= tier.minRevenueCents) {
        if (tier.maxRevenueCents === null || lifetimeRevenueCents <= tier.maxRevenueCents) {
          return tier.developerSharePercent;
        }
      }
    }

    return this.config.developerSharePercent;
  }
}

// ============================================================================
// Revenue Share Service
// ============================================================================

export class RevenueShareService extends EventEmitter {
  private config: RevenueShareConfig;
  private calculator: RevenueCalculator;
  private transactions: Map<string, Transaction[]> = new Map();
  private developerLifetimeRevenue: Map<string, number> = new Map();
  private stats: RevenueShareStats;

  constructor(config?: Partial<RevenueShareConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.calculator = new RevenueCalculator(this.config);
    this.stats = {
      totalTransactions: 0,
      totalGrossRevenueCents: 0,
      totalDeveloperPayoutsCents: 0,
      totalPlatformRevenueCents: 0,
      averageTransactionCents: 0,
      refundRate: 0,
      activeDevelopers: 0,
      lastTransactionAt: null,
    };

    logger.info(
      {
        developerShare: `${this.config.developerSharePercent}%`,
        platformShare: `${this.config.platformSharePercent}%`,
        enableVolumeTiers: this.config.enableVolumeTiers,
      },
      'RevenueShareService initialized'
    );
  }

  /**
   * Record a new transaction
   */
  async recordTransaction(
    pluginId: string,
    developerId: string,
    tenantId: string,
    type: TransactionType,
    pricingModel: PricingModel,
    grossAmountCents: number,
    metadata: Record<string, unknown> = {}
  ): Promise<DataEnvelope<Transaction>> {
    // Get developer's lifetime revenue for tier calculation
    const lifetimeRevenue = this.developerLifetimeRevenue.get(developerId) || 0;

    // Calculate revenue split
    const split = this.calculator.calculate(grossAmountCents, developerId, lifetimeRevenue);

    const transaction: Transaction = {
      id: uuidv4(),
      pluginId,
      developerId,
      tenantId,
      type,
      status: 'pending',
      pricingModel,
      grossAmountCents,
      developerShareCents: split.developerShareCents,
      platformShareCents: split.platformShareCents,
      processingFeeCents: split.processingFeeCents,
      netDeveloperCents: split.netDeveloperCents,
      currency: 'USD',
      metadata: {
        ...metadata,
        sharePercent: split.sharePercent,
        lifetimeRevenueAtTransaction: lifetimeRevenue,
      },
      createdAt: new Date().toISOString(),
    };

    // Store transaction
    const developerTransactions = this.transactions.get(developerId) || [];
    developerTransactions.push(transaction);
    this.transactions.set(developerId, developerTransactions);

    // Update stats
    this.updateStats(transaction);

    // Emit event
    this.emit('transaction:created', transaction);

    logger.info(
      {
        transactionId: transaction.id,
        pluginId,
        developerId,
        grossAmount: `$${(grossAmountCents / 100).toFixed(2)}`,
        developerShare: `$${(split.developerShareCents / 100).toFixed(2)} (${split.sharePercent}%)`,
        platformShare: `$${(split.platformShareCents / 100).toFixed(2)}`,
      },
      'Transaction recorded'
    );

    return createDataEnvelope(transaction, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Transaction recorded'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Complete a transaction
   */
  async completeTransaction(
    transactionId: string,
    stripePaymentIntentId?: string
  ): Promise<DataEnvelope<Transaction | null>> {
    const transaction = this.findTransaction(transactionId);

    if (!transaction) {
      return createDataEnvelope(null, {
        source: 'RevenueShareService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Transaction not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    transaction.status = 'completed';
    transaction.completedAt = new Date().toISOString();
    if (stripePaymentIntentId) {
      transaction.stripePaymentIntentId = stripePaymentIntentId;
    }

    // Update lifetime revenue
    if (transaction.type !== 'refund') {
      const current = this.developerLifetimeRevenue.get(transaction.developerId) || 0;
      this.developerLifetimeRevenue.set(
        transaction.developerId,
        current + transaction.grossAmountCents
      );
    }

    this.emit('transaction:completed', transaction);

    logger.info(
      { transactionId, developerId: transaction.developerId },
      'Transaction completed'
    );

    return createDataEnvelope(transaction, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Transaction completed'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Process a refund
   */
  async processRefund(
    originalTransactionId: string,
    refundAmountCents?: number
  ): Promise<DataEnvelope<Transaction | null>> {
    const original = this.findTransaction(originalTransactionId);

    if (!original) {
      return createDataEnvelope(null, {
        source: 'RevenueShareService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Original transaction not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    if (original.status === 'refunded') {
      return createDataEnvelope(null, {
        source: 'RevenueShareService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Transaction already refunded'),
        classification: DataClassification.INTERNAL,
      });
    }

    const refundAmount = refundAmountCents || original.grossAmountCents;
    const refundRatio = refundAmount / original.grossAmountCents;

    // Create refund transaction (negative values)
    const refundTransaction: Transaction = {
      id: uuidv4(),
      pluginId: original.pluginId,
      developerId: original.developerId,
      tenantId: original.tenantId,
      type: 'refund',
      status: 'completed',
      pricingModel: original.pricingModel,
      grossAmountCents: -refundAmount,
      developerShareCents: -Math.round(original.developerShareCents * refundRatio),
      platformShareCents: -Math.round(original.platformShareCents * refundRatio),
      processingFeeCents: 0, // Processing fees not refunded
      netDeveloperCents: -Math.round(original.netDeveloperCents * refundRatio),
      currency: original.currency,
      metadata: {
        originalTransactionId,
        refundRatio,
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    // Mark original as refunded
    original.status = 'refunded';

    // Store refund transaction
    const developerTransactions = this.transactions.get(original.developerId) || [];
    developerTransactions.push(refundTransaction);
    this.transactions.set(original.developerId, developerTransactions);

    // Update lifetime revenue (subtract)
    const current = this.developerLifetimeRevenue.get(original.developerId) || 0;
    this.developerLifetimeRevenue.set(
      original.developerId,
      Math.max(0, current - refundAmount)
    );

    // Update refund rate
    this.updateRefundRate();

    this.emit('transaction:refunded', { original, refund: refundTransaction });

    logger.info(
      {
        refundId: refundTransaction.id,
        originalId: originalTransactionId,
        refundAmount: `$${(refundAmount / 100).toFixed(2)}`,
      },
      'Refund processed'
    );

    return createDataEnvelope(refundTransaction, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Refund processed'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get developer earnings for a period
   */
  getDeveloperEarnings(
    developerId: string,
    startDate: Date,
    endDate: Date
  ): DataEnvelope<DeveloperEarnings> {
    const transactions = (this.transactions.get(developerId) || [])
      .filter(t => {
        const txDate = new Date(t.createdAt);
        return txDate >= startDate && txDate <= endDate && t.status === 'completed';
      });

    // Aggregate by plugin
    const byPlugin = new Map<string, PluginEarnings>();
    const byModel: Record<PricingModel, number> = {
      free: 0,
      one_time: 0,
      subscription: 0,
      usage_based: 0,
    };

    let totalGross = 0;
    let totalDeveloper = 0;
    let totalPlatform = 0;
    let totalFees = 0;

    for (const tx of transactions) {
      totalGross += tx.grossAmountCents;
      totalDeveloper += tx.developerShareCents;
      totalPlatform += tx.platformShareCents;
      totalFees += tx.processingFeeCents;

      byModel[tx.pricingModel] += tx.grossAmountCents;

      const plugin = byPlugin.get(tx.pluginId) || {
        pluginId: tx.pluginId,
        pluginName: tx.pluginId, // Would come from plugin registry
        grossRevenueCents: 0,
        developerShareCents: 0,
        transactionCount: 0,
        refundCount: 0,
      };

      if (tx.type === 'refund') {
        plugin.refundCount++;
      } else {
        plugin.grossRevenueCents += tx.grossAmountCents;
        plugin.developerShareCents += tx.developerShareCents;
        plugin.transactionCount++;
      }

      byPlugin.set(tx.pluginId, plugin);
    }

    // Calculate pending payout
    const pendingPayoutCents = this.calculatePendingPayout(developerId);
    const lifetimeEarningsCents = this.developerLifetimeRevenue.get(developerId) || 0;

    const earnings: DeveloperEarnings = {
      developerId,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalGrossRevenueCents: totalGross,
      totalDeveloperShareCents: totalDeveloper,
      totalPlatformShareCents: totalPlatform,
      totalProcessingFeesCents: totalFees,
      netEarningsCents: totalDeveloper,
      transactionCount: transactions.length,
      byPlugin: Array.from(byPlugin.values()),
      byPricingModel: byModel,
      pendingPayoutCents,
      lifetimeEarningsCents,
    };

    return createDataEnvelope(earnings, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Earnings calculated'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Generate revenue report
   */
  generateReport(
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    startDate: Date,
    endDate: Date
  ): DataEnvelope<RevenueReport> {
    // Collect all transactions in period
    const allTransactions: Transaction[] = [];
    const developerSet = new Set<string>();
    const pluginSet = new Set<string>();

    for (const [developerId, transactions] of this.transactions) {
      for (const tx of transactions) {
        const txDate = new Date(tx.createdAt);
        if (txDate >= startDate && txDate <= endDate && tx.status === 'completed') {
          allTransactions.push(tx);
          developerSet.add(developerId);
          pluginSet.add(tx.pluginId);
        }
      }
    }

    // Aggregate metrics
    let totalGross = 0;
    let totalDeveloper = 0;
    let totalPlatform = 0;
    let totalFees = 0;

    const byModel: Record<PricingModel, RevenueBreakdown> = {
      free: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
      one_time: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
      subscription: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
      usage_based: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
    };

    const pluginRevenue = new Map<string, number>();
    const developerRevenue = new Map<string, number>();

    for (const tx of allTransactions) {
      if (tx.type === 'refund') {continue;}

      totalGross += tx.grossAmountCents;
      totalDeveloper += tx.developerShareCents;
      totalPlatform += tx.platformShareCents;
      totalFees += tx.processingFeeCents;

      byModel[tx.pricingModel].grossRevenueCents += tx.grossAmountCents;
      byModel[tx.pricingModel].transactionCount++;
      byModel[tx.pricingModel].developerShareCents += tx.developerShareCents;
      byModel[tx.pricingModel].platformShareCents += tx.platformShareCents;

      pluginRevenue.set(tx.pluginId, (pluginRevenue.get(tx.pluginId) || 0) + tx.grossAmountCents);
      developerRevenue.set(tx.developerId, (developerRevenue.get(tx.developerId) || 0) + tx.grossAmountCents);
    }

    // Calculate averages
    for (const model of Object.keys(byModel) as PricingModel[]) {
      if (byModel[model].transactionCount > 0) {
        byModel[model].averageTransactionCents =
          Math.round(byModel[model].grossRevenueCents / byModel[model].transactionCount);
      }
    }

    // Top plugins and developers
    const topPlugins = Array.from(pluginRevenue.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pluginId, revenueCents]) => ({ pluginId, revenueCents }));

    const topDevelopers = Array.from(developerRevenue.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([developerId, revenueCents]) => ({ developerId, revenueCents }));

    const report: RevenueReport = {
      id: uuidv4(),
      reportType,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalGrossRevenueCents: totalGross,
      totalDeveloperPayoutsCents: totalDeveloper,
      totalPlatformRevenueCents: totalPlatform,
      totalProcessingFeesCents: totalFees,
      transactionCount: allTransactions.filter(t => t.type !== 'refund').length,
      uniqueDevelopers: developerSet.size,
      uniquePlugins: pluginSet.size,
      byPricingModel: byModel,
      topPlugins,
      topDevelopers,
      generatedAt: new Date().toISOString(),
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Report generated'),
    };

    logger.info(
      {
        reportId: report.id,
        reportType,
        totalGross: `$${(totalGross / 100).toFixed(2)}`,
        transactionCount: report.transactionCount,
      },
      'Revenue report generated'
    );

    return createDataEnvelope(report, {
      source: 'RevenueShareService',
      governanceVerdict: report.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get revenue share configuration
   */
  getConfig(): DataEnvelope<RevenueShareConfig> {
    return createDataEnvelope({ ...this.config }, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Config retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get statistics
   */
  getStats(): DataEnvelope<RevenueShareStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get transactions for a developer
   */
  getTransactions(
    developerId: string,
    limit: number = 100
  ): DataEnvelope<Transaction[]> {
    const transactions = (this.transactions.get(developerId) || [])
      .slice(-limit)
      .reverse();

    return createDataEnvelope(transactions, {
      source: 'RevenueShareService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Transactions retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private findTransaction(transactionId: string): Transaction | undefined {
    for (const transactions of this.transactions.values()) {
      const found = transactions.find(t => t.id === transactionId);
      if (found) {return found;}
    }
    return undefined;
  }

  private calculatePendingPayout(developerId: string): number {
    const transactions = this.transactions.get(developerId) || [];
    const pendingCutoff = new Date(
      Date.now() - this.config.payoutFrequencyDays * 24 * 60 * 60 * 1000
    );

    return transactions
      .filter(t =>
        t.status === 'completed' &&
        new Date(t.completedAt || t.createdAt) > pendingCutoff
      )
      .reduce((sum, t) => sum + t.netDeveloperCents, 0);
  }

  private updateStats(transaction: Transaction): void {
    this.stats.totalTransactions++;
    this.stats.totalGrossRevenueCents += transaction.grossAmountCents;
    this.stats.totalDeveloperPayoutsCents += transaction.developerShareCents;
    this.stats.totalPlatformRevenueCents += transaction.platformShareCents;
    this.stats.averageTransactionCents =
      this.stats.totalGrossRevenueCents / this.stats.totalTransactions;
    this.stats.activeDevelopers = this.transactions.size;
    this.stats.lastTransactionAt = transaction.createdAt;
  }

  private updateRefundRate(): void {
    let total = 0;
    let refunds = 0;

    for (const transactions of this.transactions.values()) {
      for (const tx of transactions) {
        if (tx.status === 'completed') {total++;}
        if (tx.type === 'refund') {refunds++;}
      }
    }

    this.stats.refundRate = total > 0 ? refunds / total : 0;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: RevenueShareService | null = null;

export function getRevenueShareService(
  config?: Partial<RevenueShareConfig>
): RevenueShareService {
  if (!instance) {
    instance = new RevenueShareService(config);
  }
  return instance;
}

export default RevenueShareService;
