/**
 * Cost Tracking Engine
 *
 * Tracks resource costs across the IntelGraph platform with real-time
 * monitoring, budget alerts, and cost optimization recommendations.
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { MetricsCollector } from '../metrics/collector';

interface CostMetric {
  service: string;
  resource: string;
  category: 'compute' | 'storage' | 'network' | 'database' | 'ai' | 'other';
  cost: number;
  currency: string;
  timestamp: Date;
  metadata: {
    region?: string;
    instanceType?: string;
    usage?: number;
    unit?: string;
    tags?: Record<string, string>;
  };
}

interface CostBudget {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  scope: {
    services?: string[];
    categories?: string[];
    tags?: Record<string, string>;
  };
  alerts: {
    thresholds: number[]; // Percentage thresholds (e.g., [50, 80, 100])
    channels: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CostAlert {
  id: string;
  budgetId: string;
  type: 'threshold' | 'anomaly' | 'forecast';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentSpend: number;
  budgetAmount: number;
  percentage: number;
  timestamp: Date;
  acknowledged: boolean;
}

interface CostOptimization {
  id: string;
  type: 'rightsizing' | 'scheduling' | 'reservation' | 'spot' | 'storage';
  service: string;
  resource: string;
  currentCost: number;
  projectedSavings: number;
  confidence: number;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  metadata: Record<string, any>;
}

export class CostTracker extends EventEmitter {
  private redis: Redis;
  private metricsCollector: MetricsCollector;
  private budgets: Map<string, CostBudget>;
  private optimizations: Map<string, CostOptimization>;
  private samplingRates: Map<string, number>;

  constructor(redis: Redis, metricsCollector: MetricsCollector) {
    super();
    this.redis = redis;
    this.metricsCollector = metricsCollector;
    this.budgets = new Map();
    this.optimizations = new Map();
    this.samplingRates = new Map();

    this.initializeSamplingRates();
    this.startPeriodicTasks();
  }

  // Initialize adaptive sampling rates
  private initializeSamplingRates(): void {
    // High-cost services get higher sampling rates
    this.samplingRates.set('gateway', 1.0); // 100% sampling
    this.samplingRates.set('neo4j', 0.8); // 80% sampling
    this.samplingRates.set('ai-service', 0.9); // 90% sampling
    this.samplingRates.set('er-service', 0.7); // 70% sampling
    this.samplingRates.set('storage', 0.5); // 50% sampling
    this.samplingRates.set('logging', 0.3); // 30% sampling
    this.samplingRates.set('monitoring', 0.2); // 20% sampling
  }

  // Track cost metric with adaptive sampling
  async trackCost(metric: CostMetric): Promise<void> {
    try {
      const samplingRate = this.samplingRates.get(metric.service) || 0.1;

      // Apply sampling
      if (Math.random() > samplingRate) {
        return;
      }

      // Store cost metric
      await this.storeCostMetric(metric);

      // Update real-time aggregates
      await this.updateAggregates(metric);

      // Check budget alerts
      await this.checkBudgetAlerts(metric);

      // Emit event for real-time processing
      this.emit('costMetric', metric);

      logger.debug('Cost metric tracked', {
        service: metric.service,
        resource: metric.resource,
        cost: metric.cost,
        samplingRate
      });

    } catch (error) {
      logger.error('Failed to track cost metric', {
        error: error.message,
        metric,
        stack: error.stack
      });
    }
  }

  // Store cost metric in Redis with TTL
  private async storeCostMetric(metric: CostMetric): Promise<void> {
    const key = `cost:metrics:${metric.service}:${metric.resource}`;
    const timestamp = metric.timestamp.getTime();

    // Store as time series data
    await this.redis.zadd(key, timestamp, JSON.stringify(metric));

    // Set TTL for data retention (30 days)
    await this.redis.expire(key, 30 * 24 * 60 * 60);

    // Store in daily aggregates
    const dailyKey = `cost:daily:${metric.service}:${this.getDayKey(metric.timestamp)}`;
    await this.redis.hincrbyfloat(dailyKey, metric.resource, metric.cost);
    await this.redis.expire(dailyKey, 90 * 24 * 60 * 60); // 90 days retention
  }

  // Update real-time cost aggregates
  private async updateAggregates(metric: CostMetric): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Service totals
    const serviceKey = `cost:service:${metric.service}`;
    pipeline.hincrbyfloat(serviceKey, 'total', metric.cost);
    pipeline.hincrbyfloat(serviceKey, `category:${metric.category}`, metric.cost);
    pipeline.expire(serviceKey, 24 * 60 * 60); // 24 hours

    // Global totals
    const globalKey = 'cost:global';
    pipeline.hincrbyfloat(globalKey, 'total', metric.cost);
    pipeline.hincrbyfloat(globalKey, `service:${metric.service}`, metric.cost);
    pipeline.hincrbyfloat(globalKey, `category:${metric.category}`, metric.cost);
    pipeline.expire(globalKey, 24 * 60 * 60);

    // Hourly totals
    const hourlyKey = `cost:hourly:${this.getHourKey(metric.timestamp)}`;
    pipeline.hincrbyfloat(hourlyKey, metric.service, metric.cost);
    pipeline.expire(hourlyKey, 7 * 24 * 60 * 60); // 7 days

    await pipeline.exec();
  }

  // Check budget alerts
  private async checkBudgetAlerts(metric: CostMetric): Promise<void> {
    try {
      for (const budget of this.budgets.values()) {
        if (this.metricMatchesBudget(metric, budget)) {
          const currentSpend = await this.getCurrentSpend(budget);
          const percentage = (currentSpend / budget.amount) * 100;

          // Check threshold alerts
          for (const threshold of budget.alerts.thresholds) {
            if (percentage >= threshold && percentage < threshold + 5) {
              await this.createBudgetAlert({
                budgetId: budget.id,
                type: 'threshold',
                severity: this.getAlertSeverity(percentage),
                message: `Budget "${budget.name}" has reached ${percentage.toFixed(1)}% of limit`,
                currentSpend,
                budgetAmount: budget.amount,
                percentage,
                timestamp: new Date(),
                acknowledged: false
              });
            }
          }

          // Anomaly detection
          await this.checkCostAnomaly(budget, currentSpend);
        }
      }
    } catch (error) {
      logger.error('Failed to check budget alerts', {
        error: error.message,
        metric
      });
    }
  }

  // Check for cost anomalies using statistical analysis
  private async checkCostAnomaly(budget: CostBudget, currentSpend: number): Promise<void> {
    try {
      const historicalData = await this.getHistoricalSpend(budget, 30); // Last 30 periods

      if (historicalData.length < 7) return; // Need minimum data

      const mean = historicalData.reduce((sum, value) => sum + value, 0) / historicalData.length;
      const variance = historicalData.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / historicalData.length;
      const stdDev = Math.sqrt(variance);

      // Z-score anomaly detection
      const zScore = Math.abs((currentSpend - mean) / stdDev);
      const threshold = 2.5; // 2.5 standard deviations

      if (zScore > threshold) {
        await this.createBudgetAlert({
          budgetId: budget.id,
          type: 'anomaly',
          severity: zScore > 3 ? 'critical' : 'high',
          message: `Anomalous spending detected for budget "${budget.name}". Current: $${currentSpend.toFixed(2)}, Expected: $${mean.toFixed(2)} ±$${stdDev.toFixed(2)}`,
          currentSpend,
          budgetAmount: budget.amount,
          percentage: (currentSpend / budget.amount) * 100,
          timestamp: new Date(),
          acknowledged: false
        });
      }

    } catch (error) {
      logger.error('Failed to check cost anomaly', {
        error: error.message,
        budgetId: budget.id
      });
    }
  }

  // Create budget alert
  private async createBudgetAlert(alert: Omit<CostAlert, 'id'>): Promise<void> {
    const alertId = this.generateId();
    const fullAlert: CostAlert = { ...alert, id: alertId };

    // Store alert
    await this.redis.setex(
      `cost:alert:${alertId}`,
      7 * 24 * 60 * 60, // 7 days TTL
      JSON.stringify(fullAlert)
    );

    // Add to budget alerts list
    await this.redis.lpush(`cost:budget:${alert.budgetId}:alerts`, alertId);
    await this.redis.ltrim(`cost:budget:${alert.budgetId}:alerts`, 0, 99); // Keep last 100

    // Emit alert event
    this.emit('budgetAlert', fullAlert);

    logger.warn('Budget alert created', {
      alertId,
      budgetId: alert.budgetId,
      type: alert.type,
      severity: alert.severity,
      percentage: alert.percentage
    });
  }

  // Create or update budget
  async createBudget(budget: Omit<CostBudget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const budgetId = this.generateId();
    const fullBudget: CostBudget = {
      ...budget,
      id: budgetId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.budgets.set(budgetId, fullBudget);

    // Store in Redis
    await this.redis.setex(
      `cost:budget:${budgetId}`,
      365 * 24 * 60 * 60, // 1 year TTL
      JSON.stringify(fullBudget)
    );

    logger.info('Budget created', {
      budgetId,
      name: budget.name,
      amount: budget.amount,
      period: budget.period
    });

    return budgetId;
  }

  // Get cost dashboard data
  async getCostDashboard(timeRange: string = '24h'): Promise<any> {
    try {
      const [totalCosts, serviceCosts, categoryCosts, trends] = await Promise.all([
        this.getTotalCosts(timeRange),
        this.getServiceCosts(timeRange),
        this.getCategoryCosts(timeRange),
        this.getCostTrends(timeRange)
      ]);

      return {
        summary: {
          total: totalCosts.total,
          period: timeRange,
          currency: 'USD',
          lastUpdated: new Date().toISOString()
        },
        breakdown: {
          services: serviceCosts,
          categories: categoryCosts
        },
        trends,
        budgets: await this.getBudgetStatus(),
        alerts: await this.getActiveAlerts(),
        optimizations: await this.getTopOptimizations(10)
      };

    } catch (error) {
      logger.error('Failed to get cost dashboard', {
        error: error.message,
        timeRange
      });
      throw error;
    }
  }

  // Get cost optimization recommendations
  async generateOptimizations(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      // Rightsizing recommendations
      const rightsizing = await this.analyzeRightsizing();
      optimizations.push(...rightsizing);

      // Storage optimization
      const storage = await this.analyzeStorageOptimization();
      optimizations.push(...storage);

      // Scheduling optimization
      const scheduling = await this.analyzeSchedulingOptimization();
      optimizations.push(...scheduling);

      // Update optimization cache
      for (const opt of optimizations) {
        this.optimizations.set(opt.id, opt);
        await this.redis.setex(
          `cost:optimization:${opt.id}`,
          7 * 24 * 60 * 60,
          JSON.stringify(opt)
        );
      }

      logger.info('Cost optimizations generated', {
        count: optimizations.length,
        totalSavings: optimizations.reduce((sum, opt) => sum + opt.projectedSavings, 0)
      });

      return optimizations;

    } catch (error) {
      logger.error('Failed to generate optimizations', {
        error: error.message
      });
      return [];
    }
  }

  // Analyze rightsizing opportunities
  private async analyzeRightsizing(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      // Get compute resource utilization
      const services = ['gateway', 'neo4j', 'er-service', 'ai-service'];

      for (const service of services) {
        const utilization = await this.metricsCollector.getUtilization(service, '7d');

        if (utilization.cpu.avg < 30 && utilization.memory.avg < 40) {
          // Under-utilized resource
          const currentCost = await this.getServiceCost(service, '30d');
          const projectedSavings = currentCost * 0.3; // 30% savings assumption

          optimizations.push({
            id: this.generateId(),
            type: 'rightsizing',
            service,
            resource: 'compute',
            currentCost,
            projectedSavings,
            confidence: this.calculateConfidence(utilization),
            recommendation: `Downsize ${service} instances due to low utilization (CPU: ${utilization.cpu.avg}%, Memory: ${utilization.memory.avg}%)`,
            effort: 'medium',
            risk: 'low',
            metadata: {
              currentUtilization: utilization,
              recommendedSize: this.getRecommendedSize(utilization)
            }
          });
        }
      }

    } catch (error) {
      logger.error('Failed to analyze rightsizing', { error: error.message });
    }

    return optimizations;
  }

  // Analyze storage optimization
  private async analyzeStorageOptimization(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      // Check for old snapshots, unused volumes, etc.
      const storageMetrics = await this.metricsCollector.getStorageMetrics('30d');

      if (storageMetrics.unusedVolumes > 0) {
        const savingsPerVolume = 50; // Estimated $50/month per volume
        optimizations.push({
          id: this.generateId(),
          type: 'storage',
          service: 'storage',
          resource: 'volumes',
          currentCost: storageMetrics.unusedVolumes * savingsPerVolume,
          projectedSavings: storageMetrics.unusedVolumes * savingsPerVolume,
          confidence: 0.9,
          recommendation: `Delete ${storageMetrics.unusedVolumes} unused storage volumes`,
          effort: 'low',
          risk: 'low',
          metadata: {
            volumeCount: storageMetrics.unusedVolumes,
            estimatedSavingsPerVolume: savingsPerVolume
          }
        });
      }

    } catch (error) {
      logger.error('Failed to analyze storage optimization', { error: error.message });
    }

    return optimizations;
  }

  // Analyze scheduling optimization
  private async analyzeSchedulingOptimization(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      // Look for services that could use spot instances or scheduled scaling
      const nonProdServices = ['staging', 'development', 'testing'];

      for (const service of nonProdServices) {
        const usage = await this.getServiceUsagePattern(service, '7d');

        if (usage.nighttimeUtilization < 10) {
          const currentCost = await this.getServiceCost(service, '30d');
          const projectedSavings = currentCost * 0.4; // 40% savings with scheduling

          optimizations.push({
            id: this.generateId(),
            type: 'scheduling',
            service,
            resource: 'compute',
            currentCost,
            projectedSavings,
            confidence: 0.8,
            recommendation: `Implement auto-scaling schedule for ${service} to shut down during off-hours`,
            effort: 'medium',
            risk: 'low',
            metadata: {
              usagePattern: usage,
              schedulingWindow: '6pm-8am weekdays, weekends'
            }
          });
        }
      }

    } catch (error) {
      logger.error('Failed to analyze scheduling optimization', { error: error.message });
    }

    return optimizations;
  }

  // Start periodic cost tracking tasks
  private startPeriodicTasks(): void {
    // Budget checks every hour
    setInterval(async () => {
      try {
        await this.runBudgetChecks();
      } catch (error) {
        logger.error('Periodic budget check failed', { error: error.message });
      }
    }, 60 * 60 * 1000); // 1 hour

    // Cost optimization analysis daily
    setInterval(async () => {
      try {
        await this.generateOptimizations();
      } catch (error) {
        logger.error('Periodic optimization generation failed', { error: error.message });
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Sampling rate adjustment every 6 hours
    setInterval(async () => {
      try {
        await this.adjustSamplingRates();
      } catch (error) {
        logger.error('Sampling rate adjustment failed', { error: error.message });
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  // Adjust sampling rates based on cost patterns
  private async adjustSamplingRates(): Promise<void> {
    try {
      const services = Array.from(this.samplingRates.keys());

      for (const service of services) {
        const recentCost = await this.getServiceCost(service, '1h');
        const avgCost = await this.getServiceCost(service, '24h') / 24;

        // Increase sampling for high-cost or rapidly changing services
        let newRate = this.samplingRates.get(service) || 0.1;

        if (recentCost > avgCost * 2) {
          // Cost spike - increase sampling
          newRate = Math.min(1.0, newRate * 1.5);
        } else if (recentCost < avgCost * 0.1) {
          // Very low cost - decrease sampling
          newRate = Math.max(0.05, newRate * 0.8);
        }

        this.samplingRates.set(service, newRate);
      }

      logger.info('Sampling rates adjusted', {
        rates: Object.fromEntries(this.samplingRates)
      });

    } catch (error) {
      logger.error('Failed to adjust sampling rates', { error: error.message });
    }
  }

  // Helper methods
  private metricMatchesBudget(metric: CostMetric, budget: CostBudget): boolean {
    if (budget.scope.services && !budget.scope.services.includes(metric.service)) {
      return false;
    }

    if (budget.scope.categories && !budget.scope.categories.includes(metric.category)) {
      return false;
    }

    if (budget.scope.tags) {
      for (const [key, value] of Object.entries(budget.scope.tags)) {
        if (metric.metadata.tags?.[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private async getCurrentSpend(budget: CostBudget): Promise<number> {
    // Implementation would calculate current spend based on budget scope and period
    return 0; // Placeholder
  }

  private async getHistoricalSpend(budget: CostBudget, periods: number): Promise<number[]> {
    // Implementation would return historical spending data
    return []; // Placeholder
  }

  private getAlertSeverity(percentage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (percentage >= 100) return 'critical';
    if (percentage >= 80) return 'high';
    if (percentage >= 50) return 'medium';
    return 'low';
  }

  private getDayKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getHourKey(date: Date): string {
    return date.toISOString().split(':')[0];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private calculateConfidence(utilization: any): number {
    // Calculate confidence based on data quality and patterns
    return 0.8; // Placeholder
  }

  private getRecommendedSize(utilization: any): string {
    // Determine recommended instance size based on utilization
    return 'medium'; // Placeholder
  }

  private async getTotalCosts(timeRange: string): Promise<any> {
    // Implementation placeholder
    return { total: 0 };
  }

  private async getServiceCosts(timeRange: string): Promise<any> {
    // Implementation placeholder
    return {};
  }

  private async getCategoryCosts(timeRange: string): Promise<any> {
    // Implementation placeholder
    return {};
  }

  private async getCostTrends(timeRange: string): Promise<any> {
    // Implementation placeholder
    return {};
  }

  private async getBudgetStatus(): Promise<any> {
    // Implementation placeholder
    return [];
  }

  private async getActiveAlerts(): Promise<any> {
    // Implementation placeholder
    return [];
  }

  private async getTopOptimizations(limit: number): Promise<any> {
    // Implementation placeholder
    return [];
  }

  private async runBudgetChecks(): Promise<void> {
    // Implementation placeholder
  }

  private async getServiceCost(service: string, timeRange: string): Promise<number> {
    // Implementation placeholder
    return 0;
  }

  private async getServiceUsagePattern(service: string, timeRange: string): Promise<any> {
    // Implementation placeholder
    return { nighttimeUtilization: 0 };
  }
}