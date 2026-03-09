/**
 * @fileoverview Usage Tracking and Billing Integration
 * Comprehensive usage monitoring, billing calculation, and subscription management
 * with support for multiple billing models and real-time usage tracking.
 */

import { EventEmitter } from 'events';
import {
  TenantManager,
  ResourceUsage,
  TenantConfig,
} from '../core/TenantManager.js';

/**
 * Billing model types supported
 */
export type BillingModel =
  | 'subscription'
  | 'usage_based'
  | 'hybrid'
  | 'enterprise_contract';

/**
 * Usage-based billing metrics
 */
export interface UsageBillingMetrics {
  nodesProcessed: number;
  edgesTraversed: number;
  queriesExecuted: number;
  analysisMinutes: number;
  storageGB: number;
  apiCalls: number;
  bandwidthGB: number;
  collaborativeMinutes: number;
  aiInsightRequests: number;
}

/**
 * Billing configuration per tenant
 */
export interface BillingConfig {
  tenantId: string;
  model: BillingModel;
  subscription?: {
    planId: string;
    planName: string;
    monthlyCost: number;
    billingCycle: 'monthly' | 'quarterly' | 'annual';
    nextBillingDate: Date;
    autoRenew: boolean;
  };
  usageBased?: {
    rates: UsageBillingRates;
    includedQuotas: UsageBillingMetrics;
    overageCharges: boolean;
  };
  hybrid?: {
    baseCost: number;
    usageRates: UsageBillingRates;
  };
  enterprise?: {
    contractId: string;
    contractStart: Date;
    contractEnd: Date;
    fixedCost: number;
    customRates?: Partial<UsageBillingRates>;
  };
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  taxConfiguration: TaxConfig;
  credits: number; // Available credits/prepaid balance
}

/**
 * Usage-based billing rates
 */
export interface UsageBillingRates {
  perNode: number;
  perEdge: number;
  perQuery: number;
  perAnalysisMinute: number;
  perStorageGB: number;
  perApiCall: number;
  perBandwidthGB: number;
  perCollaborativeMinute: number;
  perAiInsightRequest: number;
}

/**
 * Payment method information
 */
export interface PaymentMethod {
  type: 'credit_card' | 'ach' | 'wire' | 'invoice' | 'enterprise_contract';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingEmail: string;
}

/**
 * Billing address
 */
export interface BillingAddress {
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  vatNumber?: string;
}

/**
 * Tax configuration
 */
export interface TaxConfig {
  exempt: boolean;
  exemptionCertificate?: string;
  taxRate: number;
  taxAuthority: string;
  reverseCharge: boolean; // For EU B2B transactions
}

/**
 * Billing invoice
 */
export interface BillingInvoice {
  invoiceId: string;
  tenantId: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  issued: Date;
  due: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxes: number;
  total: number;
  credits: number;
  amountDue: number;
  currency: string;
  metadata: Record<string, any>;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  description: string;
  category: 'subscription' | 'usage' | 'overage' | 'setup' | 'support';
  quantity: number;
  unitPrice: number;
  total: number;
  period?: {
    start: Date;
    end: Date;
  };
  metadata: Record<string, any>;
}

/**
 * Usage aggregation for billing periods
 */
export interface UsageAggregation {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: UsageBillingMetrics;
  costs: {
    subscription: number;
    usage: number;
    overages: number;
    total: number;
  };
  quotasExceeded: string[];
}

/**
 * Comprehensive usage tracking and billing system
 */
export class UsageTracker extends EventEmitter {
  private billingConfigs: Map<string, BillingConfig> = new Map();
  private usageAggregations: Map<string, UsageAggregation[]> = new Map();
  private pendingCharges: Map<string, number> = new Map();
  private invoices: Map<string, BillingInvoice[]> = new Map();

  constructor(
    private tenantManager: TenantManager,
    private config: {
      billingCycle: 'daily' | 'weekly' | 'monthly';
      aggregationInterval: number; // minutes
      overage_notifications: boolean;
      auto_suspend_on_overdue: boolean;
      credit_threshold_warning: number; // warn when credits below this
    },
  ) {
    super();
    this.startUsageAggregation();
    this.startBillingCycle();
    this.monitorUsageThresholds();
  }

