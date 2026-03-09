#!/usr/bin/env node

/**
 * Cost & Carbon Telemetry
 * Per-target cost (CPU-mins, egress, storage) and carbon intensity tracking
 */

import { EventEmitter } from 'events';

export interface CostMetrics {
  cpuMinutes: number;
  memoryMbMinutes: number;
  networkEgressMb: number;
  storageMb: number;
  buildDurationMs: number;
  parallelism: number;
}

export interface CarbonMetrics {
  carbonIntensityGCo2PerKwh: number; // grams CO2 per kWh
  estimatedEnergyKwh: number;
  estimatedCarbonGrams: number;
  region: string;
  dataCenter?: string;
  renewablePercentage?: number;
}

export interface TargetTelemetry {
  targetId: string;
  targetName: string;
  timestamp: number;
  cost: CostMetrics;
  carbon: CarbonMetrics;
  build: {
    success: boolean;
    exitCode: number;
    cached: boolean;
    remote: boolean;
    speculative: boolean;
  };
  context: {
    userId?: string;
    branch?: string;
    commitHash?: string;
    buildTrigger: 'manual' | 'ci' | 'scheduled' | 'speculative';
    nodeType?: string;
    nodeRegion?: string;
  };
}

export interface CostReport {
  period: { start: number; end: number };
  totalCost: {
    cpuCostUsd: number;
    memoryCostUsd: number;
    networkCostUsd: number;
    storageCostUsd: number;
    totalUsd: number;
  };
  totalCarbon: {
    totalCarbonKg: number;
    equivalent: string; // "X miles driven" or similar
  };
  breakdown: {
    byTarget: Array<{ target: string; costUsd: number; carbonKg: number }>;
    byUser: Array<{ user: string; costUsd: number; carbonKg: number }>;
    byRegion: Array<{ region: string; costUsd: number; carbonKg: number }>;
  };
  trends: {
    costPerBuild: number[];
    carbonPerBuild: number[];
    efficiency: number[]; // cost/success ratio
  };
  recommendations: Array<{
    type: 'cost_optimization' | 'carbon_reduction' | 'efficiency';
    description: string;
    potentialSavings: { costUsd?: number; carbonKg?: number };
  }>;
}

export interface PricingConfig {
  cpu: { pricePerMinute: number };
  memory: { pricePerMbMinute: number };
  network: { pricePerMbEgress: number };
  storage: { pricePerMbMonth: number };
  regions: Record<string, { multiplier: number; carbonIntensity: number }>;
}

export class CostCarbonTelemetry extends EventEmitter {
  private telemetryData: TargetTelemetry[] = [];
  private pricingConfig: PricingConfig;
  private carbonIntensityCache: Map<
    string,
    { intensity: number; timestamp: number }
  > = new Map();
  private metricsExporter: MetricsExporter;

  private config: {
    retentionDays: number;
    exportInterval: number;
    budgetAlerts: {
      dailyCostUsd: number;
      monthlyCostUsd: number;
      dailyCarbonKg: number;
    };
    enableRealTimeAlerts: boolean;
  };

  constructor(
    pricingConfig: PricingConfig,
    config: {
      retentionDays?: number;
      exportInterval?: number;
      budgetAlerts?: {
        dailyCostUsd: number;
        monthlyCostUsd: number;
        dailyCarbonKg: number;
      };
      enableRealTimeAlerts?: boolean;
      metricsBackend?: 'prometheus' | 'datadog' | 'console';
    } = {},
  ) {
    super();

    this.pricingConfig = pricingConfig;
    this.config = {
      retentionDays: config.retentionDays || 90,
      exportInterval: config.exportInterval || 60000, // 1 minute
      budgetAlerts: config.budgetAlerts || {
        dailyCostUsd: 100,
        monthlyCostUsd: 2000,
        dailyCarbonKg: 50,
      },
      enableRealTimeAlerts: config.enableRealTimeAlerts !== false,
    };

    this.metricsExporter = new MetricsExporter(
      config.metricsBackend || 'console',
    );

    // Start periodic metrics export
    setInterval(() => {
      this.exportMetrics();
    }, this.config.exportInterval);

    console.log(
      '📊 Cost & Carbon Telemetry initialized - tracking build economics and environment impact',
    );
  }

