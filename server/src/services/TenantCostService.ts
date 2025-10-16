/**
 * Maestro Conductor v24.4.0 - Cost-per-Tenant Analytics & Monitoring
 * Epic E20: Cost-Aware Scaling & Tenancy Partitioning
 *
 * Comprehensive cost tracking, analysis, and dashboard services for multi-tenant operations
 * Provides real-time cost monitoring, forecasting, and automated optimization recommendations
 */

import { EventEmitter } from 'events';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';
import { tracer, Span } from '../utils/tracing';
import { DatabaseService } from './DatabaseService';

// Cost tracking configuration
interface TenantCostConfig {
  enabled: boolean;
  trackingIntervalMinutes: number;
  forecastingEnabled: boolean;
  alertThresholds: CostAlertThresholds;
  costCategories: CostCategory[];
  billingCycle: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
}

// Cost alert thresholds
interface CostAlertThresholds {
  dailyBudgetPercentage: number; // Alert when daily costs exceed % of budget
  monthlyBudgetPercentage: number; // Alert when monthly costs exceed % of budget
  suddenSpikeMultiplier: number; // Alert on cost spikes (e.g., 5x normal)
  sustainedIncreasePercentage: number; // Alert on sustained cost increases
}

// Cost category definitions
interface CostCategory {
  name: string;
  description: string;
  unitType: 'compute' | 'storage' | 'network' | 'api_calls' | 'custom';
  ratePerUnit: number;
  currency: string;
  trackingEnabled: boolean;
}

// Tenant cost metrics
interface TenantCostMetrics {
  tenantId: string;
  timestamp: Date;
  period: 'hour' | 'day' | 'week' | 'month';

  // Resource consumption
  computeUnits: number;
  storageGB: number;
  networkGB: number;
  apiCalls: number;

  // Detailed costs by category
  costs: {
    compute: number;
    storage: number;
    network: number;
    apiCalls: number;
    total: number;
  };

  // Additional metrics
  activeUsers: number;
  queries: number;
  dataIngested: number;

  // Efficiency metrics
  costPerUser: number;
  costPerQuery: number;
  costPerGB: number;
}

// Cost forecast data
interface CostForecast {
  tenantId: string;
  forecastPeriod: 'day' | 'week' | 'month';
  confidence: number;

  predicted: {
    cost: number;
    computeUnits: number;
    storageGB: number;
    networkGB: number;
  };

  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
  recommendations: string[];
}

// Tenant budget configuration
interface TenantBudget {
  tenantId: string;
  currency: string;

  budgets: {
    daily: number;
    monthly: number;
    annual?: number;
  };

  alerts: {
    enabled: boolean;
    recipients: string[];
    thresholds: number[]; // [50, 75, 90, 100] percent
  };

  limits: {
    hardLimitEnabled: boolean;
    throttleAtPercentage: number;
    stopAtPercentage: number;
  };
}

// Cost optimization recommendation
interface CostOptimization {
  tenantId: string;
  category: 'compute' | 'storage' | 'network' | 'general';
  priority: 'low' | 'medium' | 'high';

  issue: string;
  recommendation: string;
  estimatedSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';

  metrics: {
    currentCost: number;
    projectedCost: number;
    savingsPercentage: number;
  };
}

export class TenantCostService extends EventEmitter {
  private config: TenantCostConfig;
  private metrics: PrometheusMetrics;
  private db: DatabaseService;
  private costCache: Map<string, TenantCostMetrics[]> = new Map();
  private budgets: Map<string, TenantBudget> = new Map();
  private forecasts: Map<string, CostForecast> = new Map();

  constructor(config: Partial<TenantCostConfig> = {}, db: DatabaseService) {
    super();

    this.config = {
      enabled: true,
      trackingIntervalMinutes: 15,
      forecastingEnabled: true,
      alertThresholds: {
        dailyBudgetPercentage: 80,
        monthlyBudgetPercentage: 85,
        suddenSpikeMultiplier: 3,
        sustainedIncreasePercentage: 50,
      },
      costCategories: this.getDefaultCostCategories(),
      billingCycle: 'hourly',
      retentionDays: 365,
      ...config,
    };

    this.db = db;
    this.metrics = new PrometheusMetrics('tenant_cost_service');

    this.initializeMetrics();
    this.loadTenantBudgets();
    this.startCostTracking();
  }