  /**
   * Set up billing configuration for tenant
   */
  async setupBillingConfig(
    tenantId: string,
    config: Omit<BillingConfig, 'tenantId'>,
  ): Promise<BillingConfig> {
    const billingConfig: BillingConfig = {
      tenantId,
      ...config,
    };

    // Validate billing configuration
    await this.validateBillingConfig(billingConfig);

    // Store configuration
    this.billingConfigs.set(tenantId, billingConfig);

    // Initialize usage tracking
    this.initializeUsageTracking(tenantId);

    this.emit('billing:configured', { tenantId, config: billingConfig });

    return billingConfig;
  }

  /**
   * Track real-time usage event
   */
  async trackUsage(
    tenantId: string,
    usageType: keyof UsageBillingMetrics,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const tenant = await this.tenantManager.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig) {
      throw new Error(
        `Billing configuration not found for tenant: ${tenantId}`,
      );
    }

    // Check if usage would exceed limits
    const currentUsage = await this.getCurrentPeriodUsage(tenantId);
    const newUsage = { ...currentUsage.metrics };
    newUsage[usageType] += amount;

    // Validate against quotas and limits
    await this.validateUsageAgainstQuotas(tenantId, usageType, amount);

    // Record usage
    await this.recordUsageEvent(tenantId, usageType, amount, metadata);

    // Calculate incremental cost
    const incrementalCost = await this.calculateIncrementalCost(
      tenantId,
      usageType,
      amount,
    );

    // Update pending charges
    const currentCharges = this.pendingCharges.get(tenantId) || 0;
    this.pendingCharges.set(tenantId, currentCharges + incrementalCost);

    this.emit('usage:tracked', {
      tenantId,
      usageType,
      amount,
      cost: incrementalCost,
      timestamp: new Date(),
      metadata,
    });