  /**
   * Record telemetry for a build target
   */
  async recordTargetTelemetry(telemetry: TargetTelemetry): Promise<void> {
    console.log(`💰 Recording telemetry for target: ${telemetry.targetName}`);

    // Validate and enrich telemetry data
    const enrichedTelemetry = await this.enrichTelemetry(telemetry);

    // Store telemetry
    this.telemetryData.push(enrichedTelemetry);

    // Enforce retention policy
    this.enforceRetention();

    // Check budget alerts
    if (this.config.enableRealTimeAlerts) {
      await this.checkBudgetAlerts(enrichedTelemetry);
    }

    // Export metrics
    await this.metricsExporter.exportTargetMetrics(enrichedTelemetry);

    this.emit('telemetry_recorded', {
      target: telemetry.targetName,
      costUsd: this.calculateTotalCost(telemetry.cost),
      carbonKg: telemetry.carbon.estimatedCarbonGrams / 1000,
    });

    const costUsd = this.calculateTotalCost(enrichedTelemetry.cost);
    const carbonKg = enrichedTelemetry.carbon.estimatedCarbonGrams / 1000;

    console.log(
      `💰 Target ${telemetry.targetName}: $${costUsd.toFixed(4)}, ${carbonKg.toFixed(3)}kg CO2`,
    );
  }

  /**
   * Start tracking a build target (call at start)
   */
  async startTracking(
    targetId: string,
    targetName: string,
    context: any,
  ): Promise<TargetTracker> {
    const tracker = new TargetTracker(
      targetId,
      targetName,
      context,
      this.pricingConfig,
      this,
    );

    await tracker.start();
    return tracker;
  }

  /**
   * Generate cost report for a time period
   */
  async generateCostReport(
    startTime: number,
    endTime: number,
  ): Promise<CostReport> {
    console.log(
      `📊 Generating cost report for period ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`,
    );

    // Filter telemetry data for the period
    const periodData = this.telemetryData.filter(
      (t) => t.timestamp >= startTime && t.timestamp <= endTime,
    );

    if (periodData.length === 0) {
      throw new Error('No telemetry data available for the specified period');
    }

    // Calculate total costs
    let totalCpuCost = 0;
    let totalMemoryCost = 0;
    let totalNetworkCost = 0;
    let totalStorageCost = 0;
    let totalCarbon = 0;

    const targetCosts = new Map<string, { cost: number; carbon: number }>();
    const userCosts = new Map<string, { cost: number; carbon: number }>();
    const regionCosts = new Map<string, { cost: number; carbon: number }>();

    for (const telemetry of periodData) {
      const cost = this.calculateDetailedCost(
        telemetry.cost,
        telemetry.context.nodeRegion,
      );

      totalCpuCost += cost.cpu;
      totalMemoryCost += cost.memory;
      totalNetworkCost += cost.network;
      totalStorageCost += cost.storage;
      totalCarbon += telemetry.carbon.estimatedCarbonGrams;

      const totalTargetCost =
        cost.cpu + cost.memory + cost.network + cost.storage;
      const targetCarbonKg = telemetry.carbon.estimatedCarbonGrams / 1000;

      // Track by target
      const existing = targetCosts.get(telemetry.targetName) || {
        cost: 0,
        carbon: 0,
      };
      targetCosts.set(telemetry.targetName, {
        cost: existing.cost + totalTargetCost,
        carbon: existing.carbon + targetCarbonKg,
      });

      // Track by user
      if (telemetry.context.userId) {
        const userExisting = userCosts.get(telemetry.context.userId) || {
          cost: 0,
          carbon: 0,
        };
        userCosts.set(telemetry.context.userId, {
          cost: userExisting.cost + totalTargetCost,
          carbon: userExisting.carbon + targetCarbonKg,
        });
      }

      // Track by region
      if (telemetry.context.nodeRegion) {
        const regionExisting = regionCosts.get(
          telemetry.context.nodeRegion,
        ) || { cost: 0, carbon: 0 };
        regionCosts.set(telemetry.context.nodeRegion, {
          cost: regionExisting.cost + totalTargetCost,
          carbon: regionExisting.carbon + targetCarbonKg,
        });
      }
    }

    const totalCostUsd =
      totalCpuCost + totalMemoryCost + totalNetworkCost + totalStorageCost;
    const totalCarbonKg = totalCarbon / 1000;

    // Calculate trends
    const trends = this.calculateTrends(periodData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      periodData,
      totalCostUsd,
      totalCarbonKg,
    );

    return {
      period: { start: startTime, end: endTime },
      totalCost: {
        cpuCostUsd: totalCpuCost,
        memoryCostUsd: totalMemoryCost,
        networkCostUsd: totalNetworkCost,
        storageCostUsd: totalStorageCost,
        totalUsd: totalCostUsd,
      },
      totalCarbon: {
        totalCarbonKg,
        equivalent: this.carbonToEquivalent(totalCarbonKg),
      },
      breakdown: {
        byTarget: Array.from(targetCosts.entries())
          .map(([target, data]) => ({
            target,
            costUsd: data.cost,
            carbonKg: data.carbon,
          }))
          .sort((a, b) => b.costUsd - a.costUsd),
        byUser: Array.from(userCosts.entries())
          .map(([user, data]) => ({
            user,
            costUsd: data.cost,
            carbonKg: data.carbon,
          }))
          .sort((a, b) => b.costUsd - a.costUsd),
        byRegion: Array.from(regionCosts.entries())
          .map(([region, data]) => ({
            region,
            costUsd: data.cost,
            carbonKg: data.carbon,
          }))
          .sort((a, b) => b.costUsd - a.costUsd),
      },
      trends,
      recommendations,
    };
  }