  private getDefaultCostCategories(): CostCategory[] {
    return [
      {
        name: 'compute',
        description: 'CPU and memory usage',
        unitType: 'compute',
        ratePerUnit: 0.001, // $0.001 per compute unit
        currency: 'USD',
        trackingEnabled: true,
      },
      {
        name: 'storage',
        description: 'Data storage costs',
        unitType: 'storage',
        ratePerUnit: 0.0001, // $0.0001 per GB per hour
        currency: 'USD',
        trackingEnabled: true,
      },
      {
        name: 'network',
        description: 'Network bandwidth usage',
        unitType: 'network',
        ratePerUnit: 0.0001, // $0.0001 per GB
        currency: 'USD',
        trackingEnabled: true,
      },
      {
        name: 'api_calls',
        description: 'API request costs',
        unitType: 'api_calls',
        ratePerUnit: 0.00001, // $0.00001 per API call
        currency: 'USD',
        trackingEnabled: true,
      },
    ];
  }

  private initializeMetrics(): void {
    this.metrics.createGauge('tenant_cost_total', 'Total cost per tenant', [
      'tenant_id',
      'period',
    ]);
    this.metrics.createGauge('tenant_cost_compute', 'Compute cost per tenant', [
      'tenant_id',
    ]);
    this.metrics.createGauge('tenant_cost_storage', 'Storage cost per tenant', [
      'tenant_id',
    ]);
    this.metrics.createGauge('tenant_cost_network', 'Network cost per tenant', [
      'tenant_id',
    ]);
    this.metrics.createGauge('tenant_cost_api', 'API cost per tenant', [
      'tenant_id',
    ]);

    this.metrics.createGauge(
      'tenant_budget_remaining',
      'Remaining budget per tenant',
      ['tenant_id', 'period'],
    );
    this.metrics.createGauge(
      'tenant_budget_utilization',
      'Budget utilization percentage',
      ['tenant_id', 'period'],
    );

    this.metrics.createCounter('cost_alerts_sent', 'Cost alerts sent', [
      'tenant_id',
      'type',
    ]);
    this.metrics.createCounter(
      'cost_optimizations_identified',
      'Cost optimization opportunities',
      ['tenant_id', 'category'],
    );

    this.metrics.createHistogram(
      'cost_calculation_duration',
      'Time to calculate costs',
      {
        buckets: [0.01, 0.1, 0.5, 1, 2, 5],
      },
    );
  }

  private async loadTenantBudgets(): Promise<void> {
    try {
      const budgets = await this.db.query(`
        SELECT tenant_id, budget_config 
        FROM tenant_budgets 
        WHERE active = true
      `);

      for (const row of budgets.rows) {
        this.budgets.set(row.tenant_id, JSON.parse(row.budget_config));
      }

      logger.info('Loaded tenant budgets', { count: budgets.rows.length });
    } catch (error) {
      logger.error('Failed to load tenant budgets', { error: error.message });
    }
  }

  private startCostTracking(): void {
    if (!this.config.enabled) {
      logger.info('Tenant cost tracking disabled');
      return;
    }

    // Start periodic cost calculation
    setInterval(
      async () => {
        await this.calculateAllTenantCosts();
      },
      this.config.trackingIntervalMinutes * 60 * 1000,
    );

    // Start daily forecasting
    if (this.config.forecastingEnabled) {
      setInterval(
        async () => {
          await this.generateAllForecasts();
        },
        24 * 60 * 60 * 1000,
      ); // Daily
    }

    logger.info('Tenant cost tracking started', {
      interval: this.config.trackingIntervalMinutes,
      forecastingEnabled: this.config.forecastingEnabled,
    });
  }

