/**
 * RepoOS Cost Ledger
 *
 * Tracks per-run costs, maintains financial provenance, and provides
 * cost transparency for autonomous repository operations.
 *
 * Features:
 * - Per-run cost tracking with itemized breakdowns
 * - Cost forecasting before execution
 * - Budget enforcement with automatic throttling
 * - Cost attribution by agent, concern, and operation type
 * - Historical cost analysis and trend detection
 * - Cost anomaly detection
 * - ROI calculation for autonomous operations
 *
 * Constitutional Compliance:
 * - Satisfies RUN_DETERMINISM (every run tracked)
 * - Satisfies AUDIT_IMMUTABILITY (append-only ledger)
 * - Satisfies COST_TRANSPARENCY (complete provenance)
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CostItem {
  category: 'ci_compute' | 'api_calls' | 'storage' | 'network' | 'human_time' | 'other';
  description: string;
  amount: number; // USD cents
  quantity: number;
  unitCost: number; // USD cents per unit
  metadata?: Record<string, unknown>;
}

export interface RunCost {
  runId: string;
  timestamp: string;
  operation: string;
  agentId?: string;
  concernId?: string;
  prNumbers?: number[];
  items: CostItem[];
  totalCost: number; // USD cents
  forecastedCost?: number; // USD cents (if forecasted before run)
  costVariance?: number; // Actual vs forecast (%)
  durationMs: number;
  costPerMinute: number; // USD cents per minute
  metadata: Record<string, unknown>;
}

export interface CostBudget {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  limitCents: number;
  currentSpendCents: number;
  periodStart: string;
  periodEnd: string;
  alertThresholdPercent: number; // Alert at X% of budget
  enforced: boolean; // Hard stop at 100%?
}

export interface CostForecast {
  operationType: string;
  estimatedCostCents: number;
  confidence: number; // 0-1
  breakdown: CostItem[];
  assumptions: string[];
  historicalMedian?: number;
  historicalP95?: number;
}

export interface CostAnomaly {
  runId: string;
  detectedAt: string;
  anomalyType: 'cost_spike' | 'unusual_category' | 'budget_risk' | 'cost_trend_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actualCost: number;
  expectedCost: number;
  variance: number; // % over/under
  recommendation: string;
}

export interface CostAttribution {
  dimension: 'agent' | 'concern' | 'operation' | 'pr';
  key: string; // agent ID, concern ID, operation type, or PR number
  totalCostCents: number;
  runCount: number;
  avgCostPerRun: number;
  percentOfTotal: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ROIMetrics {
  period: string;
  totalCostCents: number;
  estimatedSavings: {
    engineerTimeSavedHours: number;
    engineerHourlyRateCents: number;
    ciDowntimeAvoidedMinutes: number;
    ciMinuteCostCents: number;
    conflictsPrevented: number;
    conflictResolutionCostCents: number;
    totalSavingsCents: number;
  };
  roi: number; // (Savings - Cost) / Cost
  paybackPeriodDays?: number;
  breakEven: boolean;
}

interface LedgerConfig {
  ledgerPath: string;
  budgets: CostBudget[];
  costFactors: {
    ciMinuteCostCents: number; // GitHub Actions cost per minute
    apiCallCostCents: number; // Average API call cost
    storageGBMonthCostCents: number; // Storage cost per GB-month
    engineerHourlyRateCents: number; // For ROI calculations
    conflictResolutionCostCents: number; // Avg cost to resolve one conflict
  };
  anomalyDetection: {
    enabled: boolean;
    spikeThresholdPercent: number; // Cost spike if > X% over median
    lookbackRuns: number; // How many historical runs to compare
  };
}

const DEFAULT_CONFIG: LedgerConfig = {
  ledgerPath: '/tmp/repoos-cost-ledger.jsonl',
  budgets: [
    {
      period: 'daily',
      limitCents: 50000, // $500/day
      currentSpendCents: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 86400000).toISOString(),
      alertThresholdPercent: 80,
      enforced: true,
    },
    {
      period: 'monthly',
      limitCents: 1000000, // $10k/month
      currentSpendCents: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      alertThresholdPercent: 90,
      enforced: true,
    },
  ],
  costFactors: {
    ciMinuteCostCents: 8, // ~$0.08/min for GitHub Actions
    apiCallCostCents: 0.01, // ~$0.0001 per API call
    storageGBMonthCostCents: 23, // ~$0.23/GB-month
    engineerHourlyRateCents: 15000, // $150/hour engineer time
    conflictResolutionCostCents: 5000, // $50 avg to resolve conflict
  },
  anomalyDetection: {
    enabled: true,
    spikeThresholdPercent: 200, // Alert if cost > 2x median
    lookbackRuns: 100,
  },
};

export class CostLedger extends EventEmitter {
  private config: LedgerConfig;
  private ledgerHandle?: fs.FileHandle;
  private runCostCache: Map<string, RunCost> = new Map();
  private budgetCache: Map<string, CostBudget> = new Map();

  constructor(config: Partial<LedgerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize budget cache
    this.config.budgets.forEach(b => {
      this.budgetCache.set(b.period, b);
    });
  }

  public async initialize(): Promise<void> {
    // Ensure ledger directory exists
    const ledgerDir = path.dirname(this.config.ledgerPath);
    await fs.mkdir(ledgerDir, { recursive: true });

    // Open ledger file in append mode
    this.ledgerHandle = await fs.open(this.config.ledgerPath, 'a');

    // Load recent runs into cache for fast lookups
    await this.loadRecentRuns();

    // Refresh budget periods if needed
    await this.refreshBudgetPeriods();

    this.emit('initialized', { ledgerPath: this.config.ledgerPath });
  }

  public async close(): Promise<void> {
    if (this.ledgerHandle) {
      await this.ledgerHandle.close();
      this.ledgerHandle = undefined;
    }
  }

  /**
   * Forecast cost for an operation BEFORE execution
   */
  public async forecastCost(
    operationType: string,
    metadata: Record<string, unknown> = {}
  ): Promise<CostForecast> {
    // Get historical costs for this operation type
    const historicalRuns = await this.getHistoricalRuns(operationType, this.config.anomalyDetection.lookbackRuns);

    if (historicalRuns.length === 0) {
      // No history - use default estimates
      return this.defaultForecast(operationType, metadata);
    }

    // Calculate statistics
    const costs = historicalRuns.map(r => r.totalCost).sort((a, b) => a - b);
    const median = costs[Math.floor(costs.length / 2)] || 0;
    const p95 = costs[Math.floor(costs.length * 0.95)] || 0;

    // Estimate based on median + context adjustments
    let estimatedCost = median;
    const breakdown: CostItem[] = [];
    const assumptions: string[] = [`Based on ${historicalRuns.length} historical runs`];

    // Adjust for PR count if applicable
    if (metadata.prCount && typeof metadata.prCount === 'number') {
      const avgPRsPerRun = historicalRuns.reduce((sum, r) => sum + (r.prNumbers?.length || 0), 0) / historicalRuns.length;
      if (avgPRsPerRun > 0) {
        const prMultiplier = metadata.prCount / avgPRsPerRun;
        estimatedCost = Math.round(estimatedCost * prMultiplier);
        assumptions.push(`Adjusted for ${metadata.prCount} PRs vs avg ${avgPRsPerRun.toFixed(1)}`);
      }
    }

    // Build breakdown from historical average proportions
    const categoryProportions = this.calculateCategoryProportions(historicalRuns);
    for (const [category, proportion] of Object.entries(categoryProportions)) {
      const amount = Math.round(estimatedCost * proportion);
      if (amount > 0) {
        breakdown.push({
          category: category as CostItem['category'],
          description: `Estimated ${category}`,
          amount,
          quantity: 1,
          unitCost: amount,
        });
      }
    }

    // Confidence based on consistency of historical costs
    const stdDev = this.calculateStdDev(costs);
    const cv = median > 0 ? stdDev / median : 1; // Coefficient of variation
    const confidence = Math.max(0.5, 1 - Math.min(cv, 0.5)); // Higher consistency = higher confidence

    return {
      operationType,
      estimatedCostCents: estimatedCost,
      confidence,
      breakdown,
      assumptions,
      historicalMedian: median,
      historicalP95: p95,
    };
  }

  /**
   * Record actual cost for a completed run
   */
  public async recordRunCost(runCost: RunCost): Promise<void> {
    // Validate
    if (!runCost.runId || !runCost.operation || runCost.totalCost < 0) {
      throw new Error('Invalid run cost record');
    }

    // Calculate cost per minute
    const durationMinutes = runCost.durationMs / 60000;
    runCost.costPerMinute = durationMinutes > 0 ? Math.round(runCost.totalCost / durationMinutes) : 0;

    // Calculate variance if forecast existed
    if (runCost.forecastedCost && runCost.forecastedCost > 0) {
      runCost.costVariance = ((runCost.totalCost - runCost.forecastedCost) / runCost.forecastedCost) * 100;
    }

    // Append to ledger (append-only for immutability)
    const ledgerEntry = JSON.stringify(runCost) + '\n';
    if (this.ledgerHandle) {
      await this.ledgerHandle.write(ledgerEntry);
    }

    // Update cache
    this.runCostCache.set(runCost.runId, runCost);

    // Update budgets
    await this.updateBudgets(runCost);

    // Check for anomalies
    if (this.config.anomalyDetection.enabled) {
      const anomaly = await this.detectAnomaly(runCost);
      if (anomaly) {
        this.emit('cost-anomaly', anomaly);
      }
    }

    this.emit('cost-recorded', runCost);
  }

  /**
   * Check if operation is within budget constraints
   */
  public async checkBudget(forecastedCostCents: number): Promise<{
    allowed: boolean;
    reason?: string;
    budget?: CostBudget;
  }> {
    await this.refreshBudgetPeriods();

    for (const budget of this.budgetCache.values()) {
      if (!budget.enforced) continue;

      const projectedSpend = budget.currentSpendCents + forecastedCostCents;
      const percentUsed = (projectedSpend / budget.limitCents) * 100;

      if (projectedSpend > budget.limitCents) {
        return {
          allowed: false,
          reason: `Would exceed ${budget.period} budget: $${(projectedSpend / 100).toFixed(2)} > $${(budget.limitCents / 100).toFixed(2)}`,
          budget,
        };
      }

      // Emit warning if approaching threshold
      if (percentUsed >= budget.alertThresholdPercent && percentUsed < 100) {
        this.emit('budget-warning', {
          budget,
          percentUsed,
          projectedSpend: projectedSpend / 100,
        });
      }
    }

    return { allowed: true };
  }

  /**
   * Get cost attribution breakdown
   */
  public async getCostAttribution(
    dimension: 'agent' | 'concern' | 'operation' | 'pr',
    lookbackDays: number = 30
  ): Promise<CostAttribution[]> {
    const cutoff = new Date(Date.now() - lookbackDays * 86400000).toISOString();
    const runs = await this.getRunsSince(cutoff);

    const totals = new Map<string, { cost: number; count: number }>();
    let grandTotal = 0;

    for (const run of runs) {
      let key: string;
      switch (dimension) {
        case 'agent':
          key = run.agentId || 'unknown';
          break;
        case 'concern':
          key = run.concernId || 'unknown';
          break;
        case 'operation':
          key = run.operation;
          break;
        case 'pr':
          key = run.prNumbers?.join(',') || 'unknown';
          break;
      }

      const existing = totals.get(key) || { cost: 0, count: 0 };
      totals.set(key, {
        cost: existing.cost + run.totalCost,
        count: existing.count + 1,
      });
      grandTotal += run.totalCost;
    }

    // Calculate trends (compare first half vs second half of period)
    const midpoint = new Date(Date.now() - (lookbackDays / 2) * 86400000).toISOString();
    const firstHalfRuns = runs.filter(r => r.timestamp < midpoint);
    const secondHalfRuns = runs.filter(r => r.timestamp >= midpoint);

    const attributions: CostAttribution[] = [];
    for (const [key, data] of totals.entries()) {
      const firstHalfCost = firstHalfRuns.filter(r => this.getRunKey(r, dimension) === key).reduce((sum, r) => sum + r.totalCost, 0);
      const secondHalfCost = secondHalfRuns.filter(r => this.getRunKey(r, dimension) === key).reduce((sum, r) => sum + r.totalCost, 0);

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (firstHalfCost > 0) {
        const changePercent = ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100;
        if (changePercent > 20) trend = 'increasing';
        else if (changePercent < -20) trend = 'decreasing';
      }

      attributions.push({
        dimension,
        key,
        totalCostCents: data.cost,
        runCount: data.count,
        avgCostPerRun: Math.round(data.cost / data.count),
        percentOfTotal: grandTotal > 0 ? (data.cost / grandTotal) * 100 : 0,
        trend,
      });
    }

    return attributions.sort((a, b) => b.totalCostCents - a.totalCostCents);
  }

  /**
   * Calculate ROI metrics
   */
  public async calculateROI(periodDays: number = 30): Promise<ROIMetrics> {
    const cutoff = new Date(Date.now() - periodDays * 86400000).toISOString();
    const runs = await this.getRunsSince(cutoff);

    const totalCost = runs.reduce((sum, r) => sum + r.totalCost, 0);

    // Estimate savings from metadata
    let engineerTimeSavedHours = 0;
    let ciDowntimeAvoidedMinutes = 0;
    let conflictsPrevented = 0;

    for (const run of runs) {
      // Extract savings metrics from run metadata
      if (run.metadata.engineerTimeSavedMin && typeof run.metadata.engineerTimeSavedMin === 'number') {
        engineerTimeSavedHours += run.metadata.engineerTimeSavedMin / 60;
      }
      if (run.metadata.ciDowntimeAvoidedMin && typeof run.metadata.ciDowntimeAvoidedMin === 'number') {
        ciDowntimeAvoidedMinutes += run.metadata.ciDowntimeAvoidedMin;
      }
      if (run.metadata.conflictsPrevented && typeof run.metadata.conflictsPrevented === 'number') {
        conflictsPrevented += run.metadata.conflictsPrevented;
      }
    }

    const engineerTimeSavings = Math.round(engineerTimeSavedHours * this.config.costFactors.engineerHourlyRateCents);
    const ciDowntimeSavings = Math.round(ciDowntimeAvoidedMinutes * this.config.costFactors.ciMinuteCostCents);
    const conflictSavings = Math.round(conflictsPrevented * this.config.costFactors.conflictResolutionCostCents);
    const totalSavings = engineerTimeSavings + ciDowntimeSavings + conflictSavings;

    const roi = totalCost > 0 ? (totalSavings - totalCost) / totalCost : 0;
    const netBenefit = totalSavings - totalCost;
    const breakEven = netBenefit >= 0;

    let paybackPeriodDays: number | undefined;
    if (netBenefit > 0 && totalCost > 0) {
      const dailyCost = totalCost / periodDays;
      const dailySavings = totalSavings / periodDays;
      const dailyNet = dailySavings - dailyCost;
      if (dailyNet > 0) {
        paybackPeriodDays = Math.ceil(totalCost / dailyNet);
      }
    }

    return {
      period: `${periodDays} days`,
      totalCostCents: totalCost,
      estimatedSavings: {
        engineerTimeSavedHours,
        engineerHourlyRateCents: this.config.costFactors.engineerHourlyRateCents,
        ciDowntimeAvoidedMinutes,
        ciMinuteCostCents: this.config.costFactors.ciMinuteCostCents,
        conflictsPrevented,
        conflictResolutionCostCents: this.config.costFactors.conflictResolutionCostCents,
        totalSavingsCents: totalSavings,
      },
      roi,
      paybackPeriodDays,
      breakEven,
    };
  }

  // ========== PRIVATE HELPERS ==========

  private async loadRecentRuns(): Promise<void> {
    try {
      const content = await fs.readFile(this.config.ledgerPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);

      // Load last 1000 runs into cache
      const recent = lines.slice(-1000);
      for (const line of recent) {
        try {
          const run = JSON.parse(line) as RunCost;
          this.runCostCache.set(run.runId, run);
        } catch {
          // Skip malformed lines
        }
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
      // File doesn't exist yet - that's fine
    }
  }

  private async refreshBudgetPeriods(): Promise<void> {
    const now = new Date();

    for (const [period, budget] of this.budgetCache.entries()) {
      if (now.toISOString() > budget.periodEnd) {
        // Period expired - reset
        const newBudget = this.createNewBudgetPeriod(period, budget.limitCents, budget.alertThresholdPercent, budget.enforced);
        this.budgetCache.set(period, newBudget);
        this.emit('budget-period-reset', newBudget);
      }
    }
  }

  private createNewBudgetPeriod(
    period: CostBudget['period'],
    limitCents: number,
    alertThresholdPercent: number,
    enforced: boolean
  ): CostBudget {
    const now = new Date();
    let periodEnd: Date;

    switch (period) {
      case 'hourly':
        periodEnd = new Date(now.getTime() + 3600000);
        break;
      case 'daily':
        periodEnd = new Date(now.getTime() + 86400000);
        break;
      case 'weekly':
        periodEnd = new Date(now.getTime() + 7 * 86400000);
        break;
      case 'monthly':
        periodEnd = new Date(now.getTime() + 30 * 86400000);
        break;
    }

    return {
      period,
      limitCents,
      currentSpendCents: 0,
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      alertThresholdPercent,
      enforced,
    };
  }

  private async updateBudgets(runCost: RunCost): Promise<void> {
    for (const budget of this.budgetCache.values()) {
      // Only count costs within current period
      if (runCost.timestamp >= budget.periodStart && runCost.timestamp <= budget.periodEnd) {
        budget.currentSpendCents += runCost.totalCost;
      }
    }
  }

  private async detectAnomaly(runCost: RunCost): Promise<CostAnomaly | null> {
    const historicalRuns = await this.getHistoricalRuns(runCost.operation, this.config.anomalyDetection.lookbackRuns);

    if (historicalRuns.length < 10) {
      return null; // Not enough data
    }

    const costs = historicalRuns.map(r => r.totalCost).sort((a, b) => a - b);
    const median = costs[Math.floor(costs.length / 2)] || 0;

    if (median === 0) return null;

    const variance = ((runCost.totalCost - median) / median) * 100;

    // Cost spike detection
    if (variance > this.config.anomalyDetection.spikeThresholdPercent) {
      return {
        runId: runCost.runId,
        detectedAt: new Date().toISOString(),
        anomalyType: 'cost_spike',
        severity: variance > 500 ? 'critical' : variance > 300 ? 'high' : 'medium',
        description: `Cost spike: ${variance.toFixed(0)}% over median`,
        actualCost: runCost.totalCost,
        expectedCost: median,
        variance,
        recommendation: 'Review run logs and cost breakdown. May indicate inefficiency or resource leak.',
      };
    }

    return null;
  }

  private async getHistoricalRuns(operationType: string, limit: number): Promise<RunCost[]> {
    const runs: RunCost[] = [];

    // First check cache
    for (const run of this.runCostCache.values()) {
      if (run.operation === operationType) {
        runs.push(run);
      }
    }

    // If cache has enough, return sorted by timestamp
    if (runs.length >= limit) {
      return runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    }

    // Otherwise read from ledger
    try {
      const content = await fs.readFile(this.config.ledgerPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);

      for (const line of lines.reverse()) {
        try {
          const run = JSON.parse(line) as RunCost;
          if (run.operation === operationType && !this.runCostCache.has(run.runId)) {
            runs.push(run);
            if (runs.length >= limit) break;
          }
        } catch {
          // Skip malformed
        }
      }
    } catch {
      // No ledger file yet
    }

    return runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  private async getRunsSince(cutoff: string): Promise<RunCost[]> {
    const runs: RunCost[] = [];

    // From cache
    for (const run of this.runCostCache.values()) {
      if (run.timestamp >= cutoff) {
        runs.push(run);
      }
    }

    // From ledger (if needed)
    try {
      const content = await fs.readFile(this.config.ledgerPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);

      for (const line of lines) {
        try {
          const run = JSON.parse(line) as RunCost;
          if (run.timestamp >= cutoff && !this.runCostCache.has(run.runId)) {
            runs.push(run);
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // No file
    }

    return runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  private calculateCategoryProportions(runs: RunCost[]): Record<string, number> {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    for (const run of runs) {
      for (const item of run.items) {
        totals[item.category] = (totals[item.category] || 0) + item.amount;
        grandTotal += item.amount;
      }
    }

    const proportions: Record<string, number> = {};
    if (grandTotal > 0) {
      for (const [category, total] of Object.entries(totals)) {
        proportions[category] = total / grandTotal;
      }
    }

    return proportions;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private defaultForecast(operationType: string, metadata: Record<string, unknown>): CostForecast {
    // Default estimates when no history available
    const baseEstimates: Record<string, number> = {
      'frontier_convergence': 5000, // $50
      'pr_merge': 800, // $8
      'batch_prs': 3000, // $30
      'archaeological_analysis': 10000, // $100
      'risk_forecast': 500, // $5
      'entropy_monitoring': 200, // $2
    };

    const estimatedCost = baseEstimates[operationType] || 1000;

    return {
      operationType,
      estimatedCostCents: estimatedCost,
      confidence: 0.5, // Low confidence without history
      breakdown: [
        {
          category: 'ci_compute',
          description: 'Estimated CI compute',
          amount: Math.round(estimatedCost * 0.6),
          quantity: 1,
          unitCost: Math.round(estimatedCost * 0.6),
        },
        {
          category: 'api_calls',
          description: 'Estimated API calls',
          amount: Math.round(estimatedCost * 0.3),
          quantity: 1,
          unitCost: Math.round(estimatedCost * 0.3),
        },
        {
          category: 'other',
          description: 'Other costs',
          amount: Math.round(estimatedCost * 0.1),
          quantity: 1,
          unitCost: Math.round(estimatedCost * 0.1),
        },
      ],
      assumptions: ['No historical data available', 'Using industry averages'],
    };
  }

  private getRunKey(run: RunCost, dimension: 'agent' | 'concern' | 'operation' | 'pr'): string {
    switch (dimension) {
      case 'agent':
        return run.agentId || 'unknown';
      case 'concern':
        return run.concernId || 'unknown';
      case 'operation':
        return run.operation;
      case 'pr':
        return run.prNumbers?.join(',') || 'unknown';
    }
  }
}