    // Check for threshold violations
    await this.checkUsageThresholds(tenantId, newUsage);
  }

  /**
   * Get current billing period usage for tenant
   */
  async getCurrentPeriodUsage(tenantId: string): Promise<UsageAggregation> {
    const aggregations = this.usageAggregations.get(tenantId) || [];
    const currentPeriod = this.getCurrentBillingPeriod();

    // Find current period aggregation
    let currentAggregation = aggregations.find(
      (agg) =>
        agg.period.start <= currentPeriod.start &&
        agg.period.end >= currentPeriod.end,
    );

    if (!currentAggregation) {
      // Create new aggregation for current period
      currentAggregation = {
        tenantId,
        period: currentPeriod,
        metrics: {
          nodesProcessed: 0,
          edgesTraversed: 0,
          queriesExecuted: 0,
          analysisMinutes: 0,
          storageGB: 0,
          apiCalls: 0,
          bandwidthGB: 0,
          collaborativeMinutes: 0,
          aiInsightRequests: 0,
        },
        costs: {
          subscription: 0,
          usage: 0,
          overages: 0,
          total: 0,
        },
        quotasExceeded: [],
      };

      aggregations.push(currentAggregation);
      this.usageAggregations.set(tenantId, aggregations);
    }

    return currentAggregation;
  }

  /**
   * Generate invoice for tenant billing period
   */
  async generateInvoice(
    tenantId: string,
    billingPeriod?: { start: Date; end: Date },
  ): Promise<BillingInvoice> {
    const tenant = await this.tenantManager.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig) {
      throw new Error(`Billing configuration not found: ${tenantId}`);
    }

    const period = billingPeriod || this.getPreviousBillingPeriod();
    const usage = await this.getUsageForPeriod(tenantId, period);

    // Generate line items
    const lineItems = await this.generateInvoiceLineItems(
      tenantId,
      usage,
      billingConfig,
    );

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxes = this.calculateTaxes(subtotal, billingConfig.taxConfiguration);
    const total = subtotal + taxes;

    // Apply credits
    const availableCredits = billingConfig.credits;
    const creditsApplied = Math.min(availableCredits, total);
    const amountDue = total - creditsApplied;

    const invoice: BillingInvoice = {
      invoiceId: this.generateInvoiceId(tenantId),
      tenantId,
      billingPeriod: period,
      issued: new Date(),
      due: this.calculateDueDate(billingConfig),
      status: 'draft',
      lineItems,
      subtotal,
      taxes,
      total,
      credits: creditsApplied,
      amountDue,
      currency: 'USD',
      metadata: {
        tenantName: tenant.name,
        billingModel: billingConfig.model,
      },
    };

    // Store invoice
    const tenantInvoices = this.invoices.get(tenantId) || [];
    tenantInvoices.push(invoice);
    this.invoices.set(tenantId, tenantInvoices);

    // Update credits if applied
    if (creditsApplied > 0) {
      billingConfig.credits -= creditsApplied;
      this.billingConfigs.set(tenantId, billingConfig);
    }

    this.emit('invoice:generated', { tenantId, invoice });

    return invoice;
  }

  /**
   * Process payment for invoice
   */
  async processPayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    paymentReference?: string,
  ): Promise<boolean> {
    const tenantInvoices = this.invoices.get(tenantId) || [];
    const invoice = tenantInvoices.find((inv) => inv.invoiceId === invoiceId);

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice already paid');
    }

    // In real implementation, would process payment through payment gateway
    const paymentSuccessful = await this.processPaymentGateway(
      tenantId,
      amount,
      paymentReference,
    );

    if (paymentSuccessful) {
      invoice.status = 'paid';
      invoice.metadata.paymentReference = paymentReference;
      invoice.metadata.paidDate = new Date();

      this.emit('payment:processed', {
        tenantId,
        invoiceId,
        amount,
        timestamp: new Date(),
      });

      // Clear pending charges
      this.pendingCharges.delete(tenantId);

      return true;
    }

    return false;
  }

  /**
   * Add credits to tenant account
   */
  async addCredits(
    tenantId: string,
    amount: number,
    reason?: string,
  ): Promise<void> {
    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig) {
      throw new Error(`Billing configuration not found: ${tenantId}`);
    }

    billingConfig.credits += amount;
    this.billingConfigs.set(tenantId, billingConfig);

    this.emit('credits:added', {
      tenantId,
      amount,
      reason,
      newBalance: billingConfig.credits,
      timestamp: new Date(),
    });
  }

  /**
   * Get billing summary for tenant
   */
  async getBillingSummary(tenantId: string): Promise<{
    currentUsage: UsageAggregation;
    pendingCharges: number;
    availableCredits: number;
    recentInvoices: BillingInvoice[];
    quotaUtilization: Record<string, number>;
  }> {
    const currentUsage = await this.getCurrentPeriodUsage(tenantId);
    const pendingCharges = this.pendingCharges.get(tenantId) || 0;

    const billingConfig = this.billingConfigs.get(tenantId);
    const availableCredits = billingConfig?.credits || 0;

    const tenantInvoices = this.invoices.get(tenantId) || [];
    const recentInvoices = tenantInvoices
      .sort((a, b) => b.issued.getTime() - a.issued.getTime())
      .slice(0, 5);

    const quotaUtilization = await this.calculateQuotaUtilization(tenantId);

    return {
      currentUsage,
      pendingCharges,
      availableCredits,
      recentInvoices,
      quotaUtilization,
    };
  }

  /**
   * Validate billing configuration
   */
  private async validateBillingConfig(config: BillingConfig): Promise<void> {
    // Validate payment method
    if (!config.paymentMethod.billingEmail) {
      throw new Error('Billing email is required');
    }

    // Validate billing address
    if (
      !config.billingAddress.addressLine1 ||
      !config.billingAddress.city ||
      !config.billingAddress.country
    ) {
      throw new Error('Complete billing address is required');
    }

    // Validate model-specific configuration
    switch (config.model) {
      case 'subscription':
        if (!config.subscription) {
          throw new Error(
            'Subscription configuration required for subscription model',
          );
        }
        break;

      case 'usage_based':
        if (!config.usageBased) {
          throw new Error(
            'Usage-based configuration required for usage-based model',
          );
        }
        break;

      case 'hybrid':
        if (!config.hybrid) {
          throw new Error('Hybrid configuration required for hybrid model');
        }
        break;

      case 'enterprise_contract':
        if (!config.enterprise) {
          throw new Error(
            'Enterprise configuration required for enterprise model',
          );
        }
        break;
    }
  }

  /**
   * Initialize usage tracking for tenant
   */
  private initializeUsageTracking(tenantId: string): void {
    if (!this.usageAggregations.has(tenantId)) {
      this.usageAggregations.set(tenantId, []);
    }

    if (!this.pendingCharges.has(tenantId)) {
      this.pendingCharges.set(tenantId, 0);
    }
  }

  /**
   * Record usage event in aggregation
   */
  private async recordUsageEvent(
    tenantId: string,
    usageType: keyof UsageBillingMetrics,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const currentAggregation = await this.getCurrentPeriodUsage(tenantId);
    currentAggregation.metrics[usageType] += amount;

    // Update aggregation
    const aggregations = this.usageAggregations.get(tenantId) || [];
    const index = aggregations.findIndex(
      (agg) => agg.period.start === currentAggregation.period.start,
    );

    if (index >= 0) {
      aggregations[index] = currentAggregation;
    } else {
      aggregations.push(currentAggregation);
    }

    this.usageAggregations.set(tenantId, aggregations);
  }

  /**
   * Calculate incremental cost for usage
   */
  private async calculateIncrementalCost(
    tenantId: string,
    usageType: keyof UsageBillingMetrics,
    amount: number,
  ): Promise<number> {
    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig) return 0;

    let rate = 0;

    switch (billingConfig.model) {
      case 'usage_based':
        rate = this.getUsageRate(billingConfig.usageBased!.rates, usageType);
        break;

      case 'hybrid':
        rate = this.getUsageRate(billingConfig.hybrid!.usageRates, usageType);
        break;

      case 'enterprise_contract':
        if (billingConfig.enterprise!.customRates) {
          rate = this.getUsageRate(
            billingConfig.enterprise!.customRates as UsageBillingRates,
            usageType,
          );
        }
        break;

      case 'subscription':
        // Check for overages
        if (billingConfig.usageBased?.overageCharges) {
          const currentUsage = await this.getCurrentPeriodUsage(tenantId);
          const quota = this.getUsageQuota(
            billingConfig.usageBased.includedQuotas,
            usageType,
          );
          const currentAmount = currentUsage.metrics[usageType];

          if (currentAmount + amount > quota) {
            const overage = Math.max(0, currentAmount + amount - quota);
            rate = this.getUsageRate(billingConfig.usageBased.rates, usageType);
            return overage * rate;
          }
        }
        break;
    }

    return amount * rate;
  }

  /**
   * Get usage rate for specific metric
   */
  private getUsageRate(
    rates: UsageBillingRates,
    usageType: keyof UsageBillingMetrics,
  ): number {
    const rateMap: Record<keyof UsageBillingMetrics, keyof UsageBillingRates> =
      {
        nodesProcessed: 'perNode',
        edgesTraversed: 'perEdge',
        queriesExecuted: 'perQuery',
        analysisMinutes: 'perAnalysisMinute',
        storageGB: 'perStorageGB',
        apiCalls: 'perApiCall',
        bandwidthGB: 'perBandwidthGB',
        collaborativeMinutes: 'perCollaborativeMinute',
        aiInsightRequests: 'perAiInsightRequest',
      };

    return rates[rateMap[usageType]] || 0;
  }

  /**
   * Get usage quota for specific metric
   */
  private getUsageQuota(
    quotas: UsageBillingMetrics,
    usageType: keyof UsageBillingMetrics,
  ): number {
    return quotas[usageType] || 0;
  }

  /**
   * Validate usage against tenant quotas
   */
  private async validateUsageAgainstQuotas(
    tenantId: string,
    usageType: keyof UsageBillingMetrics,
    amount: number,
  ): Promise<void> {
    const tenant = await this.tenantManager.getTenant(tenantId);
    if (!tenant) return;

    // Check against tenant resource limits first
    const resourceType = this.mapUsageToResourceType(usageType);
    if (resourceType) {
      const canUse = await this.tenantManager.validateResourceUsage(
        tenantId,
        resourceType,
        amount,
      );

      if (!canUse) {
        throw new Error(`Usage would exceed tenant limits for ${usageType}`);
      }
    }

    // Check against billing quotas
    const billingConfig = this.billingConfigs.get(tenantId);
    if (
      billingConfig?.model === 'subscription' &&
      !billingConfig.usageBased?.overageCharges
    ) {
      const currentUsage = await this.getCurrentPeriodUsage(tenantId);
      const quota = this.getUsageQuota(
        billingConfig.usageBased!.includedQuotas,
        usageType,
      );

      if (currentUsage.metrics[usageType] + amount > quota) {
        throw new Error(`Usage would exceed billing quota for ${usageType}`);
      }
    }
  }

  /**
   * Map usage type to resource type for validation
   */
  private mapUsageToResourceType(
    usageType: keyof UsageBillingMetrics,
  ): string | null {
    const mapping: Record<string, string> = {
      nodesProcessed: 'maxNodes',
      queriesExecuted: 'maxQueries',
      apiCalls: 'maxApiCallsPerMinute',
      storageGB: 'maxStorage',
    };

    return mapping[usageType] || null;
  }

  /**
   * Check usage thresholds and send notifications
   */
  private async checkUsageThresholds(
    tenantId: string,
    usage: UsageBillingMetrics,
  ): Promise<void> {
    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig || !this.config.overage_notifications) return;

    if (billingConfig.model === 'subscription' && billingConfig.usageBased) {
      const quotas = billingConfig.usageBased.includedQuotas;

      Object.entries(usage).forEach(([metric, amount]) => {
        const quota = quotas[metric as keyof UsageBillingMetrics];
        if (quota > 0) {
          const utilization = (amount / quota) * 100;

          if (utilization >= 90 && utilization < 100) {
            this.emit('usage:warning', {
              tenantId,
              metric,
              utilization,
              threshold: 90,
            });
          } else if (utilization >= 100) {
            this.emit('usage:exceeded', {
              tenantId,
              metric,
              utilization,
              overage: amount - quota,
            });
          }
        }
      });
    }

    // Check credit balance
    if (billingConfig.credits <= this.config.credit_threshold_warning) {
      this.emit('credits:low', {
        tenantId,
        balance: billingConfig.credits,
        threshold: this.config.credit_threshold_warning,
      });
    }
  }

  /**
   * Start usage aggregation process
   */
  private startUsageAggregation(): void {
    setInterval(
      () => {
        this.aggregateUsage();
      },
      this.config.aggregationInterval * 60 * 1000,
    );
  }

  /**
   * Start billing cycle process
   */
  private startBillingCycle(): void {
    // Check for billing events every hour
    setInterval(
      () => {
        this.processBillingCycle();
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Monitor usage thresholds
   */
  private monitorUsageThresholds(): void {
    setInterval(
      () => {
        this.checkAllTenantThresholds();
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes
  }

  /**
   * Aggregate usage data
   */
  private async aggregateUsage(): Promise<void> {
    for (const [tenantId] of this.billingConfigs) {
      try {
        const currentUsage = await this.getCurrentPeriodUsage(tenantId);
        await this.updateUsageCosts(tenantId, currentUsage);
      } catch (error) {
        console.error(
          `Failed to aggregate usage for tenant ${tenantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Process billing cycle events
   */
  private async processBillingCycle(): Promise<void> {
    const now = new Date();

    for (const [tenantId, config] of this.billingConfigs) {
      try {
        // Check if it's time to generate invoice
        if (config.subscription && config.subscription.nextBillingDate <= now) {
          await this.generateInvoice(tenantId);

          // Update next billing date
          const nextDate = new Date(config.subscription.nextBillingDate);
          switch (config.subscription.billingCycle) {
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
            case 'annual':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
          }

          config.subscription.nextBillingDate = nextDate;
          this.billingConfigs.set(tenantId, config);
        }
      } catch (error) {
        console.error(
          `Failed to process billing cycle for tenant ${tenantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Check usage thresholds for all tenants
   */
  private async checkAllTenantThresholds(): Promise<void> {
    for (const [tenantId] of this.billingConfigs) {
      try {
        const currentUsage = await this.getCurrentPeriodUsage(tenantId);
        await this.checkUsageThresholds(tenantId, currentUsage.metrics);
      } catch (error) {
        console.error(
          `Failed to check thresholds for tenant ${tenantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Update usage costs in aggregation
   */
  private async updateUsageCosts(
    tenantId: string,
    aggregation: UsageAggregation,
  ): Promise<void> {
    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig) return;

    let subscriptionCost = 0;
    let usageCost = 0;
    let overageCost = 0;

    switch (billingConfig.model) {
      case 'subscription':
        subscriptionCost = billingConfig.subscription?.monthlyCost || 0;
        if (billingConfig.usageBased?.overageCharges) {
          overageCost = this.calculateOverageCosts(
            aggregation.metrics,
            billingConfig.usageBased.includedQuotas,
            billingConfig.usageBased.rates,
          );
        }
        break;

      case 'usage_based':
        usageCost = this.calculateUsageCosts(
          aggregation.metrics,
          billingConfig.usageBased!.rates,
        );
        break;

      case 'hybrid':
        subscriptionCost = billingConfig.hybrid!.baseCost;
        usageCost = this.calculateUsageCosts(
          aggregation.metrics,
          billingConfig.hybrid!.usageRates,
        );
        break;

      case 'enterprise_contract':
        subscriptionCost = billingConfig.enterprise!.fixedCost;
        break;
    }

    aggregation.costs = {
      subscription: subscriptionCost,
      usage: usageCost,
      overages: overageCost,
      total: subscriptionCost + usageCost + overageCost,
    };
  }

  /**
   * Calculate overage costs
   */
  private calculateOverageCosts(
    usage: UsageBillingMetrics,
    quotas: UsageBillingMetrics,
    rates: UsageBillingRates,
  ): number {
    let overageCost = 0;

    Object.entries(usage).forEach(([metric, amount]) => {
      const quota = quotas[metric as keyof UsageBillingMetrics];
      if (amount > quota) {
        const overage = amount - quota;
        const rate = this.getUsageRate(
          rates,
          metric as keyof UsageBillingMetrics,
        );
        overageCost += overage * rate;
      }
    });

    return overageCost;
  }

  /**
   * Calculate usage costs
   */
  private calculateUsageCosts(
    usage: UsageBillingMetrics,
    rates: UsageBillingRates,
  ): number {
    let usageCost = 0;

    Object.entries(usage).forEach(([metric, amount]) => {
      const rate = this.getUsageRate(
        rates,
        metric as keyof UsageBillingMetrics,
      );
      usageCost += amount * rate;
    });

    return usageCost;
  }

  /**
   * Generate invoice line items
   */
  private async generateInvoiceLineItems(
    tenantId: string,
    usage: UsageAggregation,
    billingConfig: BillingConfig,
  ): Promise<InvoiceLineItem[]> {
    const lineItems: InvoiceLineItem[] = [];

    // Subscription line item
    if (usage.costs.subscription > 0) {
      lineItems.push({
        description:
          billingConfig.subscription?.planName || 'Subscription Plan',
        category: 'subscription',
        quantity: 1,
        unitPrice: usage.costs.subscription,
        total: usage.costs.subscription,
        period: usage.period,
        metadata: { planId: billingConfig.subscription?.planId },
      });
    }

    // Usage line items
    if (usage.costs.usage > 0) {
      Object.entries(usage.metrics).forEach(([metric, amount]) => {
        if (amount > 0) {
          const rate =
            billingConfig.usageBased?.rates || billingConfig.hybrid?.usageRates;
          if (rate) {
            const unitPrice = this.getUsageRate(
              rate,
              metric as keyof UsageBillingMetrics,
            );
            if (unitPrice > 0) {
              lineItems.push({
                description: this.getMetricDescription(
                  metric as keyof UsageBillingMetrics,
                ),
                category: 'usage',
                quantity: amount,
                unitPrice,
                total: amount * unitPrice,
                period: usage.period,
                metadata: { metric },
              });
            }
          }
        }
      });
    }

    // Overage line items
    if (usage.costs.overages > 0 && billingConfig.usageBased) {
      Object.entries(usage.metrics).forEach(([metric, amount]) => {
        const quota =
          billingConfig.usageBased!.includedQuotas[
            metric as keyof UsageBillingMetrics
          ];
        if (amount > quota) {
          const overage = amount - quota;
          const rate = this.getUsageRate(
            billingConfig.usageBased!.rates,
            metric as keyof UsageBillingMetrics,
          );

          lineItems.push({
            description: `${this.getMetricDescription(metric as keyof UsageBillingMetrics)} - Overage`,
            category: 'overage',
            quantity: overage,
            unitPrice: rate,
            total: overage * rate,
            period: usage.period,
            metadata: { metric, quota, overage },
          });
        }
      });
    }

    return lineItems;
  }

  /**
   * Get human-readable description for metric
   */
  private getMetricDescription(metric: keyof UsageBillingMetrics): string {
    const descriptions = {
      nodesProcessed: 'Nodes Processed',
      edgesTraversed: 'Edges Traversed',
      queriesExecuted: 'Queries Executed',
      analysisMinutes: 'Analysis Minutes',
      storageGB: 'Storage (GB)',
      apiCalls: 'API Calls',
      bandwidthGB: 'Bandwidth (GB)',
      collaborativeMinutes: 'Collaborative Minutes',
      aiInsightRequests: 'AI Insight Requests',
    };

    return descriptions[metric] || metric;
  }

  /**
   * Calculate taxes based on configuration
   */
  private calculateTaxes(subtotal: number, taxConfig: TaxConfig): number {
    if (taxConfig.exempt) return 0;
    return subtotal * (taxConfig.taxRate / 100);
  }

  /**
   * Calculate due date for invoice
   */
  private calculateDueDate(billingConfig: BillingConfig): Date {
    const dueDate = new Date();

    // Standard payment terms based on payment method
    switch (billingConfig.paymentMethod.type) {
      case 'credit_card':
        dueDate.setDate(dueDate.getDate() + 1); // Due immediately
        break;
      case 'ach':
        dueDate.setDate(dueDate.getDate() + 7); // 7 days
        break;
      case 'invoice':
        dueDate.setDate(dueDate.getDate() + 30); // Net 30
        break;
      case 'enterprise_contract':
        dueDate.setDate(dueDate.getDate() + 45); // Net 45
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 15); // Default 15 days
    }

    return dueDate;
  }

  /**
   * Generate unique invoice ID
   */
  private generateInvoiceId(tenantId: string): string {
    const timestamp = Date.now().toString(36);
    const hash = require('crypto')
      .createHash('md5')
      .update(`${tenantId}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);

    return `INV-${hash.toUpperCase()}`;
  }

  /**
   * Get current billing period
   */
  private getCurrentBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return { start, end };
  }

  /**
   * Get previous billing period
   */
  private getPreviousBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get usage for specific period
   */
  private async getUsageForPeriod(
    tenantId: string,
    period: { start: Date; end: Date },
  ): Promise<UsageAggregation> {
    const aggregations = this.usageAggregations.get(tenantId) || [];

    const periodUsage = aggregations.find(
      (agg) =>
        agg.period.start.getTime() === period.start.getTime() &&
        agg.period.end.getTime() === period.end.getTime(),
    );

    if (!periodUsage) {
      throw new Error(
        `No usage data found for period ${period.start} - ${period.end}`,
      );
    }

    return periodUsage;
  }

  /**
   * Calculate quota utilization
   */
  private async calculateQuotaUtilization(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const billingConfig = this.billingConfigs.get(tenantId);
    if (!billingConfig || billingConfig.model !== 'subscription') {
      return {};
    }

    const currentUsage = await this.getCurrentPeriodUsage(tenantId);
    const quotas = billingConfig.usageBased?.includedQuotas;

    if (!quotas) return {};

    const utilization: Record<string, number> = {};

    Object.entries(currentUsage.metrics).forEach(([metric, amount]) => {
      const quota = quotas[metric as keyof UsageBillingMetrics];
      if (quota > 0) {
        utilization[metric] = Math.min(100, (amount / quota) * 100);
      }
    });

    return utilization;
  }

  /**
   * Mock payment gateway processing
   */
  private async processPaymentGateway(
    tenantId: string,
    amount: number,
    paymentReference?: string,
  ): Promise<boolean> {
    // Mock payment processing - in reality would integrate with Stripe, etc.
    console.log(`Processing payment for tenant ${tenantId}: $${amount}`);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate 95% success rate
    return Math.random() > 0.05;
  }
}