  /**
   * Get real-time cost and carbon metrics
   */
  getCurrentMetrics(): {
    today: { costUsd: number; carbonKg: number; builds: number };
    thisWeek: { costUsd: number; carbonKg: number; builds: number };
    thisMonth: { costUsd: number; carbonKg: number; builds: number };
    efficiency: {
      avgCostPerBuild: number;
      avgCarbonPerBuild: number;
      successRate: number;
      cacheHitRate: number;
    };
  } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const today = this.getMetricsForPeriod(now - dayMs, now);
    const thisWeek = this.getMetricsForPeriod(now - 7 * dayMs, now);
    const thisMonth = this.getMetricsForPeriod(now - 30 * dayMs, now);

    const allBuilds = this.telemetryData.filter(
      (t) => t.timestamp > now - 30 * dayMs,
    );
    const successfulBuilds = allBuilds.filter((t) => t.build.success);
    const cachedBuilds = allBuilds.filter((t) => t.build.cached);

    const totalCost = allBuilds.reduce(
      (sum, t) => sum + this.calculateTotalCost(t.cost),
      0,
    );
    const totalCarbon =
      allBuilds.reduce((sum, t) => sum + t.carbon.estimatedCarbonGrams, 0) /
      1000;

    return {
      today,
      thisWeek,
      thisMonth,
      efficiency: {
        avgCostPerBuild:
          allBuilds.length > 0 ? totalCost / allBuilds.length : 0,
        avgCarbonPerBuild:
          allBuilds.length > 0 ? totalCarbon / allBuilds.length : 0,
        successRate:
          allBuilds.length > 0 ? successfulBuilds.length / allBuilds.length : 0,
        cacheHitRate:
          allBuilds.length > 0 ? cachedBuilds.length / allBuilds.length : 0,
      },
    };
  }

  private async enrichTelemetry(
    telemetry: TargetTelemetry,
  ): Promise<TargetTelemetry> {
    // Enrich with current carbon intensity if not provided
    if (
      !telemetry.carbon.carbonIntensityGCo2PerKwh &&
      telemetry.context.nodeRegion
    ) {
      const intensity = await this.getCarbonIntensity(
        telemetry.context.nodeRegion,
      );
      telemetry.carbon.carbonIntensityGCo2PerKwh = intensity;
      telemetry.carbon.estimatedCarbonGrams =
        telemetry.carbon.estimatedEnergyKwh * intensity;
    }

    // Estimate energy usage if not provided
    if (!telemetry.carbon.estimatedEnergyKwh) {
      telemetry.carbon.estimatedEnergyKwh = this.estimateEnergyUsage(
        telemetry.cost,
      );
    }

    return telemetry;
  }

  private async getCarbonIntensity(region: string): Promise<number> {
    // Check cache first
    const cached = this.carbonIntensityCache.get(region);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      // 1 hour cache
      return cached.intensity;
    }

    // Use configured intensity or fetch from API
    const intensity =
      this.pricingConfig.regions[region]?.carbonIntensity || 500; // Default 500g CO2/kWh

    this.carbonIntensityCache.set(region, {
      intensity,
      timestamp: Date.now(),
    });

    return intensity;
  }

  private estimateEnergyUsage(cost: CostMetrics): number {
    // Rough estimation: assume modern CPU uses ~100W, memory ~5W per GB
    const cpuHours = cost.cpuMinutes / 60;
    const memoryGbHours = cost.memoryMbMinutes / 1024 / 60;

    const cpuEnergyKwh = cpuHours * 0.1; // 100W = 0.1 kW
    const memoryEnergyKwh = memoryGbHours * 0.005; // 5W per GB = 0.005 kW per GB

    return cpuEnergyKwh + memoryEnergyKwh;
  }

  private calculateTotalCost(cost: CostMetrics): number {
    return (
      cost.cpuMinutes * this.pricingConfig.cpu.pricePerMinute +
      cost.memoryMbMinutes * this.pricingConfig.memory.pricePerMbMinute +
      cost.networkEgressMb * this.pricingConfig.network.pricePerMbEgress +
      cost.storageMb * this.pricingConfig.storage.pricePerMbMonth
    );
  }

  private calculateDetailedCost(
    cost: CostMetrics,
    region?: string,
  ): { cpu: number; memory: number; network: number; storage: number } {
    const multiplier = region
      ? this.pricingConfig.regions[region]?.multiplier || 1
      : 1;

    return {
      cpu: cost.cpuMinutes * this.pricingConfig.cpu.pricePerMinute * multiplier,
      memory:
        cost.memoryMbMinutes *
        this.pricingConfig.memory.pricePerMbMinute *
        multiplier,
      network:
        cost.networkEgressMb *
        this.pricingConfig.network.pricePerMbEgress *
        multiplier,
      storage:
        cost.storageMb *
        this.pricingConfig.storage.pricePerMbMonth *
        multiplier,
    };
  }

  private getMetricsForPeriod(
    startTime: number,
    endTime: number,
  ): { costUsd: number; carbonKg: number; builds: number } {
    const periodData = this.telemetryData.filter(
      (t) => t.timestamp >= startTime && t.timestamp <= endTime,
    );

    const costUsd = periodData.reduce(
      (sum, t) => sum + this.calculateTotalCost(t.cost),
      0,
    );
    const carbonKg =
      periodData.reduce((sum, t) => sum + t.carbon.estimatedCarbonGrams, 0) /
      1000;

    return {
      costUsd,
      carbonKg,
      builds: periodData.length,
    };
  }

  private calculateTrends(periodData: TargetTelemetry[]): {
    costPerBuild: number[];
    carbonPerBuild: number[];
    efficiency: number[];
  } {
    // Group by day for trend analysis
    const dailyMetrics = new Map<
      string,
      { cost: number; carbon: number; builds: number; successes: number }
    >();

    for (const telemetry of periodData) {
      const dayKey = new Date(telemetry.timestamp).toISOString().split('T')[0];
      const existing = dailyMetrics.get(dayKey) || {
        cost: 0,
        carbon: 0,
        builds: 0,
        successes: 0,
      };

      dailyMetrics.set(dayKey, {
        cost: existing.cost + this.calculateTotalCost(telemetry.cost),
        carbon: existing.carbon + telemetry.carbon.estimatedCarbonGrams / 1000,
        builds: existing.builds + 1,
        successes: existing.successes + (telemetry.build.success ? 1 : 0),
      });
    }

    const sortedDays = Array.from(dailyMetrics.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return {
      costPerBuild: sortedDays.map(([, data]) =>
        data.builds > 0 ? data.cost / data.builds : 0,
      ),
      carbonPerBuild: sortedDays.map(([, data]) =>
        data.builds > 0 ? data.carbon / data.builds : 0,
      ),
      efficiency: sortedDays.map(([, data]) =>
        data.builds > 0 ? data.successes / data.builds : 0,
      ),
    };
  }

  private generateRecommendations(
    periodData: TargetTelemetry[],
    totalCostUsd: number,
    totalCarbonKg: number,
  ): Array<{
    type: 'cost_optimization' | 'carbon_reduction' | 'efficiency';
    description: string;
    potentialSavings: { costUsd?: number; carbonKg?: number };
  }> {
    const recommendations: any[] = [];

    // Cache hit rate analysis
    const totalBuilds = periodData.length;
    const cachedBuilds = periodData.filter((t) => t.build.cached).length;
    const cacheHitRate = totalBuilds > 0 ? cachedBuilds / totalBuilds : 0;

    if (cacheHitRate < 0.6) {
      const potentialSavings = totalCostUsd * (0.6 - cacheHitRate);
      recommendations.push({
        type: 'cost_optimization',
        description: `Improve cache hit rate from ${(cacheHitRate * 100).toFixed(1)}% to 60%`,
        potentialSavings: { costUsd: potentialSavings },
      });
    }

    // Speculative execution analysis
    const speculativeBuilds = periodData.filter((t) => t.build.speculative);
    const unusedSpeculative = speculativeBuilds.filter(
      (t) => !t.build.success,
    ).length;

    if (unusedSpeculative > speculativeBuilds.length * 0.3) {
      const wastedCost = speculativeBuilds
        .filter((t) => !t.build.success)
        .reduce((sum, t) => sum + this.calculateTotalCost(t.cost), 0);

      recommendations.push({
        type: 'cost_optimization',
        description: `Reduce speculative execution waste (${unusedSpeculative} unused builds)`,
        potentialSavings: { costUsd: wastedCost * 0.5 },
      });
    }

    // Regional optimization
    const regionCosts = new Map<
      string,
      { cost: number; carbon: number; count: number }
    >();

    for (const telemetry of periodData) {
      const region = telemetry.context.nodeRegion || 'unknown';
      const existing = regionCosts.get(region) || {
        cost: 0,
        carbon: 0,
        count: 0,
      };

      regionCosts.set(region, {
        cost: existing.cost + this.calculateTotalCost(telemetry.cost),
        carbon: existing.carbon + telemetry.carbon.estimatedCarbonGrams / 1000,
        count: existing.count + 1,
      });
    }

    // Find most expensive region
    const sortedRegions = Array.from(regionCosts.entries()).sort(
      ([, a], [, b]) => b.cost / b.count - a.cost / a.count,
    );

    if (sortedRegions.length > 1) {
      const [expensiveRegion, expensiveData] = sortedRegions[0];
      const [cheaperRegion, cheaperData] =
        sortedRegions[sortedRegions.length - 1];

      const avgExpensiveCost = expensiveData.cost / expensiveData.count;
      const avgCheaperCost = cheaperData.cost / cheaperData.count;

      if (avgExpensiveCost > avgCheaperCost * 1.2) {
        recommendations.push({
          type: 'cost_optimization',
          description: `Move builds from ${expensiveRegion} to ${cheaperRegion}`,
          potentialSavings: {
            costUsd: expensiveData.cost * 0.2,
            carbonKg: expensiveData.carbon * 0.1,
          },
        });
      }
    }

    // Carbon optimization
    const avgCarbonPerBuild = totalCarbonKg / totalBuilds;
    if (avgCarbonPerBuild > 0.1) {
      // >100g per build
      recommendations.push({
        type: 'carbon_reduction',
        description: 'Use renewable energy regions or carbon offsetting',
        potentialSavings: { carbonKg: totalCarbonKg * 0.3 },
      });
    }

    return recommendations;
  }

  private carbonToEquivalent(carbonKg: number): string {
    // Various carbon equivalents for perspective
    const equivalents = [
      { value: carbonKg / 0.404, unit: 'miles driven by average car' },
      { value: carbonKg / 21.77, unit: 'gallons of gasoline burned' },
      { value: carbonKg / 0.0084, unit: 'smartphones charged' },
      { value: carbonKg / 411, unit: 'tree seedlings grown for 10 years' },
    ];

    // Find the most meaningful scale
    const meaningful = equivalents.find(
      (e) => e.value >= 0.1 && e.value <= 1000,
    );
    if (meaningful) {
      return `${meaningful.value.toFixed(1)} ${meaningful.unit}`;
    }

    return `${carbonKg.toFixed(3)} kg CO2`;
  }

  private async checkBudgetAlerts(telemetry: TargetTelemetry): Promise<void> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const todayMetrics = this.getMetricsForPeriod(now - dayMs, now);

    // Daily cost alert
    if (todayMetrics.costUsd > this.config.budgetAlerts.dailyCostUsd) {
      this.emit('budget_alert', {
        type: 'daily_cost',
        actual: todayMetrics.costUsd,
        budget: this.config.budgetAlerts.dailyCostUsd,
        message: `Daily cost budget exceeded: $${todayMetrics.costUsd.toFixed(2)} > $${this.config.budgetAlerts.dailyCostUsd}`,
      });
    }

    // Daily carbon alert
    if (todayMetrics.carbonKg > this.config.budgetAlerts.dailyCarbonKg) {
      this.emit('budget_alert', {
        type: 'daily_carbon',
        actual: todayMetrics.carbonKg,
        budget: this.config.budgetAlerts.dailyCarbonKg,
        message: `Daily carbon budget exceeded: ${todayMetrics.carbonKg.toFixed(2)}kg > ${this.config.budgetAlerts.dailyCarbonKg}kg`,
      });
    }
  }

  private enforceRetention(): void {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    this.telemetryData = this.telemetryData.filter((t) => t.timestamp > cutoff);
  }

  private async exportMetrics(): Promise<void> {
    const metrics = this.getCurrentMetrics();
    await this.metricsExporter.exportAggregateMetrics(metrics);
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down cost & carbon telemetry...');

    await this.metricsExporter.shutdown();

    console.log('✅ Cost & carbon telemetry shut down');
  }
}

