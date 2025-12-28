/**
 * Marketplace Module
 *
 * Plugin marketplace infrastructure with 70/30 revenue sharing,
 * Stripe Connect payouts, and usage-based billing.
 *
 * SOC 2 Controls: CC6.7 (Financial Processing), CC7.1 (Billing Operations)
 *
 * @module marketplace
 */

export {
  RevenueShareService,
  getRevenueShareService,
  type PricingModel,
  type TransactionType,
  type TransactionStatus,
  type RevenueShareConfig,
  type VolumeTier,
  type Transaction,
  type DeveloperEarnings,
  type PluginEarnings,
  type RevenueReport,
  type RevenueBreakdown,
  type RevenueShareStats,
} from './RevenueShareService.js';

export {
  PayoutService,
  getPayoutService,
  type PayoutStatus,
  type PayoutMethod,
  type Payout,
  type DeveloperPayoutAccount,
  type PayoutSchedule,
  type BankAccountInfo,
  type PayoutBatch,
  type PayoutStatement,
  type StatementTransaction,
  type StatementPayout,
  type PayoutConfig,
  type PayoutStats,
} from './PayoutService.js';

export {
  UsageTrackingService,
  getUsageTrackingService,
  type UsageMetricType,
  type AggregationPeriod,
  type UsageEvent,
  type UsageRecord,
  type AggregatedMetric,
  type UsagePricingTier,
  type PricingTier,
  type PluginUsageConfig,
  type IncludedQuota,
  type UsageSummary,
  type MetricSummary,
  type QuotaStatus,
  type UsageAlert,
  type UsageTrackingConfig,
  type UsageTrackingStats,
} from './UsageTrackingService.js';