  // Public methods for cost tracking
  public async recordResourceUsage(
    tenantId: string,
    usage: {
      computeUnits?: number;
      storageGB?: number;
      networkGB?: number;
      apiCalls?: number;
      activeUsers?: number;
      queries?: number;
      dataIngested?: number;
    },
  ): Promise<void> {
    return tracer.startActiveSpan(
      'tenant_cost_service.record_usage',
      async (span: Span) => {
        span.setAttributes({
          'tenant_cost.tenant_id': tenantId,
          'tenant_cost.compute_units': usage.computeUnits || 0,
          'tenant_cost.api_calls': usage.apiCalls || 0,
        });

        try {
          // Store usage data
          await this.db.query(
            `
          INSERT INTO tenant_resource_usage (
            tenant_id, timestamp, compute_units, storage_gb, 
            network_gb, api_calls, active_users, queries, data_ingested
          ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)
        `,
            [
              tenantId,
              usage.computeUnits || 0,
              usage.storageGB || 0,
              usage.networkGB || 0,
              usage.apiCalls || 0,
              usage.activeUsers || 0,
              usage.queries || 0,
              usage.dataIngested || 0,
            ],
          );

          // Update real-time metrics
          this.updateMetrics(tenantId, usage);
        } catch (error) {
          logger.error('Failed to record resource usage', {
            tenantId,
            error: error.message,
          });
          span.recordException(error as Error);
        }
      },
    );
  }

  private updateMetrics(tenantId: string, usage: any): void {
    const computeCost = (usage.computeUnits || 0) * this.getCostRate('compute');
    const storageCost = (usage.storageGB || 0) * this.getCostRate('storage');
    const networkCost = (usage.networkGB || 0) * this.getCostRate('network');
    const apiCost = (usage.apiCalls || 0) * this.getCostRate('api_calls');

    this.metrics.setGauge('tenant_cost_compute', computeCost, {
      tenant_id: tenantId,
    });
    this.metrics.setGauge('tenant_cost_storage', storageCost, {
      tenant_id: tenantId,
    });
    this.metrics.setGauge('tenant_cost_network', networkCost, {
      tenant_id: tenantId,
    });
    this.metrics.setGauge('tenant_cost_api', apiCost, { tenant_id: tenantId });
  }

  private getCostRate(category: string): number {
    const costCategory = this.config.costCategories.find(
      (c) => c.name === category,
    );
    return costCategory?.ratePerUnit || 0;
  }

  public async calculateTenantCosts(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'hour',
  ): Promise<TenantCostMetrics> {
    return tracer.startActiveSpan(
      'tenant_cost_service.calculate_costs',
      async (span: Span) => {
        const startTime = Date.now();

        try {
          span.setAttributes({
            'tenant_cost.tenant_id': tenantId,
            'tenant_cost.period': period,
          });

          // Get usage data for the period
          const usage = await this.getUsageForPeriod(tenantId, period);

          // Calculate costs by category
          const costs = {
            compute: usage.computeUnits * this.getCostRate('compute'),
            storage: usage.storageGB * this.getCostRate('storage'),
            network: usage.networkGB * this.getCostRate('network'),
            apiCalls: usage.apiCalls * this.getCostRate('api_calls'),
            total: 0,
          };

          costs.total =
            costs.compute + costs.storage + costs.network + costs.apiCalls;

          // Calculate efficiency metrics
          const costPerUser =
            usage.activeUsers > 0 ? costs.total / usage.activeUsers : 0;
          const costPerQuery =
            usage.queries > 0 ? costs.total / usage.queries : 0;
          const costPerGB =
            usage.dataIngested > 0 ? costs.total / usage.dataIngested : 0;

          const metrics: TenantCostMetrics = {
            tenantId,
            timestamp: new Date(),
            period,
            computeUnits: usage.computeUnits,
            storageGB: usage.storageGB,
            networkGB: usage.networkGB,
            apiCalls: usage.apiCalls,
            costs,
            activeUsers: usage.activeUsers,
            queries: usage.queries,
            dataIngested: usage.dataIngested,
            costPerUser,
            costPerQuery,
            costPerGB,
          };

          // Update Prometheus metrics
          this.metrics.setGauge('tenant_cost_total', costs.total, {
            tenant_id: tenantId,
            period,
          });

          // Check budget alerts
          await this.checkBudgetAlerts(tenantId, metrics);

          // Store metrics for caching
          this.cacheCostMetrics(tenantId, metrics);

          const duration = (Date.now() - startTime) / 1000;
          this.metrics.observeHistogram('cost_calculation_duration', duration);

          return metrics;
        } catch (error) {
          logger.error('Failed to calculate tenant costs', {
            tenantId,
            period,
            error: error.message,
          });
          span.recordException(error as Error);
          throw error;
        }
      },
    );
  }

