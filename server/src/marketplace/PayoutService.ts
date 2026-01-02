/**
 * Payout Service
 *
 * Manages developer payouts via Stripe Connect.
 * Handles payout scheduling, processing, and reconciliation.
 *
 * SOC 2 Controls: CC6.7 (Financial Processing), CC7.1 (Billing Operations)
 *
 * @module marketplace/PayoutService
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

export type PayoutStatus =
  | 'scheduled'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'on_hold';

export type PayoutMethod = 'bank_transfer' | 'stripe_balance' | 'manual';

export interface Payout {
  id: string;
  developerId: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  method: PayoutMethod;
  stripeTransferId?: string;
  stripePayoutId?: string;
  periodStart: string;
  periodEnd: string;
  transactionIds: string[];
  scheduledAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperPayoutAccount {
  developerId: string;
  stripeConnectAccountId: string;
  accountStatus: 'pending' | 'active' | 'restricted' | 'disabled';
  payoutsEnabled: boolean;
  defaultCurrency: string;
  payoutSchedule: PayoutSchedule;
  bankAccount?: BankAccountInfo;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  createdAt: string;
  updatedAt: string;
}

export interface PayoutSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  anchorDay?: number; // Day of week (0-6) or day of month (1-31)
  minimumAmountCents: number;
  delayDays: number; // Days to hold before payout
}

export interface BankAccountInfo {
  bankName: string;
  last4: string;
  routingLast4?: string;
  country: string;
  currency: string;
}

export interface PayoutBatch {
  id: string;
  scheduledDate: string;
  payouts: Payout[];
  totalAmountCents: number;
  status: 'pending' | 'processing' | 'completed' | 'partial_failure';
  successCount: number;
  failureCount: number;
  processedAt?: string;
  completedAt?: string;
}

export interface PayoutStatement {
  id: string;
  developerId: string;
  periodStart: string;
  periodEnd: string;
  openingBalanceCents: number;
  grossEarningsCents: number;
  refundsCents: number;
  feesCents: number;
  adjustmentsCents: number;
  payoutsCents: number;
  closingBalanceCents: number;
  transactions: StatementTransaction[];
  payouts: StatementPayout[];
  generatedAt: string;
  governanceVerdict: GovernanceVerdict;
}

export interface StatementTransaction {
  date: string;
  description: string;
  type: 'earning' | 'refund' | 'fee' | 'adjustment';
  amountCents: number;
  balanceCents: number;
}

export interface StatementPayout {
  date: string;
  payoutId: string;
  amountCents: number;
  status: PayoutStatus;
}

export interface PayoutConfig {
  /** Default payout frequency */
  defaultFrequency: 'daily' | 'weekly' | 'monthly';
  /** Minimum payout amount in cents */
  minimumPayoutCents: number;
  /** Days to hold earnings before payout eligibility */
  holdPeriodDays: number;
  /** Enable automatic payouts */
  automaticPayouts: boolean;
  /** Process payouts at this hour (UTC) */
  processingHourUtc: number;
  /** Maximum payouts per batch */
  maxPayoutsPerBatch: number;
}

export interface PayoutStats {
  totalPayoutsProcessed: number;
  totalAmountPaidCents: number;
  averagePayoutCents: number;
  successRate: number;
  pendingPayoutsCents: number;
  failedPayoutsCount: number;
  activeDeveloperAccounts: number;
  lastPayoutAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'payout-service-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'PayoutService',
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PayoutConfig = {
  defaultFrequency: 'monthly',
  minimumPayoutCents: 10000, // $100
  holdPeriodDays: 7,
  automaticPayouts: true,
  processingHourUtc: 9, // 9 AM UTC
  maxPayoutsPerBatch: 100,
};

// ============================================================================
// Payout Scheduler
// ============================================================================

class PayoutScheduler {
  private config: PayoutConfig;

  constructor(config: PayoutConfig) {
    this.config = config;
  }

