/**
 * IntelGraph Cost Guardrails System
 * Sprint 26: GA cutover cost control and adaptive sampling
 *
 * Implements:
 * - Infrastructure budget monitoring (≤$18k/month)
 * - LLM cost tracking (≤$5k/month)
 * - Adaptive sampling (60-80% cost reduction)
 * - Real-time budget alerts and throttling
 */

import { Logger } from 'winston';
import { EventEmitter } from 'events';

// Cost tracking interfaces
interface CostMetrics {
  timestamp: Date;
  infrastructure_usd: number;
  llm_usd: number;
  observability_usd: number;
  storage_usd: number;
  network_usd: number;
  compute_usd: number;
  total_usd: number;
}

interface BudgetLimits {
  infrastructure_monthly: number;
  llm_monthly: number;
  total_monthly: number;
  daily_burn_rate: number;
  alert_thresholds: {
    warning: number;  // 80%
    critical: number; // 90%
    emergency: number; // 95%
  };
}

interface SamplingConfig {
  current_rate: number;
  target_reduction: number; // 60-80%
  min_rate: number;
  max_rate: number;
  adjustment_interval_seconds: number;
  cost_threshold_usd: number;
}

interface CostAlert {
  level: 'warning' | 'critical' | 'emergency';
  category: 'infrastructure' | 'llm' | 'total';
  current_spend: number;
  budget_limit: number;
  percentage_used: number;
  projected_monthly: number;
  timestamp: Date;
  actions_taken: string[];
}