  private async getUsageForPeriod(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month',
  ): Promise<{
    computeUnits: number;
    storageGB: number;
    networkGB: number;
    apiCalls: number;
    activeUsers: number;
    queries: number;
    dataIngested: number;
  }> {
    let interval: string;
    switch (period) {
      case 'hour':
        interval = '1 hour';
        break;
      case 'day':
        interval = '1 day';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
    }

    const result = await this.db.query(
      `
      SELECT 
        COALESCE(SUM(compute_units), 0) as compute_units,
        COALESCE(AVG(storage_gb), 0) as storage_gb,
        COALESCE(SUM(network_gb), 0) as network_gb,
        COALESCE(SUM(api_calls), 0) as api_calls,
        COALESCE(AVG(active_users), 0) as active_users,
        COALESCE(SUM(queries), 0) as queries,
        COALESCE(SUM(data_ingested), 0) as data_ingested
      FROM tenant_resource_usage
      WHERE tenant_id = $1 
      AND timestamp >= NOW() - INTERVAL '${interval}'
    `,
      [tenantId],
    );

    return (
      result.rows[0] || {
        computeUnits: 0,
        storageGB: 0,
        networkGB: 0,
        apiCalls: 0,
        activeUsers: 0,
        queries: 0,
        dataIngested: 0,
      }
    );
  }

  private cacheCostMetrics(tenantId: string, metrics: TenantCostMetrics): void {
    const cached = this.costCache.get(tenantId) || [];
    cached.push(metrics);

    // Keep only recent metrics (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = cached.filter((m) => m.timestamp > cutoff);

    this.costCache.set(tenantId, recent);
  }

  private async checkBudgetAlerts(
    tenantId: string,
    metrics: TenantCostMetrics,
  ): Promise<void> {
    const budget = this.budgets.get(tenantId);
    if (!budget || !budget.alerts.enabled) return;

    const dailyCosts = await this.getDailyCosts(tenantId);
    const monthlyCosts = await this.getMonthlyCosts(tenantId);

    // Check daily budget
    if (budget.budgets.daily > 0) {
      const dailyUtilization = (dailyCosts / budget.budgets.daily) * 100;
      this.metrics.setGauge('tenant_budget_utilization', dailyUtilization, {
        tenant_id: tenantId,
        period: 'daily',
      });

      for (const threshold of budget.alerts.thresholds) {
        if (dailyUtilization >= threshold) {
          await this.sendBudgetAlert(
            tenantId,
            'daily',
            dailyUtilization,
            threshold,
            budget,
          );
        }
      }
    }

    // Check monthly budget
    if (budget.budgets.monthly > 0) {
      const monthlyUtilization = (monthlyCosts / budget.budgets.monthly) * 100;
      this.metrics.setGauge('tenant_budget_utilization', monthlyUtilization, {
        tenant_id: tenantId,
        period: 'monthly',
      });

      for (const threshold of budget.alerts.thresholds) {
        if (monthlyUtilization >= threshold) {
          await this.sendBudgetAlert(
            tenantId,
            'monthly',
            monthlyUtilization,
            threshold,
            budget,
          );
        }
      }
    }

    // Check for sudden spikes
    await this.checkCostSpikes(tenantId, metrics);
  }

  private async getDailyCosts(tenantId: string): Promise<number> {
    const metrics = await this.calculateTenantCosts(tenantId, 'day');
    return metrics.costs.total;
  }

  private async getMonthlyCosts(tenantId: string): Promise<number> {
    const metrics = await this.calculateTenantCosts(tenantId, 'month');
    return metrics.costs.total;
  }

  private async sendBudgetAlert(
    tenantId: string,
    period: string,
    utilization: number,
    threshold: number,
    budget: TenantBudget,
  ): Promise<void> {
    const alertKey = `budget_${tenantId}_${period}_${threshold}`;

    // Avoid duplicate alerts (use rate limiting)
    const lastAlert = await this.getLastAlert(alertKey);
    if (lastAlert && Date.now() - lastAlert < 60 * 60 * 1000) {
      // 1 hour
      return;
    }

    logger.warn('Budget threshold exceeded', {
      tenantId,
      period,
      utilization,
      threshold,
      budget:
        period === 'daily' ? budget.budgets.daily : budget.budgets.monthly,
    });

    this.metrics.incrementCounter('cost_alerts_sent', {
      tenant_id: tenantId,
      type: 'budget_threshold',
    });

    // Emit event for alert handlers
    this.emit('budgetAlert', {
      tenantId,
      period,
      utilization,
      threshold,
      budget,
      recipients: budget.alerts.recipients,
    });

    // Store alert timestamp
    await this.recordAlert(alertKey);
  }

