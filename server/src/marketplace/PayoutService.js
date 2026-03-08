"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutService = void 0;
exports.getPayoutService = getPayoutService;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
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
const DEFAULT_CONFIG = {
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
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Calculate next payout date based on schedule
     */
    calculateNextPayoutDate(schedule) {
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
    isEligibleForPayout(balanceCents, schedule, lastPayoutDate) {
        // Check minimum amount
        if (balanceCents < schedule.minimumAmountCents) {
            return false;
        }
        // Check hold period
        if (lastPayoutDate) {
            const daysSinceLastPayout = Math.floor((Date.now() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24));
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
    async createConnectAccount(developerId, email, country) {
        // In production, this would call Stripe API
        const accountId = `acct_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 16)}`;
        const onboardingUrl = `https://connect.stripe.com/setup/s/${accountId}`;
        logger_js_1.default.info({ developerId, accountId }, 'Stripe Connect account created');
        return { accountId, onboardingUrl };
    }
    /**
     * Create a transfer to developer's Connect account
     */
    async createTransfer(accountId, amountCents, currency, metadata) {
        // In production, this would call Stripe API
        const transferId = `tr_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 24)}`;
        logger_js_1.default.info({ accountId, amountCents, transferId }, 'Stripe transfer created');
        return { transferId };
    }
    /**
     * Initiate payout from Connect account to bank
     */
    async createPayout(accountId, amountCents, currency) {
        // In production, this would call Stripe API
        const payoutId = `po_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 24)}`;
        logger_js_1.default.info({ accountId, amountCents, payoutId }, 'Stripe payout created');
        return { payoutId };
    }
    /**
     * Get account status
     */
    async getAccountStatus(accountId) {
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
class PayoutService extends events_1.EventEmitter {
    config;
    scheduler;
    stripe;
    accounts = new Map();
    payouts = new Map();
    pendingBalances = new Map();
    stats;
    constructor(config) {
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
        logger_js_1.default.info({ config: this.config }, 'PayoutService initialized');
    }
    /**
     * Create a payout account for developer
     */
    async createPayoutAccount(developerId, email, country) {
        // Check if account already exists
        if (this.accounts.has(developerId)) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Account already exists'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Create Stripe Connect account
        const { accountId, onboardingUrl } = await this.stripe.createConnectAccount(developerId, email, country);
        const account = {
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
        logger_js_1.default.info({ developerId, accountId }, 'Developer payout account created');
        return (0, data_envelope_js_1.createDataEnvelope)({ account, onboardingUrl }, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Account created'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Update payout schedule for developer
     */
    updatePayoutSchedule(developerId, schedule) {
        const account = this.accounts.get(developerId);
        if (!account) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Account not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        account.payoutSchedule = {
            ...account.payoutSchedule,
            ...schedule,
        };
        account.updatedAt = new Date().toISOString();
        logger_js_1.default.info({ developerId, schedule }, 'Payout schedule updated');
        return (0, data_envelope_js_1.createDataEnvelope)(account, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Schedule updated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Add earnings to developer's pending balance
     */
    addEarnings(developerId, amountCents, transactionId) {
        const current = this.pendingBalances.get(developerId) || 0;
        this.pendingBalances.set(developerId, current + amountCents);
        this.stats.pendingPayoutsCents += amountCents;
        logger_js_1.default.debug({ developerId, amountCents, newBalance: current + amountCents }, 'Earnings added to pending balance');
    }
    /**
     * Create a scheduled payout
     */
    async schedulePayout(developerId, amountCents) {
        const account = this.accounts.get(developerId);
        if (!account) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Account not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (!account.payoutsEnabled) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Payouts not enabled'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const balance = this.pendingBalances.get(developerId) || 0;
        const payoutAmount = amountCents || balance;
        if (payoutAmount < account.payoutSchedule.minimumAmountCents) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Below minimum payout amount ($${(account.payoutSchedule.minimumAmountCents / 100).toFixed(2)})`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (payoutAmount > balance) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Insufficient balance'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const scheduledDate = this.scheduler.calculateNextPayoutDate(account.payoutSchedule);
        const payout = {
            id: (0, uuid_1.v4)(),
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
        logger_js_1.default.info({
            payoutId: payout.id,
            developerId,
            amountCents: payoutAmount,
            scheduledAt: payout.scheduledAt,
        }, 'Payout scheduled');
        return (0, data_envelope_js_1.createDataEnvelope)(payout, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Payout scheduled'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Process a payout
     */
    async processPayout(payoutId) {
        const payout = this.findPayout(payoutId);
        if (!payout) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Payout not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (payout.status !== 'scheduled') {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Invalid status: ${payout.status}`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const account = this.accounts.get(payout.developerId);
        if (!account) {
            payout.status = 'failed';
            payout.failureReason = 'Account not found';
            return (0, data_envelope_js_1.createDataEnvelope)(payout, {
                source: 'PayoutService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Account not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        payout.status = 'processing';
        payout.processedAt = new Date().toISOString();
        payout.updatedAt = new Date().toISOString();
        try {
            // Create transfer to Connect account
            const { transferId } = await this.stripe.createTransfer(account.stripeConnectAccountId, payout.amountCents, payout.currency, { payoutId: payout.id });
            payout.stripeTransferId = transferId;
            // Initiate payout to bank
            const { payoutId: stripePayoutId } = await this.stripe.createPayout(account.stripeConnectAccountId, payout.amountCents, payout.currency);
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
            logger_js_1.default.info({
                payoutId: payout.id,
                developerId: payout.developerId,
                amountCents: payout.amountCents,
                transferId,
                stripePayoutId,
            }, 'Payout completed');
        }
        catch (error) {
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
            logger_js_1.default.error({ payoutId: payout.id, error: payout.failureReason }, 'Payout failed');
        }
        return (0, data_envelope_js_1.createDataEnvelope)(payout, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(payout.status === 'completed' ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, `Payout ${payout.status}`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Process all scheduled payouts due
     */
    async processScheduledPayouts() {
        const now = new Date();
        const duePayouts = [];
        for (const [, payouts] of this.payouts) {
            for (const payout of payouts) {
                if (payout.status === 'scheduled' && new Date(payout.scheduledAt) <= now) {
                    duePayouts.push(payout);
                }
            }
        }
        // Limit batch size
        const batchPayouts = duePayouts.slice(0, this.config.maxPayoutsPerBatch);
        const batch = {
            id: (0, uuid_1.v4)(),
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
            }
            else {
                batch.failureCount++;
            }
        }
        batch.status = batch.failureCount === 0 ? 'completed' :
            batch.successCount === 0 ? 'partial_failure' : 'completed';
        batch.completedAt = new Date().toISOString();
        logger_js_1.default.info({
            batchId: batch.id,
            totalPayouts: batchPayouts.length,
            successCount: batch.successCount,
            failureCount: batch.failureCount,
            totalAmount: `$${(batch.totalAmountCents / 100).toFixed(2)}`,
        }, 'Payout batch processed');
        return (0, data_envelope_js_1.createDataEnvelope)(batch, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(batch.failureCount === 0 ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, `Batch ${batch.status}: ${batch.successCount}/${batchPayouts.length} succeeded`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Generate payout statement for developer
     */
    generateStatement(developerId, startDate, endDate) {
        const account = this.accounts.get(developerId);
        const developerPayouts = (this.payouts.get(developerId) || [])
            .filter(p => {
            const date = new Date(p.createdAt);
            return date >= startDate && date <= endDate;
        });
        const transactions = [];
        const payoutsList = [];
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
        const statement = {
            id: (0, uuid_1.v4)(),
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
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Statement generated'),
        };
        return (0, data_envelope_js_1.createDataEnvelope)(statement, {
            source: 'PayoutService',
            governanceVerdict: statement.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get developer account
     */
    getAccount(developerId) {
        const account = this.accounts.get(developerId) || null;
        return (0, data_envelope_js_1.createDataEnvelope)(account, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(account ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.DENY, account ? 'Account retrieved' : 'Account not found'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get developer's pending balance
     */
    getPendingBalance(developerId) {
        const balance = this.pendingBalances.get(developerId) || 0;
        return (0, data_envelope_js_1.createDataEnvelope)(balance, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Balance retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get payouts for developer
     */
    getPayouts(developerId, status) {
        let payouts = this.payouts.get(developerId) || [];
        if (status) {
            payouts = payouts.filter(p => p.status === status);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(payouts, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Payouts retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'PayoutService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Update account status (called by Stripe webhook in production)
     */
    updateAccountStatus(developerId, payoutsEnabled, verificationStatus) {
        const account = this.accounts.get(developerId);
        if (account) {
            account.payoutsEnabled = payoutsEnabled;
            account.verificationStatus = verificationStatus;
            account.accountStatus = payoutsEnabled ? 'active' : 'pending';
            account.updatedAt = new Date().toISOString();
            logger_js_1.default.info({ developerId, payoutsEnabled, verificationStatus }, 'Account status updated');
        }
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    findPayout(payoutId) {
        for (const payouts of this.payouts.values()) {
            const found = payouts.find(p => p.id === payoutId);
            if (found)
                return found;
        }
        return undefined;
    }
}
exports.PayoutService = PayoutService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getPayoutService(config) {
    if (!instance) {
        instance = new PayoutService(config);
    }
    return instance;
}
exports.default = PayoutService;