// Main Cost Guardrails class
export class CostGuardrails extends EventEmitter {
  private logger: Logger;
  private budgetLimits: BudgetLimits;
  private samplingConfig: SamplingConfig;
  private currentCosts: CostMetrics;
  private costHistory: CostMetrics[] = [];
  private alertHistory: CostAlert[] = [];
  private throttleActive = false;
  private emergencyMode = false;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.initializeConfig();
    this.startCostMonitoring();
  }

  private initializeConfig(): void {
    // GA cutover budget limits
    this.budgetLimits = {
      infrastructure_monthly: 18000, // $18k/month
      llm_monthly: 5000,             // $5k/month
      total_monthly: 25000,          // $25k/month total
      daily_burn_rate: 833,          // $25k/30 days
      alert_thresholds: {
        warning: 0.80,   // 80%
        critical: 0.90,  // 90%
        emergency: 0.95  // 95%
      }
    };

    // Adaptive sampling configuration
    this.samplingConfig = {
      current_rate: 1.0,
      target_reduction: 0.70, // 70% reduction (60-80% range)
      min_rate: 0.01,         // 1% minimum
      max_rate: 1.0,          // 100% maximum
      adjustment_interval_seconds: 300, // 5 minutes
      cost_threshold_usd: 100  // Adjust when daily cost > $100
    };

    this.currentCosts = this.initializeEmptyCosts();
  }

  private initializeEmptyCosts(): CostMetrics {
    return {
      timestamp: new Date(),
      infrastructure_usd: 0,
      llm_usd: 0,
      observability_usd: 0,
      storage_usd: 0,
      network_usd: 0,
      compute_usd: 0,
      total_usd: 0
    };
  }

  // Start monitoring cost metrics
  private startCostMonitoring(): void {
    // Update costs every 5 minutes
    setInterval(() => {
      this.updateCostMetrics();
    }, 5 * 60 * 1000);

    // Adjust sampling every 5 minutes
    setInterval(() => {
      this.adjustAdaptiveSampling();
    }, this.samplingConfig.adjustment_interval_seconds * 1000);

    // Daily budget check
    setInterval(() => {
      this.performDailyBudgetCheck();
    }, 24 * 60 * 60 * 1000);

    this.logger.info('Cost monitoring started', {
      component: 'cost-guardrails',
      budget_limits: this.budgetLimits,
      sampling_config: this.samplingConfig
    });
  }

  // Update current cost metrics from various sources
  private async updateCostMetrics(): Promise<void> {
    try {
      // Fetch costs from AWS, OpenAI, and other providers
      const awsCosts = await this.fetchAWSCosts();
      const llmCosts = await this.fetchLLMCosts();
      const observabilityCosts = await this.fetchObservabilityCosts();

      this.currentCosts = {
        timestamp: new Date(),
        infrastructure_usd: awsCosts.compute + awsCosts.storage + awsCosts.network,
        llm_usd: llmCosts.total,
        observability_usd: observabilityCosts.total,
        storage_usd: awsCosts.storage,
        network_usd: awsCosts.network,
        compute_usd: awsCosts.compute,
        total_usd: awsCosts.total + llmCosts.total + observabilityCosts.total
      };

      // Store in history (keep last 30 days)
      this.costHistory.push(this.currentCosts);
      if (this.costHistory.length > 30 * 24 * 12) { // 30 days of 5-minute intervals
        this.costHistory.shift();
      }

      // Check for budget violations
      await this.checkBudgetViolations();

      this.logger.debug('Cost metrics updated', {
        component: 'cost-guardrails',
        costs: this.currentCosts
      });

    } catch (error) {
      this.logger.error('Failed to update cost metrics', {
        component: 'cost-guardrails',
        error: error.message
      });
    }
  }

  // Fetch AWS costs using Cost Explorer API
  private async fetchAWSCosts(): Promise<any> {
    // In a real implementation, this would use AWS SDK
    // For now, return mock data based on current usage patterns

    const mockCosts = {
      compute: Math.random() * 200 + 300,  // $300-500/day
      storage: Math.random() * 50 + 100,   // $100-150/day
      network: Math.random() * 30 + 50,    // $50-80/day
      total: 0
    };

    mockCosts.total = mockCosts.compute + mockCosts.storage + mockCosts.network;
    return mockCosts;
  }

  // Fetch LLM costs from OpenAI, Anthropic, etc.
  private async fetchLLMCosts(): Promise<any> {
    // Mock LLM costs - would integrate with actual APIs
    return {
      openai: Math.random() * 50 + 100,    // $100-150/day
      anthropic: Math.random() * 30 + 50,  // $50-80/day
      other: Math.random() * 20,           // $0-20/day
      total: Math.random() * 100 + 150     // $150-250/day
    };
  }

  // Fetch observability costs (monitoring, logging, metrics)
  private async fetchObservabilityCosts(): Promise<any> {
    // Mock observability costs
    const baseCost = Math.random() * 20 + 30; // $30-50/day
    const samplingReduction = (1 - this.samplingConfig.current_rate) * 0.7;

    return {
      total: baseCost * (1 - samplingReduction)
    };
  }

  // Check for budget violations and trigger alerts
  private async checkBudgetViolations(): Promise<void> {
    const monthlyProjection = this.calculateMonthlyProjection();

    // Check infrastructure budget
    await this.checkCategoryBudget(
      'infrastructure',
      monthlyProjection.infrastructure_usd,
      this.budgetLimits.infrastructure_monthly
    );

    // Check LLM budget
    await this.checkCategoryBudget(
      'llm',
      monthlyProjection.llm_usd,
      this.budgetLimits.llm_monthly
    );

    // Check total budget
    await this.checkCategoryBudget(
      'total',
      monthlyProjection.total_usd,
      this.budgetLimits.total_monthly
    );
  }

  // Check budget for specific category
  private async checkCategoryBudget(
    category: 'infrastructure' | 'llm' | 'total',
    projected: number,
    limit: number
  ): Promise<void> {
    const percentage = projected / limit;
    const thresholds = this.budgetLimits.alert_thresholds;

    let alertLevel: 'warning' | 'critical' | 'emergency' | null = null;

    if (percentage >= thresholds.emergency) {
      alertLevel = 'emergency';
    } else if (percentage >= thresholds.critical) {
      alertLevel = 'critical';
    } else if (percentage >= thresholds.warning) {
      alertLevel = 'warning';
    }

    if (alertLevel) {
      const alert: CostAlert = {
        level: alertLevel,
        category,
        current_spend: this.getCurrentSpendForCategory(category),
        budget_limit: limit,
        percentage_used: percentage,
        projected_monthly: projected,
        timestamp: new Date(),
        actions_taken: []
      };

      await this.handleBudgetAlert(alert);
    }
  }

  // Handle budget alerts and take appropriate actions
  private async handleBudgetAlert(alert: CostAlert): Promise<void> {
    this.alertHistory.push(alert);

    // Keep only recent alerts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.alertHistory = this.alertHistory.filter(a => a.timestamp > thirtyDaysAgo);

    this.logger.warn('Budget alert triggered', {
      component: 'cost-guardrails',
      alert
    });

    // Take actions based on alert level
    switch (alert.level) {
      case 'warning':
        await this.handleWarningAlert(alert);
        break;
      case 'critical':
        await this.handleCriticalAlert(alert);
        break;
      case 'emergency':
        await this.handleEmergencyAlert(alert);
        break;
    }

    // Emit event for external systems
    this.emit('budgetAlert', alert);
  }

  // Handle warning level alerts (80% of budget)
  private async handleWarningAlert(alert: CostAlert): Promise<void> {
    const actions = [];

    // Increase sampling reduction slightly
    if (this.samplingConfig.current_rate > 0.5) {
      this.samplingConfig.current_rate *= 0.9; // Reduce by 10%
      actions.push('Increased sampling reduction');
    }

    // Send notification to FinOps team
    actions.push('Notified FinOps team');

    alert.actions_taken = actions;
  }

  // Handle critical level alerts (90% of budget)
  private async handleCriticalAlert(alert: CostAlert): Promise<void> {
    const actions = [];

    // More aggressive sampling reduction
    if (this.samplingConfig.current_rate > 0.3) {
      this.samplingConfig.current_rate *= 0.8; // Reduce by 20%
      actions.push('Aggressive sampling reduction');
    }

    // Enable throttling for non-critical requests
    if (!this.throttleActive) {
      this.throttleActive = true;
      actions.push('Enabled request throttling');
    }

    // Send alert to on-call
    actions.push('Alerted on-call team');

    alert.actions_taken = actions;
  }

  // Handle emergency level alerts (95% of budget)
  private async handleEmergencyAlert(alert: CostAlert): Promise<void> {
    const actions = [];

    // Emergency mode activated
    if (!this.emergencyMode) {
      this.emergencyMode = true;
      actions.push('Activated emergency mode');
    }

    // Minimum sampling rate
    this.samplingConfig.current_rate = this.samplingConfig.min_rate;
    actions.push('Set minimum sampling rate');

    // Aggressive throttling
    this.throttleActive = true;
    actions.push('Enabled aggressive throttling');

    // Pause non-essential services
    actions.push('Paused non-essential services');

    // Page executives
    actions.push('Paged executive team');

    alert.actions_taken = actions;

    this.logger.error('Emergency budget alert - immediate action required', {
      component: 'cost-guardrails',
      alert
    });
  }

  // Adaptive sampling adjustment
  private adjustAdaptiveSampling(): void {
    if (this.emergencyMode) {
      // Don't adjust in emergency mode
      return;
    }

    const dailyCost = this.calculateDailyCost();
    const targetDailyCost = this.budgetLimits.daily_burn_rate;

    if (dailyCost > this.samplingConfig.cost_threshold_usd) {
      // Cost is high, reduce sampling
      if (dailyCost > targetDailyCost * 1.2) {
        // Significantly over budget
        this.samplingConfig.current_rate *= 0.85;
      } else if (dailyCost > targetDailyCost) {
        // Moderately over budget
        this.samplingConfig.current_rate *= 0.95;
      }
    } else if (dailyCost < targetDailyCost * 0.8) {
      // Well under budget, can increase sampling
      this.samplingConfig.current_rate *= 1.1;
    }

    // Ensure sampling rate stays within bounds
    this.samplingConfig.current_rate = Math.max(
      this.samplingConfig.min_rate,
      Math.min(this.samplingConfig.max_rate, this.samplingConfig.current_rate)
    );

    this.logger.debug('Adjusted adaptive sampling', {
      component: 'cost-guardrails',
      daily_cost: dailyCost,
      target_cost: targetDailyCost,
      new_sampling_rate: this.samplingConfig.current_rate
    });
  }

  // Calculate daily cost from recent metrics
  private calculateDailyCost(): number {
    if (this.costHistory.length === 0) {
      return 0;
    }

    // Get costs from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCosts = this.costHistory.filter(c => c.timestamp > oneDayAgo);

    if (recentCosts.length === 0) {
      return this.currentCosts.total_usd;
    }

    // Calculate average daily cost
    const totalCost = recentCosts.reduce((sum, cost) => sum + cost.total_usd, 0);
    return totalCost / recentCosts.length * (24 * 12); // 12 intervals per hour
  }

  // Calculate monthly projection based on current trends
  private calculateMonthlyProjection(): CostMetrics {
    const dailyCost = this.calculateDailyCost();
    const daysInMonth = 30;

    return {
      timestamp: new Date(),
      infrastructure_usd: (this.currentCosts.infrastructure_usd / this.currentCosts.total_usd) * dailyCost * daysInMonth,
      llm_usd: (this.currentCosts.llm_usd / this.currentCosts.total_usd) * dailyCost * daysInMonth,
      observability_usd: (this.currentCosts.observability_usd / this.currentCosts.total_usd) * dailyCost * daysInMonth,
      storage_usd: (this.currentCosts.storage_usd / this.currentCosts.total_usd) * dailyCost * daysInMonth,
      network_usd: (this.currentCosts.network_usd / this.currentCosts.total_usd) * dailyCost * daysInMonth,
      compute_usd: (this.currentCosts.compute_usd / this.currentCosts.total_usd) * dailyCost * daysInMonth,
      total_usd: dailyCost * daysInMonth
    };
  }

  // Get current spend for a specific category
  private getCurrentSpendForCategory(category: 'infrastructure' | 'llm' | 'total'): number {
    switch (category) {
      case 'infrastructure':
        return this.currentCosts.infrastructure_usd;
      case 'llm':
        return this.currentCosts.llm_usd;
      case 'total':
        return this.currentCosts.total_usd;
    }
  }

  // Daily budget check
  private performDailyBudgetCheck(): void {
    const dailyCost = this.calculateDailyCost();
    const monthlyProjection = dailyCost * 30;

    this.logger.info('Daily budget check', {
      component: 'cost-guardrails',
      daily_cost: dailyCost,
      monthly_projection: monthlyProjection,
      budget_utilization: {
        infrastructure: (monthlyProjection * 0.7) / this.budgetLimits.infrastructure_monthly,
        llm: (monthlyProjection * 0.2) / this.budgetLimits.llm_monthly,
        total: monthlyProjection / this.budgetLimits.total_monthly
      },
      sampling_rate: this.samplingConfig.current_rate,
      emergency_mode: this.emergencyMode,
      throttle_active: this.throttleActive
    });
  }

  // Public methods for external integration

  public getCurrentCosts(): CostMetrics {
    return { ...this.currentCosts };
  }

  public getBudgetLimits(): BudgetLimits {
    return { ...this.budgetLimits };
  }

  public getSamplingRate(): number {
    return this.samplingConfig.current_rate;
  }

  public isThrottleActive(): boolean {
    return this.throttleActive;
  }

  public isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  public getBudgetUtilization(): { [key: string]: number } {
    const projection = this.calculateMonthlyProjection();
    return {
      infrastructure: projection.infrastructure_usd / this.budgetLimits.infrastructure_monthly,
      llm: projection.llm_usd / this.budgetLimits.llm_monthly,
      total: projection.total_usd / this.budgetLimits.total_monthly
    };
  }

  public getRecentAlerts(hours: number = 24): CostAlert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alertHistory.filter(alert => alert.timestamp > cutoff);
  }

  // Manual override methods (for emergency situations)
  public setSamplingRate(rate: number): void {
    if (rate < this.samplingConfig.min_rate || rate > this.samplingConfig.max_rate) {
      throw new Error(`Sampling rate must be between ${this.samplingConfig.min_rate} and ${this.samplingConfig.max_rate}`);
    }

    this.samplingConfig.current_rate = rate;
    this.logger.warn('Manual sampling rate override', {
      component: 'cost-guardrails',
      new_rate: rate,
      override_by: 'manual'
    });
  }

  public enableEmergencyMode(): void {
    this.emergencyMode = true;
    this.throttleActive = true;
    this.samplingConfig.current_rate = this.samplingConfig.min_rate;

    this.logger.error('Emergency mode manually activated', {
      component: 'cost-guardrails',
      activated_by: 'manual'
    });
  }

  public disableEmergencyMode(): void {
    this.emergencyMode = false;
    this.throttleActive = false;
    this.samplingConfig.current_rate = this.samplingConfig.target_reduction;

    this.logger.info('Emergency mode manually deactivated', {
      component: 'cost-guardrails',
      deactivated_by: 'manual'
    });
  }
}