  /**
   * Calculate next payout date based on schedule
   */
  calculateNextPayoutDate(schedule: PayoutSchedule): Date {
    const now = new Date();
    let nextDate = new Date(now);
    nextDate.setUTCHours(this.config.processingHourUtc, 0, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (now.getUTCHours() >= this.config.processingHourUtc) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;

      case 'weekly': {
        const targetDay = schedule.anchorDay || 5; // Default Friday
        const currentDay = now.getUTCDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0 || (daysUntil === 0 && now.getUTCHours() >= this.config.processingHourUtc)) {
          daysUntil += 7;
        }
        nextDate.setDate(nextDate.getDate() + daysUntil);
        break;
      }

      case 'monthly': {
        const targetDay = schedule.anchorDay || 1; // Default 1st of month
        nextDate.setDate(targetDay);
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
      }
    }

    return nextDate;
  }

  /**
   * Check if a developer is eligible for payout
   */
  isEligibleForPayout(
    balanceCents: number,
    schedule: PayoutSchedule,
    lastPayoutDate?: Date
  ): boolean {
    // Check minimum amount
    if (balanceCents < schedule.minimumAmountCents) {
      return false;
    }

    // Check hold period
    if (lastPayoutDate) {
      const daysSinceLastPayout = Math.floor(
        (Date.now() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastPayout < schedule.delayDays) {
        return false;
      }
    }

    return true;
  }
}

// ============================================================================
// Stripe Connect Adapter (Mock for demo)
// ============================================================================

class StripeConnectAdapter {
  /**
   * Create a Stripe Connect account for developer
   */
  async createConnectAccount(
    developerId: string,
    email: string,
    country: string
  ): Promise<{ accountId: string; onboardingUrl: string }> {
    // In production, this would call Stripe API
    const accountId = `acct_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const onboardingUrl = `https://connect.stripe.com/setup/s/${accountId}`;

    logger.info({ developerId, accountId }, 'Stripe Connect account created');

    return { accountId, onboardingUrl };
  }

  /**
   * Create a transfer to developer's Connect account
   */
  async createTransfer(
    accountId: string,
    amountCents: number,
    currency: string,
    metadata: Record<string, unknown>
  ): Promise<{ transferId: string }> {
    // In production, this would call Stripe API
    const transferId = `tr_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

    logger.info(
      { accountId, amountCents, transferId },
      'Stripe transfer created'
    );

    return { transferId };
  }

  /**
   * Initiate payout from Connect account to bank
   */
  async createPayout(
    accountId: string,
    amountCents: number,
    currency: string
  ): Promise<{ payoutId: string }> {
    // In production, this would call Stripe API
    const payoutId = `po_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

    logger.info(
      { accountId, amountCents, payoutId },
      'Stripe payout created'
    );

    return { payoutId };
  }

  /**
   * Get account status
   */
  async getAccountStatus(accountId: string): Promise<{
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
  }> {
    // In production, this would call Stripe API
    return {
      payoutsEnabled: true,
      detailsSubmitted: true,
      chargesEnabled: true,
    };
  }
}

// ============================================================================
// Payout Service
// ============================================================================

export class PayoutService extends EventEmitter {
  private config: PayoutConfig;
  private scheduler: PayoutScheduler;
  private stripe: StripeConnectAdapter;
  private accounts: Map<string, DeveloperPayoutAccount> = new Map();
  private payouts: Map<string, Payout[]> = new Map();
  private pendingBalances: Map<string, number> = new Map();
  private stats: PayoutStats;

  constructor(config?: Partial<PayoutConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scheduler = new PayoutScheduler(this.config);
    this.stripe = new StripeConnectAdapter();
    this.stats = {
      totalPayoutsProcessed: 0,
      totalAmountPaidCents: 0,
      averagePayoutCents: 0,
      successRate: 1.0,
      pendingPayoutsCents: 0,
      failedPayoutsCount: 0,
      activeDeveloperAccounts: 0,
      lastPayoutAt: null,
    };

    logger.info({ config: this.config }, 'PayoutService initialized');
  }