  private async checkCostSpikes(
    tenantId: string,
    currentMetrics: TenantCostMetrics,
  ): Promise<void> {
    const cached = this.costCache.get(tenantId) || [];
    if (cached.length < 3) return; // Need history for comparison

    const recentCosts = cached.slice(-3).map((m) => m.costs.total);
    const averageRecent =
      recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
    const currentCost = currentMetrics.costs.total;

    if (
      currentCost >
      averageRecent * this.config.alertThresholds.suddenSpikeMultiplier
    ) {
      logger.warn('Cost spike detected', {
        tenantId,
        currentCost,
        averageRecent,
        spikeMultiplier: currentCost / averageRecent,
      });

      this.emit('costSpike', {
        tenantId,
        currentCost,
        averageRecent,
        spikeMultiplier: currentCost / averageRecent,
        metrics: currentMetrics,
      });

      this.metrics.incrementCounter('cost_alerts_sent', {
        tenant_id: tenantId,
        type: 'cost_spike',
      });
    }
  }

  private async getLastAlert(alertKey: string): Promise<number | null> {
    try {
      const result = await this.db.query(
        'SELECT timestamp FROM cost_alerts WHERE alert_key = $1 ORDER BY timestamp DESC LIMIT 1',
        [alertKey],
      );
      return result.rows[0]?.timestamp.getTime() || null;
    } catch (error) {
      return null;
    }
  }

  private async recordAlert(alertKey: string): Promise<void> {
    try {
      await this.db.query(
        'INSERT INTO cost_alerts (alert_key, timestamp) VALUES ($1, NOW())',
        [alertKey],
      );
    } catch (error) {
      logger.error('Failed to record alert', {
        alertKey,
        error: error.message,
      });
    }
  }

  // Forecasting methods
  public async generateCostForecast(tenantId: string): Promise<CostForecast> {
    return tracer.startActiveSpan(
      'tenant_cost_service.generate_forecast',
      async (span: Span) => {
        try {
          // Get historical data
          const historicalData = await this.getHistoricalCosts(tenantId, 30); // 30 days

          if (historicalData.length < 7) {
            throw new Error('Insufficient historical data for forecasting');
          }

          // Simple linear regression for trend analysis
          const { slope, trend } = this.analyzetrend(historicalData);

          // Predict next day, week, month
          const lastCost = historicalData[historicalData.length - 1];
          const dayPrediction = this.predictCost(lastCost, slope, 1);
          const weekPrediction = this.predictCost(lastCost, slope, 7);
          const monthPrediction = this.predictCost(lastCost, slope, 30);

          const forecast: CostForecast = {
            tenantId,
            forecastPeriod: 'day',
            confidence: this.calculateConfidence(historicalData, slope),
            predicted: {
              cost: dayPrediction.total,
              computeUnits: dayPrediction.compute / this.getCostRate('compute'),
              storageGB: dayPrediction.storage / this.getCostRate('storage'),
              networkGB: dayPrediction.network / this.getCostRate('network'),
            },
            trend,
            factors: this.identifyTrendFactors(historicalData),
            recommendations: await this.generateRecommendations(
              tenantId,
              trend,
              dayPrediction,
            ),
          };

          this.forecasts.set(tenantId, forecast);
          return forecast;
        } catch (error) {
          logger.error('Failed to generate cost forecast', {
            tenantId,
            error: error.message,
          });
          throw error;
        }
      },
    );
  }

  private async getHistoricalCosts(
    tenantId: string,
    days: number,
  ): Promise<TenantCostMetrics[]> {
    // This would typically query stored historical cost data
    // For now, use cached data or calculate from usage
    const cached = this.costCache.get(tenantId) || [];
    return cached.slice(-days);
  }

  private analyzetrend(data: TenantCostMetrics[]): {
    slope: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (data.length < 2) return { slope: 0, trend: 'stable' };

    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map((d) => d.costs.total);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) trend = 'stable';
    else if (slope > 0) trend = 'increasing';
    else trend = 'decreasing';