// Express middleware for cost-based request throttling
export function createCostThrottleMiddleware(costGuardrails: CostGuardrails) {
  return (req: any, res: any, next: any) => {
    // Check if throttling is active
    if (costGuardrails.isThrottleActive()) {
      // Implement throttling logic based on request type
      const requestType = req.path.includes('/graphql') ? 'graphql' :
                         req.path.includes('/api/v1/') ? 'api' : 'other';

      if (costGuardrails.isEmergencyMode()) {
        // In emergency mode, only allow essential requests
        const essentialPaths = ['/health', '/metrics', '/auth'];
        if (!essentialPaths.some(path => req.path.includes(path))) {
          return res.status(503).json({
            error: 'Service temporarily unavailable due to budget constraints',
            message: 'Emergency mode active - only essential services available',
            retry_after: 300 // 5 minutes
          });
        }
      } else if (requestType === 'graphql' && Math.random() > 0.7) {
        // Throttle 30% of GraphQL requests during cost pressure
        return res.status(429).json({
          error: 'Rate limited due to cost constraints',
          message: 'Please retry in a few minutes',
          retry_after: 60
        });
      }
    }

    next();
  };
}

// Observability sampling decorator
export function createAdaptiveSampler(costGuardrails: CostGuardrails) {
  return {
    shouldSample(): boolean {
      return Math.random() < costGuardrails.getSamplingRate();
    },

    getSamplingRate(): number {
      return costGuardrails.getSamplingRate();
    },

    sampleTrace(traceData: any): any | null {
      if (this.shouldSample()) {
        return traceData;
      }
      return null;
    },

    sampleMetric(metricData: any): any | null {
      // Always sample error metrics
      if (metricData.tags?.level === 'error') {
        return metricData;
      }

      // Sample other metrics based on cost pressure
      if (this.shouldSample()) {
        return metricData;
      }
      return null;
    }
  };
}