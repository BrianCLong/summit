"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueShareService = void 0;
exports.getRevenueShareService = getRevenueShareService;
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
const DEFAULT_CONFIG = {
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
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Calculate revenue split for a transaction
     */
    calculate(grossAmountCents, developerId, lifetimeRevenueCents = 0) {
        // Calculate processing fee
        const processingFeeCents = Math.round((grossAmountCents * PROCESSING_FEE_PERCENT / 100) + PROCESSING_FEE_FIXED_CENTS);
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
    getDeveloperSharePercent(lifetimeRevenueCents) {
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
class RevenueShareService extends events_1.EventEmitter {
    config;
    calculator;
    transactions = new Map();
    developerLifetimeRevenue = new Map();
    stats;
    constructor(config) {
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
        logger_js_1.default.info({
            developerShare: `${this.config.developerSharePercent}%`,
            platformShare: `${this.config.platformSharePercent}%`,
            enableVolumeTiers: this.config.enableVolumeTiers,
        }, 'RevenueShareService initialized');
    }
    /**
     * Record a new transaction
     */
    async recordTransaction(pluginId, developerId, tenantId, type, pricingModel, grossAmountCents, metadata = {}) {
        // Get developer's lifetime revenue for tier calculation
        const lifetimeRevenue = this.developerLifetimeRevenue.get(developerId) || 0;
        // Calculate revenue split
        const split = this.calculator.calculate(grossAmountCents, developerId, lifetimeRevenue);
        const transaction = {
            id: (0, uuid_1.v4)(),
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
        logger_js_1.default.info({
            transactionId: transaction.id,
            pluginId,
            developerId,
            grossAmount: `$${(grossAmountCents / 100).toFixed(2)}`,
            developerShare: `$${(split.developerShareCents / 100).toFixed(2)} (${split.sharePercent}%)`,
            platformShare: `$${(split.platformShareCents / 100).toFixed(2)}`,
        }, 'Transaction recorded');
        return (0, data_envelope_js_1.createDataEnvelope)(transaction, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Transaction recorded'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Complete a transaction
     */
    async completeTransaction(transactionId, stripePaymentIntentId) {
        const transaction = this.findTransaction(transactionId);
        if (!transaction) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'RevenueShareService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Transaction not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
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
            this.developerLifetimeRevenue.set(transaction.developerId, current + transaction.grossAmountCents);
        }
        this.emit('transaction:completed', transaction);
        logger_js_1.default.info({ transactionId, developerId: transaction.developerId }, 'Transaction completed');
        return (0, data_envelope_js_1.createDataEnvelope)(transaction, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Transaction completed'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Process a refund
     */
    async processRefund(originalTransactionId, refundAmountCents) {
        const original = this.findTransaction(originalTransactionId);
        if (!original) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'RevenueShareService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Original transaction not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (original.status === 'refunded') {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'RevenueShareService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Transaction already refunded'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const refundAmount = refundAmountCents || original.grossAmountCents;
        const refundRatio = refundAmount / original.grossAmountCents;
        // Create refund transaction (negative values)
        const refundTransaction = {
            id: (0, uuid_1.v4)(),
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
        this.developerLifetimeRevenue.set(original.developerId, Math.max(0, current - refundAmount));
        // Update refund rate
        this.updateRefundRate();
        this.emit('transaction:refunded', { original, refund: refundTransaction });
        logger_js_1.default.info({
            refundId: refundTransaction.id,
            originalId: originalTransactionId,
            refundAmount: `$${(refundAmount / 100).toFixed(2)}`,
        }, 'Refund processed');
        return (0, data_envelope_js_1.createDataEnvelope)(refundTransaction, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Refund processed'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get developer earnings for a period
     */
    getDeveloperEarnings(developerId, startDate, endDate) {
        const transactions = (this.transactions.get(developerId) || [])
            .filter(t => {
            const txDate = new Date(t.createdAt);
            return txDate >= startDate && txDate <= endDate && t.status === 'completed';
        });
        // Aggregate by plugin
        const byPlugin = new Map();
        const byModel = {
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
            }
            else {
                plugin.grossRevenueCents += tx.grossAmountCents;
                plugin.developerShareCents += tx.developerShareCents;
                plugin.transactionCount++;
            }
            byPlugin.set(tx.pluginId, plugin);
        }
        // Calculate pending payout
        const pendingPayoutCents = this.calculatePendingPayout(developerId);
        const lifetimeEarningsCents = this.developerLifetimeRevenue.get(developerId) || 0;
        const earnings = {
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
        return (0, data_envelope_js_1.createDataEnvelope)(earnings, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Earnings calculated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Generate revenue report
     */
    generateReport(reportType, startDate, endDate) {
        // Collect all transactions in period
        const allTransactions = [];
        const developerSet = new Set();
        const pluginSet = new Set();
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
        const byModel = {
            free: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
            one_time: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
            subscription: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
            usage_based: { grossRevenueCents: 0, transactionCount: 0, averageTransactionCents: 0, developerShareCents: 0, platformShareCents: 0 },
        };
        const pluginRevenue = new Map();
        const developerRevenue = new Map();
        for (const tx of allTransactions) {
            if (tx.type === 'refund')
                continue;
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
        for (const model of Object.keys(byModel)) {
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
        const report = {
            id: (0, uuid_1.v4)(),
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
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Report generated'),
        };
        logger_js_1.default.info({
            reportId: report.id,
            reportType,
            totalGross: `$${(totalGross / 100).toFixed(2)}`,
            transactionCount: report.transactionCount,
        }, 'Revenue report generated');
        return (0, data_envelope_js_1.createDataEnvelope)(report, {
            source: 'RevenueShareService',
            governanceVerdict: report.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get revenue share configuration
     */
    getConfig() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.config }, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Config retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get transactions for a developer
     */
    getTransactions(developerId, limit = 100) {
        const transactions = (this.transactions.get(developerId) || [])
            .slice(-limit)
            .reverse();
        return (0, data_envelope_js_1.createDataEnvelope)(transactions, {
            source: 'RevenueShareService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Transactions retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    findTransaction(transactionId) {
        for (const transactions of this.transactions.values()) {
            const found = transactions.find(t => t.id === transactionId);
            if (found)
                return found;
        }
        return undefined;
    }
    calculatePendingPayout(developerId) {
        const transactions = this.transactions.get(developerId) || [];
        const pendingCutoff = new Date(Date.now() - this.config.payoutFrequencyDays * 24 * 60 * 60 * 1000);
        return transactions
            .filter(t => t.status === 'completed' &&
            new Date(t.completedAt || t.createdAt) > pendingCutoff)
            .reduce((sum, t) => sum + t.netDeveloperCents, 0);
    }
    updateStats(transaction) {
        this.stats.totalTransactions++;
        this.stats.totalGrossRevenueCents += transaction.grossAmountCents;
        this.stats.totalDeveloperPayoutsCents += transaction.developerShareCents;
        this.stats.totalPlatformRevenueCents += transaction.platformShareCents;
        this.stats.averageTransactionCents =
            this.stats.totalGrossRevenueCents / this.stats.totalTransactions;
        this.stats.activeDevelopers = this.transactions.size;
        this.stats.lastTransactionAt = transaction.createdAt;
    }
    updateRefundRate() {
        let total = 0;
        let refunds = 0;
        for (const transactions of this.transactions.values()) {
            for (const tx of transactions) {
                if (tx.status === 'completed')
                    total++;
                if (tx.type === 'refund')
                    refunds++;
            }
        }
        this.stats.refundRate = total > 0 ? refunds / total : 0;
    }
}
exports.RevenueShareService = RevenueShareService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getRevenueShareService(config) {
    if (!instance) {
        instance = new RevenueShareService(config);
    }
    return instance;
}
exports.default = RevenueShareService;