    return { slope, trend };
  }

  private predictCost(
    baseCost: TenantCostMetrics,
    slope: number,
    days: number,
  ): any {
    const factor = 1 + slope * days;
    return {
      total: baseCost.costs.total * factor,
      compute: baseCost.costs.compute * factor,
      storage: baseCost.costs.storage * factor,
      network: baseCost.costs.network * factor,
      apiCalls: baseCost.costs.apiCalls * factor,
    };
  }

  private calculateConfidence(
    data: TenantCostMetrics[],
    slope: number,
  ): number {
    if (data.length < 3) return 0.5;

    // Calculate R-squared for confidence
    const yActual = data.map((d) => d.costs.total);
    const yMean = yActual.reduce((a, b) => a + b, 0) / yActual.length;
    const yPredicted = data.map((_, i) => data[0].costs.total + slope * i);

    const ssRes = yActual.reduce(
      (sum, actual, i) => sum + Math.pow(actual - yPredicted[i], 2),
      0,
    );
    const ssTot = yActual.reduce(
      (sum, actual) => sum + Math.pow(actual - yMean, 2),
      0,
    );

    const rSquared = 1 - ssRes / ssTot;
    return Math.max(0, Math.min(1, rSquared));
  }

  private identifyTrendFactors(data: TenantCostMetrics[]): string[] {
    const factors: string[] = [];

    // Analyze which components are driving cost changes
    if (data.length >= 2) {
      const recent = data[data.length - 1];
      const previous = data[data.length - 2];

      const computeChange =
        (recent.costs.compute - previous.costs.compute) /
        previous.costs.compute;
      const storageChange =
        (recent.costs.storage - previous.costs.storage) /
        previous.costs.storage;
      const networkChange =
        (recent.costs.network - previous.costs.network) /
        previous.costs.network;

      if (computeChange > 0.1) factors.push('Increasing compute usage');
      if (storageChange > 0.1) factors.push('Growing storage requirements');
      if (networkChange > 0.1) factors.push('Higher network traffic');
    }

    return factors;
  }

  private async generateRecommendations(
    tenantId: string,
    trend: string,
    prediction: any,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push(
        'Consider implementing resource optimization strategies',
      );
      recommendations.push('Review query patterns for efficiency improvements');
      recommendations.push('Evaluate storage archival policies');
    }

    // Add tenant-specific recommendations based on usage patterns
    const metrics = await this.calculateTenantCosts(tenantId, 'day');

    if (metrics.costPerUser > 1.0) {
      recommendations.push(
        'Cost per user is high - consider user experience optimization',
      );
    }

    if (metrics.costs.storage > metrics.costs.compute * 2) {
      recommendations.push(
        'Storage costs dominate - implement data lifecycle management',
      );
    }

    return recommendations;
  }

  // Public API methods
  public async getTenantCostDashboard(tenantId: string): Promise<{
    current: TenantCostMetrics;
    budget: TenantBudget | null;
    forecast: CostForecast | null;
    optimizations: CostOptimization[];
    trends: {
      daily: TenantCostMetrics[];
      weekly: TenantCostMetrics[];
      monthly: TenantCostMetrics[];
    };
  }> {
    const current = await this.calculateTenantCosts(tenantId, 'hour');
    const budget = this.budgets.get(tenantId) || null;
    const forecast = this.forecasts.get(tenantId) || null;
    const optimizations = await this.identifyOptimizations(tenantId);

    // Get trend data
    const dailyTrends = await this.getTrendData(tenantId, 'day', 7);
    const weeklyTrends = await this.getTrendData(tenantId, 'week', 4);
    const monthlyTrends = await this.getTrendData(tenantId, 'month', 12);

    return {
      current,
      budget,
      forecast,
      optimizations,
      trends: {
        daily: dailyTrends,
        weekly: weeklyTrends,
        monthly: monthlyTrends,
      },
    };
  }

  private async identifyOptimizations(
    tenantId: string,
  ): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];
    const metrics = await this.calculateTenantCosts(tenantId, 'day');

    // Storage optimization
    if (metrics.costs.storage > metrics.costs.total * 0.4) {
      optimizations.push({
        tenantId,
        category: 'storage',
        priority: 'high',
        issue: 'Storage costs are disproportionately high',
        recommendation: 'Implement data archival and compression strategies',
        estimatedSavings: metrics.costs.storage * 0.3,
        implementationEffort: 'medium',
        metrics: {
          currentCost: metrics.costs.storage,
          projectedCost: metrics.costs.storage * 0.7,
          savingsPercentage: 30,
        },
      });

      this.metrics.incrementCounter('cost_optimizations_identified', {
        tenant_id: tenantId,
        category: 'storage',
      });
    }

    // Compute optimization
    if (metrics.costPerQuery > 0.01) {
      optimizations.push({
        tenantId,
        category: 'compute',
        priority: 'medium',
        issue: 'High cost per query indicates inefficient processing',
        recommendation: 'Optimize query patterns and add caching layers',
        estimatedSavings: metrics.costs.compute * 0.2,
        implementationEffort: 'high',
        metrics: {
          currentCost: metrics.costs.compute,
          projectedCost: metrics.costs.compute * 0.8,
          savingsPercentage: 20,
        },
      });

      this.metrics.incrementCounter('cost_optimizations_identified', {
        tenant_id: tenantId,
        category: 'compute',
      });
    }

    return optimizations;
  }

  private async getTrendData(
    tenantId: string,
    period: 'day' | 'week' | 'month',
    count: number,
  ): Promise<TenantCostMetrics[]> {
    // This would query historical cost data
    // For now, return cached data or calculate from usage data
    const trends: TenantCostMetrics[] = [];

    for (let i = count - 1; i >= 0; i--) {
      try {
        const metrics = await this.calculateTenantCosts(tenantId, period);
        trends.push(metrics);
      } catch (error) {
        logger.warn('Failed to get trend data point', { tenantId, period, i });
      }
    }

    return trends;
  }

  private async calculateAllTenantCosts(): Promise<void> {
    try {
      // Get all active tenants
      const tenants = await this.db.query(
        "SELECT DISTINCT tenant_id FROM tenant_resource_usage WHERE timestamp >= NOW() - INTERVAL '1 day'",
      );

      for (const row of tenants.rows) {
        try {
          await this.calculateTenantCosts(row.tenant_id);
        } catch (error) {
          logger.error('Failed to calculate costs for tenant', {
            tenantId: row.tenant_id,
            error: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to calculate all tenant costs', {
        error: error.message,
      });
    }
  }

  private async generateAllForecasts(): Promise<void> {
    try {
      for (const tenantId of this.budgets.keys()) {
        try {
          await this.generateCostForecast(tenantId);
        } catch (error) {
          logger.error('Failed to generate forecast for tenant', {
            tenantId,
            error: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to generate all forecasts', {
        error: error.message,
      });
    }
  }

  // Admin methods
  public async setBudget(
    tenantId: string,
    budget: TenantBudget,
  ): Promise<void> {
    this.budgets.set(tenantId, budget);

    try {
      await this.db.query(
        `
        INSERT INTO tenant_budgets (tenant_id, budget_config, active, updated_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
        budget_config = $2, updated_at = NOW()
      `,
        [tenantId, JSON.stringify(budget)],
      );

      logger.info('Updated tenant budget', { tenantId });
    } catch (error) {
      logger.error('Failed to save budget', { tenantId, error: error.message });
    }
  }

  public getCachedCosts(tenantId: string): TenantCostMetrics[] {
    return this.costCache.get(tenantId) || [];
  }

  public recordDoclingCost(
    tenantId: string,
    amountUsd: number,
    metadata: { requestId: string; operation: string },
  ): void {
    if (!this.config.enabled) return;
    this.emit('doclingCost', { tenantId, amountUsd, metadata });
    logger.info('Recorded docling cost', { tenantId, amountUsd, metadata });
  }

  public getCostCategories(): CostCategory[] {
    return this.config.costCategories;
  }

  public updateCostRates(rates: Partial<Record<string, number>>): void {
    for (const [category, rate] of Object.entries(rates)) {
      const costCategory = this.config.costCategories.find(
        (c) => c.name === category,
      );
      if (costCategory) {
        costCategory.ratePerUnit = rate;
        logger.info('Updated cost rate', { category, rate });
      }
    }
  }
}

// Export singleton instance
export const tenantCostService = new TenantCostService(
  {
    enabled: process.env.COST_TRACKING_ENABLED !== 'false',
    trackingIntervalMinutes: parseInt(
      process.env.COST_TRACKING_INTERVAL || '15',
    ),
    forecastingEnabled: process.env.COST_FORECASTING_ENABLED !== 'false',
    billingCycle: (process.env.COST_BILLING_CYCLE as any) || 'hourly',
    retentionDays: parseInt(process.env.COST_RETENTION_DAYS || '365'),
  },
  new DatabaseService(),
);