/**
 * Target Tracker - tracks metrics for a single build target
 */
export class TargetTracker {
  private startTime: number;
  private resourceUsage: {
    cpuTime: number;
    memoryUsage: number;
    networkEgress: number;
    storageUsed: number;
  } = { cpuTime: 0, memoryUsage: 0, networkEgress: 0, storageUsed: 0 };

  constructor(
    private targetId: string,
    private targetName: string,
    private context: any,
    private pricingConfig: PricingConfig,
    private telemetry: CostCarbonTelemetry,
  ) {
    this.startTime = Date.now();
  }

  async start(): Promise<void> {
    console.log(`📊 Started tracking target: ${this.targetName}`);
    // Start resource monitoring
  }

  async recordResource(
    type: 'cpu' | 'memory' | 'network' | 'storage',
    amount: number,
  ): Promise<void> {
    switch (type) {
      case 'cpu':
        this.resourceUsage.cpuTime += amount;
        break;
      case 'memory':
        this.resourceUsage.memoryUsage += amount;
        break;
      case 'network':
        this.resourceUsage.networkEgress += amount;
        break;
      case 'storage':
        this.resourceUsage.storageUsed += amount;
        break;
    }
  }

  async finish(
    success: boolean,
    exitCode: number = 0,
  ): Promise<TargetTelemetry> {
    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    const durationMinutes = durationMs / (60 * 1000);

    const costMetrics: CostMetrics = {
      cpuMinutes: durationMinutes,
      memoryMbMinutes: this.resourceUsage.memoryUsage * durationMinutes,
      networkEgressMb: this.resourceUsage.networkEgress / (1024 * 1024),
      storageMb: this.resourceUsage.storageUsed / (1024 * 1024),
      buildDurationMs: durationMs,
      parallelism: 1, // Would detect actual parallelism
    };

    const carbonMetrics: CarbonMetrics = {
      carbonIntensityGCo2PerKwh: 0, // Will be enriched
      estimatedEnergyKwh: 0, // Will be calculated
      estimatedCarbonGrams: 0, // Will be calculated
      region: this.context.nodeRegion || 'us-east-1',
    };

    const telemetryData: TargetTelemetry = {
      targetId: this.targetId,
      targetName: this.targetName,
      timestamp: endTime,
      cost: costMetrics,
      carbon: carbonMetrics,
      build: {
        success,
        exitCode,
        cached: this.context.cached || false,
        remote: this.context.remote || false,
        speculative: this.context.speculative || false,
      },
      context: this.context,
    };

    await this.telemetry.recordTargetTelemetry(telemetryData);
    return telemetryData;
  }
}