  /**
   * Create a payout account for developer
   */
  async createPayoutAccount(
    developerId: string,
    email: string,
    country: string
  ): Promise<DataEnvelope<{ account: DeveloperPayoutAccount; onboardingUrl: string }>> {
    // Check if account already exists
    if (this.accounts.has(developerId)) {
      return createDataEnvelope(null as any, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Account already exists'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Create Stripe Connect account
    const { accountId, onboardingUrl } = await this.stripe.createConnectAccount(
      developerId,
      email,
      country
    );

    const account: DeveloperPayoutAccount = {
      developerId,
      stripeConnectAccountId: accountId,
      accountStatus: 'pending',
      payoutsEnabled: false,
      defaultCurrency: country === 'US' ? 'USD' : 'EUR',
      payoutSchedule: {
        frequency: this.config.defaultFrequency,
        minimumAmountCents: this.config.minimumPayoutCents,
        delayDays: this.config.holdPeriodDays,
      },
      verificationStatus: 'unverified',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.accounts.set(developerId, account);
    this.stats.activeDeveloperAccounts++;

    logger.info({ developerId, accountId }, 'Developer payout account created');

    return createDataEnvelope({ account, onboardingUrl }, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Account created'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Update payout schedule for developer
   */
  updatePayoutSchedule(
    developerId: string,
    schedule: Partial<PayoutSchedule>
  ): DataEnvelope<DeveloperPayoutAccount | null> {
    const account = this.accounts.get(developerId);

    if (!account) {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Account not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    account.payoutSchedule = {
      ...account.payoutSchedule,
      ...schedule,
    };
    account.updatedAt = new Date().toISOString();

    logger.info({ developerId, schedule }, 'Payout schedule updated');

    return createDataEnvelope(account, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Schedule updated'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Add earnings to developer's pending balance
   */
  addEarnings(developerId: string, amountCents: number, transactionId: string): void {
    const current = this.pendingBalances.get(developerId) || 0;
    this.pendingBalances.set(developerId, current + amountCents);
    this.stats.pendingPayoutsCents += amountCents;

    logger.debug(
      { developerId, amountCents, newBalance: current + amountCents },
      'Earnings added to pending balance'
    );
  }

  /**
   * Create a scheduled payout
   */
  async schedulePayout(
    developerId: string,
    amountCents?: number
  ): Promise<DataEnvelope<Payout | null>> {
    const account = this.accounts.get(developerId);

    if (!account) {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Account not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    if (!account.payoutsEnabled) {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Payouts not enabled'),
        classification: DataClassification.INTERNAL,
      });
    }

    const balance = this.pendingBalances.get(developerId) || 0;
    const payoutAmount = amountCents || balance;

    if (payoutAmount < account.payoutSchedule.minimumAmountCents) {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          `Below minimum payout amount ($${(account.payoutSchedule.minimumAmountCents / 100).toFixed(2)})`
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    if (payoutAmount > balance) {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Insufficient balance'),
        classification: DataClassification.INTERNAL,
      });
    }

    const scheduledDate = this.scheduler.calculateNextPayoutDate(account.payoutSchedule);

    const payout: Payout = {
      id: uuidv4(),
      developerId,
      amountCents: payoutAmount,
      currency: account.defaultCurrency,
      status: 'scheduled',
      method: 'bank_transfer',
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      transactionIds: [],
      scheduledAt: scheduledDate.toISOString(),
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store payout
    const developerPayouts = this.payouts.get(developerId) || [];
    developerPayouts.push(payout);
    this.payouts.set(developerId, developerPayouts);

    // Update balance
    this.pendingBalances.set(developerId, balance - payoutAmount);
    this.stats.pendingPayoutsCents -= payoutAmount;

    this.emit('payout:scheduled', payout);

    logger.info(
      {
        payoutId: payout.id,
        developerId,
        amountCents: payoutAmount,
        scheduledAt: payout.scheduledAt,
      },
      'Payout scheduled'
    );

    return createDataEnvelope(payout, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Payout scheduled'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Process a payout
   */
  async processPayout(payoutId: string): Promise<DataEnvelope<Payout | null>> {
    const payout = this.findPayout(payoutId);

    if (!payout) {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Payout not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    if (payout.status !== 'scheduled') {
      return createDataEnvelope(null, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, `Invalid status: ${payout.status}`),
        classification: DataClassification.INTERNAL,
      });
    }

    const account = this.accounts.get(payout.developerId);
    if (!account) {
      payout.status = 'failed';
      payout.failureReason = 'Account not found';
      return createDataEnvelope(payout, {
        source: 'PayoutService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Account not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    payout.status = 'processing';
    payout.processedAt = new Date().toISOString();
    payout.updatedAt = new Date().toISOString();

    try {
      // Create transfer to Connect account
      const { transferId } = await this.stripe.createTransfer(
        account.stripeConnectAccountId,
        payout.amountCents,
        payout.currency,
        { payoutId: payout.id }
      );
      payout.stripeTransferId = transferId;

      // Initiate payout to bank
      const { payoutId: stripePayoutId } = await this.stripe.createPayout(
        account.stripeConnectAccountId,
        payout.amountCents,
        payout.currency
      );
      payout.stripePayoutId = stripePayoutId;

      // Mark as completed
      payout.status = 'completed';
      payout.completedAt = new Date().toISOString();
      payout.updatedAt = new Date().toISOString();

      // Update stats
      this.stats.totalPayoutsProcessed++;
      this.stats.totalAmountPaidCents += payout.amountCents;
      this.stats.averagePayoutCents =
        this.stats.totalAmountPaidCents / this.stats.totalPayoutsProcessed;
      this.stats.lastPayoutAt = payout.completedAt;

      this.emit('payout:completed', payout);

      logger.info(
        {
          payoutId: payout.id,
          developerId: payout.developerId,
          amountCents: payout.amountCents,
          transferId,
          stripePayoutId,
        },
        'Payout completed'
      );

    } catch (error: any) {
      payout.status = 'failed';
      payout.failureReason = error instanceof Error ? error.message : 'Unknown error';
      payout.updatedAt = new Date().toISOString();

      // Return balance
      const balance = this.pendingBalances.get(payout.developerId) || 0;
      this.pendingBalances.set(payout.developerId, balance + payout.amountCents);
      this.stats.pendingPayoutsCents += payout.amountCents;
      this.stats.failedPayoutsCount++;

      // Update success rate
      const total = this.stats.totalPayoutsProcessed + this.stats.failedPayoutsCount;
      this.stats.successRate = this.stats.totalPayoutsProcessed / total;

      this.emit('payout:failed', payout);

      logger.error(
        { payoutId: payout.id, error: payout.failureReason },
        'Payout failed'
      );
    }

    return createDataEnvelope(payout, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(
        payout.status === 'completed' ? GovernanceResult.ALLOW : GovernanceResult.FLAG,
        `Payout ${payout.status}`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Process all scheduled payouts due
   */
  async processScheduledPayouts(): Promise<DataEnvelope<PayoutBatch>> {
    const now = new Date();
    const duePayouts: Payout[] = [];

    for (const [, payouts] of this.payouts) {
      for (const payout of payouts) {
        if (payout.status === 'scheduled' && new Date(payout.scheduledAt) <= now) {
          duePayouts.push(payout);
        }
      }
    }

    // Limit batch size
    const batchPayouts = duePayouts.slice(0, this.config.maxPayoutsPerBatch);

    const batch: PayoutBatch = {
      id: uuidv4(),
      scheduledDate: now.toISOString(),
      payouts: batchPayouts,
      totalAmountCents: batchPayouts.reduce((sum, p) => sum + p.amountCents, 0),
      status: 'processing',
      successCount: 0,
      failureCount: 0,
      processedAt: now.toISOString(),
    };

    // Process each payout
    for (const payout of batchPayouts) {
      const result = await this.processPayout(payout.id);
      if (result.data?.status === 'completed') {
        batch.successCount++;
      } else {
        batch.failureCount++;
      }
    }

    batch.status = batch.failureCount === 0 ? 'completed' :
                   batch.successCount === 0 ? 'partial_failure' : 'completed';
    batch.completedAt = new Date().toISOString();

    logger.info(
      {
        batchId: batch.id,
        totalPayouts: batchPayouts.length,
        successCount: batch.successCount,
        failureCount: batch.failureCount,
        totalAmount: `$${(batch.totalAmountCents / 100).toFixed(2)}`,
      },
      'Payout batch processed'
    );

    return createDataEnvelope(batch, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(
        batch.failureCount === 0 ? GovernanceResult.ALLOW : GovernanceResult.FLAG,
        `Batch ${batch.status}: ${batch.successCount}/${batchPayouts.length} succeeded`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Generate payout statement for developer
   */
  generateStatement(
    developerId: string,
    startDate: Date,
    endDate: Date
  ): DataEnvelope<PayoutStatement> {
    const account = this.accounts.get(developerId);
    const developerPayouts = (this.payouts.get(developerId) || [])
      .filter(p => {
        const date = new Date(p.createdAt);
        return date >= startDate && date <= endDate;
      });

    const transactions: StatementTransaction[] = [];
    const payoutsList: StatementPayout[] = [];
    let runningBalance = 0;

    // Add earnings (would come from transaction service in production)
    const earnings = this.pendingBalances.get(developerId) || 0;
    if (earnings > 0) {
      transactions.push({
        date: new Date().toISOString(),
        description: 'Plugin sales earnings',
        type: 'earning',
        amountCents: earnings,
        balanceCents: runningBalance + earnings,
      });
      runningBalance += earnings;
    }

    // Add payouts
    for (const payout of developerPayouts) {
      payoutsList.push({
        date: payout.createdAt,
        payoutId: payout.id,
        amountCents: payout.amountCents,
        status: payout.status,
      });

      if (payout.status === 'completed') {
        transactions.push({
          date: payout.completedAt || payout.createdAt,
          description: `Payout to bank account`,
          type: 'earning',
          amountCents: -payout.amountCents,
          balanceCents: runningBalance - payout.amountCents,
        });
        runningBalance -= payout.amountCents;
      }
    }

    const statement: PayoutStatement = {
      id: uuidv4(),
      developerId,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      openingBalanceCents: 0,
      grossEarningsCents: earnings,
      refundsCents: 0,
      feesCents: 0,
      adjustmentsCents: 0,
      payoutsCents: developerPayouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amountCents, 0),
      closingBalanceCents: runningBalance,
      transactions,
      payouts: payoutsList,
      generatedAt: new Date().toISOString(),
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Statement generated'),
    };

    return createDataEnvelope(statement, {
      source: 'PayoutService',
      governanceVerdict: statement.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get developer account
   */
  getAccount(developerId: string): DataEnvelope<DeveloperPayoutAccount | null> {
    const account = this.accounts.get(developerId) || null;

    return createDataEnvelope(account, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(
        account ? GovernanceResult.ALLOW : GovernanceResult.DENY,
        account ? 'Account retrieved' : 'Account not found'
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get developer's pending balance
   */
  getPendingBalance(developerId: string): DataEnvelope<number> {
    const balance = this.pendingBalances.get(developerId) || 0;

    return createDataEnvelope(balance, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Balance retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get payouts for developer
   */
  getPayouts(
    developerId: string,
    status?: PayoutStatus
  ): DataEnvelope<Payout[]> {
    let payouts = this.payouts.get(developerId) || [];

    if (status) {
      payouts = payouts.filter(p => p.status === status);
    }

    return createDataEnvelope(payouts, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Payouts retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get statistics
   */
  getStats(): DataEnvelope<PayoutStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'PayoutService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Update account status (called by Stripe webhook in production)
   */
  updateAccountStatus(
    developerId: string,
    payoutsEnabled: boolean,
    verificationStatus: 'unverified' | 'pending' | 'verified'
  ): void {
    const account = this.accounts.get(developerId);
    if (account) {
      account.payoutsEnabled = payoutsEnabled;
      account.verificationStatus = verificationStatus;
      account.accountStatus = payoutsEnabled ? 'active' : 'pending';
      account.updatedAt = new Date().toISOString();

      logger.info(
        { developerId, payoutsEnabled, verificationStatus },
        'Account status updated'
      );
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private findPayout(payoutId: string): Payout | undefined {
    for (const payouts of this.payouts.values()) {
      const found = payouts.find(p => p.id === payoutId);
      if (found) return found;
    }
    return undefined;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: PayoutService | null = null;

export function getPayoutService(
  config?: Partial<PayoutConfig>
): PayoutService {
  if (!instance) {
    instance = new PayoutService(config);
  }
  return instance;
}

export default PayoutService;