/**
 * Metrics Exporter - exports metrics to various backends
 */
class MetricsExporter {
  constructor(private backend: 'prometheus' | 'datadog' | 'console') {}

  async exportTargetMetrics(telemetry: TargetTelemetry): Promise<void> {
    switch (this.backend) {
      case 'console':
        console.log(
          `📊 METRICS: ${telemetry.targetName} - $${this.calculateCost(telemetry.cost).toFixed(4)}, ${(telemetry.carbon.estimatedCarbonGrams / 1000).toFixed(3)}kg CO2`,
        );
        break;
      case 'prometheus':
        // Would export to Prometheus
        break;
      case 'datadog':
        // Would export to Datadog
        break;
    }
  }

  async exportAggregateMetrics(metrics: any): Promise<void> {
    switch (this.backend) {
      case 'console':
        console.log(
          `📊 TODAY: $${metrics.today.costUsd.toFixed(2)}, ${metrics.today.carbonKg.toFixed(2)}kg CO2, ${metrics.today.builds} builds`,
        );
        break;
    }
  }

  private calculateCost(cost: CostMetrics): number {
    // Simplified cost calculation for display
    return cost.cpuMinutes * 0.01 + cost.memoryMbMinutes * 0.0001;
  }

  async shutdown(): Promise<void> {
    console.log(`📊 ${this.backend} metrics exporter shut down`);
  }
}

// Factory functions
export function createCostCarbonTelemetry(
  pricingConfig: PricingConfig,
  config?: any,
): CostCarbonTelemetry {
  return new CostCarbonTelemetry(pricingConfig, config);
}

// Default pricing configuration (AWS-like)
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  cpu: { pricePerMinute: 0.01 }, // $0.01 per CPU minute
  memory: { pricePerMbMinute: 0.0001 }, // $0.0001 per MB minute
  network: { pricePerMbEgress: 0.09 }, // $0.09 per MB egress
  storage: { pricePerMbMonth: 0.023 }, // $0.023 per MB per month
  regions: {
    'us-east-1': { multiplier: 1.0, carbonIntensity: 400 },
    'us-west-2': { multiplier: 1.1, carbonIntensity: 350 },
    'eu-west-1': { multiplier: 1.2, carbonIntensity: 300 },
    'ap-south-1': { multiplier: 0.8, carbonIntensity: 600 },
  },
};
