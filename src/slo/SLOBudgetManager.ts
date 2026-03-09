import { EventEmitter } from 'events';
import { promises as fs } from 'fs';

export interface ServiceLevelObjective {
  id: string;
  name: string;
  service: string;
  metric: string;
  target: number;
  timeWindow: string; // '1d', '7d', '30d'
  budgetRemaining: number;
  alertThreshold: number; // 0.0-1.0, alert when budget < threshold
  escalationThreshold: number; // 0.0-1.0, escalate when budget < threshold
  killSwitchThreshold: number; // 0.0-1.0, kill switch when budget < threshold
  status: 'healthy' | 'warning' | 'critical' | 'emergency';
}

export interface ErrorBudget {
  sloId: string;
  totalBudget: number;
  consumedBudget: number;
  remainingBudget: number;
  burnRate: number; // budget consumed per hour
  projectedExhaustion: Date | null;
  violations: BudgetViolation[];
}

export interface BudgetViolation {
  timestamp: Date;
  impact: number; // amount of budget consumed
  duration: number; // duration in seconds
  cause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface KillSwitch {
  id: string;
  name: string;
  trigger: KillSwitchTrigger;
  actions: KillSwitchAction[];
  status: 'armed' | 'triggered' | 'disabled';
  lastTriggered?: Date;
  triggerCount: number;
  cooldownPeriod: number; // seconds before switch can be triggered again
}

export interface KillSwitchTrigger {
  type: 'slo-budget' | 'error-rate' | 'latency' | 'manual';
  conditions: TriggerCondition[];
  operator: 'AND' | 'OR';
}

export interface TriggerCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  duration?: number; // condition must persist for this duration
}

export interface KillSwitchAction {
  type:
    | 'stop-deployment'
    | 'rollback'
    | 'circuit-breaker'
    | 'alert'
    | 'scale-down'
    | 'redirect-traffic';
  parameters: { [key: string]: any };
  priority: number;
  timeout: number;
}

export interface SLOMetrics {
  timestamp: Date;
  service: string;
  metric: string;
  value: number;
  success: boolean;
}

export interface BudgetReport {
  period: string;
  slos: SLOSummary[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  recommendedActions: string[];
  budgetTrends: BudgetTrend[];
}

export interface SLOSummary {
  slo: ServiceLevelObjective;
  budget: ErrorBudget;
  trend: 'improving' | 'stable' | 'degrading';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface BudgetTrend {
  sloId: string;
  timeframe: string;
  startBudget: number;
  endBudget: number;
  avgBurnRate: number;
  maxBurnRate: number;
}

export class SLOBudgetManager extends EventEmitter {
  private slos: Map<string, ServiceLevelObjective> = new Map();
  private budgets: Map<string, ErrorBudget> = new Map();
  private killSwitches: Map<string, KillSwitch> = new Map();
  private metrics: SLOMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  async defineSLO(
    sloConfig: Partial<ServiceLevelObjective>,
  ): Promise<ServiceLevelObjective> {
    const slo: ServiceLevelObjective = {
      id: sloConfig.id || `slo-${Date.now()}`,
      name: sloConfig.name || 'Unnamed SLO',
      service: sloConfig.service || 'unknown-service',
      metric: sloConfig.metric || 'availability',
      target: sloConfig.target || 0.99,
      timeWindow: sloConfig.timeWindow || '30d',
      budgetRemaining: 1.0,
      alertThreshold: sloConfig.alertThreshold || 0.2,
      escalationThreshold: sloConfig.escalationThreshold || 0.1,
      killSwitchThreshold: sloConfig.killSwitchThreshold || 0.02,
      status: 'healthy',
    };

    this.slos.set(slo.id, slo);

    // Initialize error budget
    const budget: ErrorBudget = {
      sloId: slo.id,
      totalBudget: this.calculateTotalBudget(slo),
      consumedBudget: 0,
      remainingBudget: this.calculateTotalBudget(slo),
      burnRate: 0,
      projectedExhaustion: null,
      violations: [],
    };

    this.budgets.set(slo.id, budget);
    this.emit('slo-defined', slo);

    return slo;
  }

  async createKillSwitch(config: Partial<KillSwitch>): Promise<KillSwitch> {
    const killSwitch: KillSwitch = {
      id: config.id || `killswitch-${Date.now()}`,
      name: config.name || 'Emergency Kill Switch',
      trigger: config.trigger || {
        type: 'slo-budget',
        conditions: [
          { metric: 'budget-remaining', operator: '<', threshold: 0.05 },
        ],
        operator: 'AND',
      },
      actions: config.actions || [
        {
          type: 'stop-deployment',
          parameters: {},
          priority: 1,
          timeout: 300,
        },
      ],
      status: 'armed',
      triggerCount: 0,
      cooldownPeriod: config.cooldownPeriod || 3600, // 1 hour default
    };

    this.killSwitches.set(killSwitch.id, killSwitch);
    this.emit('killswitch-created', killSwitch);

    return killSwitch;
  }

  async recordMetric(metric: SLOMetrics): Promise<void> {
    this.metrics.push(metric);

    // Keep only recent metrics (last 30 days)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);

    // Update relevant SLOs
    const relevantSLOs = Array.from(this.slos.values()).filter(
      (slo) => slo.service === metric.service && slo.metric === metric.metric,
    );

    for (const slo of relevantSLOs) {
      await this.updateSLOBudget(slo, metric);
    }

    this.emit('metric-recorded', metric);
  }

  async updateSLOBudget(
    slo: ServiceLevelObjective,
    metric: SLOMetrics,
  ): Promise<void> {
    const budget = this.budgets.get(slo.id);
    if (!budget) return;

    // Calculate if this metric represents a budget violation
    const isViolation = !metric.success || metric.value < slo.target;

    if (isViolation) {
      const impact = this.calculateBudgetImpact(slo, metric);

      budget.consumedBudget += impact;
      budget.remainingBudget = budget.totalBudget - budget.consumedBudget;

      const violation: BudgetViolation = {
        timestamp: metric.timestamp,
        impact,
        duration: 1, // Simplified - would calculate actual duration
        cause: `${metric.metric} violation: ${metric.value}`,
        severity: this.determineSeverity(impact, budget.totalBudget),
        resolved: false,
      };

      budget.violations.push(violation);
    }

    // Update burn rate (violations per hour over last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentViolations = budget.violations.filter(
      (v) => v.timestamp > last24h,
    );
    budget.burnRate = recentViolations.reduce((sum, v) => sum + v.impact, 0);

    // Project budget exhaustion
    if (budget.burnRate > 0) {
      const hoursToExhaustion = budget.remainingBudget / budget.burnRate;
      budget.projectedExhaustion = new Date(
        Date.now() + hoursToExhaustion * 60 * 60 * 1000,
      );
    } else {
      budget.projectedExhaustion = null;
    }

    // Update SLO status
    slo.budgetRemaining = budget.remainingBudget / budget.totalBudget;
    this.updateSLOStatus(slo);

    // Check kill switch conditions
    await this.evaluateKillSwitches(slo, budget);

    this.emit('budget-updated', { slo, budget });
  }

  async evaluateKillSwitches(
    slo?: ServiceLevelObjective,
    budget?: ErrorBudget,
  ): Promise<void> {
    const currentTime = Date.now();

    for (const killSwitch of this.killSwitches.values()) {
      if (killSwitch.status !== 'armed') continue;

      // Check cooldown
      if (killSwitch.lastTriggered) {
        const timeSinceLastTrigger =
          (currentTime - killSwitch.lastTriggered.getTime()) / 1000;
        if (timeSinceLastTrigger < killSwitch.cooldownPeriod) continue;
      }

      const shouldTrigger = await this.evaluateTriggerConditions(
        killSwitch.trigger,
        slo,
        budget,
      );

      if (shouldTrigger) {
        await this.triggerKillSwitch(killSwitch);
      }
    }
  }

  private async triggerKillSwitch(killSwitch: KillSwitch): Promise<void> {
    killSwitch.status = 'triggered';
    killSwitch.lastTriggered = new Date();
    killSwitch.triggerCount++;

    this.emit('killswitch-triggered', killSwitch);

    // Execute actions in priority order
    const sortedActions = [...killSwitch.actions].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const action of sortedActions) {
      try {
        await this.executeKillSwitchAction(action);
        this.emit('killswitch-action-executed', { killSwitch, action });
      } catch (error) {
        this.emit('killswitch-action-failed', { killSwitch, action, error });
      }
    }

    // Re-arm after actions complete
    setTimeout(() => {
      if (killSwitch.status === 'triggered') {
        killSwitch.status = 'armed';
        this.emit('killswitch-rearmed', killSwitch);
      }
    }, 60000); // Re-arm after 1 minute
  }

  private async executeKillSwitchAction(
    action: KillSwitchAction,
  ): Promise<void> {
    switch (action.type) {
      case 'stop-deployment':
        await this.stopDeployment(action.parameters);
        break;
      case 'rollback':
        await this.performRollback(action.parameters);
        break;
      case 'circuit-breaker':
        await this.activateCircuitBreaker(action.parameters);
        break;
      case 'alert':
        await this.sendAlert(action.parameters);
        break;
      case 'scale-down':
        await this.scaleDown(action.parameters);
        break;
      case 'redirect-traffic':
        await this.redirectTraffic(action.parameters);
        break;
    }
  }

  async generateBudgetReport(period: string = '7d'): Promise<BudgetReport> {
    const summaries: SLOSummary[] = [];
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendedActions: string[] = [];

    for (const slo of this.slos.values()) {
      const budget = this.budgets.get(slo.id);
      if (!budget) continue;

      const trend = this.calculateBudgetTrend(slo, period);
      const riskLevel = this.assessRiskLevel(slo, budget);

      summaries.push({
        slo,
        budget,
        trend,
        riskLevel,
      });

      // Update overall health
      if (slo.status === 'critical' && overallHealth !== 'critical') {
        overallHealth = 'critical';
      } else if (slo.status === 'warning' && overallHealth === 'healthy') {
        overallHealth = 'warning';
      }

      // Generate recommendations
      if (
        budget.projectedExhaustion &&
        budget.projectedExhaustion < new Date(Date.now() + 24 * 60 * 60 * 1000)
      ) {
        recommendedActions.push(
          `Urgent: ${slo.name} budget will be exhausted within 24 hours`,
        );
      } else if (slo.budgetRemaining < slo.alertThreshold) {
        recommendedActions.push(
          `Monitor: ${slo.name} is approaching budget threshold`,
        );
      }
    }

    const budgetTrends = summaries.map((s) => ({
      sloId: s.slo.id,
      timeframe: period,
      startBudget: s.budget.totalBudget,
      endBudget: s.budget.remainingBudget,
      avgBurnRate: s.budget.burnRate,
      maxBurnRate: s.budget.burnRate * 1.5, // Simplified estimation
    }));

    return {
      period,
      slos: summaries,
      overallHealth,
      recommendedActions,
      budgetTrends,
    };
  }

  startMonitoring(intervalSeconds: number = 60): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        this.emit('monitoring-error', error);
      }
    }, intervalSeconds * 1000);

    this.emit('monitoring-started', { interval: intervalSeconds });
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit('monitoring-stopped');
    }
  }

  private async performMonitoringCycle(): Promise<void> {
    // Evaluate all kill switches
    await this.evaluateKillSwitches();

    // Check for budget threshold violations
    for (const slo of this.slos.values()) {
      const budget = this.budgets.get(slo.id);
      if (!budget) continue;

      if (
        slo.budgetRemaining < slo.escalationThreshold &&
        slo.status !== 'emergency'
      ) {
        this.emit('budget-escalation', { slo, budget });
      } else if (
        slo.budgetRemaining < slo.alertThreshold &&
        slo.status === 'healthy'
      ) {
        this.emit('budget-alert', { slo, budget });
      }
    }

    this.emit('monitoring-cycle-complete');
  }

  private calculateTotalBudget(slo: ServiceLevelObjective): number {
    // Calculate error budget based on SLO target and time window
    const availabilityTarget = slo.target;
    const allowedFailureRate = 1 - availabilityTarget;

    // Convert time window to budget units
    const timeMultipliers: { [key: string]: number } = {
      '1d': 24 * 60, // 1440 minutes
      '7d': 7 * 24 * 60, // 10080 minutes
      '30d': 30 * 24 * 60, // 43200 minutes
    };

    const totalTime = timeMultipliers[slo.timeWindow] || timeMultipliers['30d'];
    return allowedFailureRate * totalTime;
  }

  private calculateBudgetImpact(
    slo: ServiceLevelObjective,
    metric: SLOMetrics,
  ): number {
    // Simplified impact calculation - would be more sophisticated in practice
    if (!metric.success) return 1.0; // 1 minute of downtime

    const shortfall = slo.target - metric.value;
    return Math.max(0, shortfall * 60); // Convert to minutes
  }

  private determineSeverity(
    impact: number,
    totalBudget: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = impact / totalBudget;
    if (ratio > 0.1) return 'critical';
    if (ratio > 0.05) return 'high';
    if (ratio > 0.01) return 'medium';
    return 'low';
  }

  private updateSLOStatus(slo: ServiceLevelObjective): void {
    if (slo.budgetRemaining < slo.killSwitchThreshold) {
      slo.status = 'emergency';
    } else if (slo.budgetRemaining < slo.escalationThreshold) {
      slo.status = 'critical';
    } else if (slo.budgetRemaining < slo.alertThreshold) {
      slo.status = 'warning';
    } else {
      slo.status = 'healthy';
    }
  }

  private async evaluateTriggerConditions(
    trigger: KillSwitchTrigger,
    slo?: ServiceLevelObjective,
    budget?: ErrorBudget,
  ): Promise<boolean> {
    const conditionResults: boolean[] = [];

    for (const condition of trigger.conditions) {
      let actualValue: number;

      switch (condition.metric) {
        case 'budget-remaining':
          actualValue = budget
            ? budget.remainingBudget / budget.totalBudget
            : 1.0;
          break;
        case 'burn-rate':
          actualValue = budget ? budget.burnRate : 0;
          break;
        case 'error-rate':
          actualValue = this.calculateCurrentErrorRate();
          break;
        default:
          actualValue = 0;
      }

      const conditionMet = this.evaluateCondition(actualValue, condition);
      conditionResults.push(conditionMet);
    }

    return trigger.operator === 'AND'
      ? conditionResults.every((r) => r)
      : conditionResults.some((r) => r);
  }

  private evaluateCondition(
    value: number,
    condition: TriggerCondition,
  ): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.threshold;
      case '<':
        return value < condition.threshold;
      case '>=':
        return value >= condition.threshold;
      case '<=':
        return value <= condition.threshold;
      case '==':
        return Math.abs(value - condition.threshold) < 0.001;
      default:
        return false;
    }
  }

  private calculateCurrentErrorRate(): number {
    // Calculate error rate from recent metrics
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp > new Date(Date.now() - 60 * 60 * 1000), // Last hour
    );

    if (recentMetrics.length === 0) return 0;

    const failures = recentMetrics.filter((m) => !m.success).length;
    return failures / recentMetrics.length;
  }

  private calculateBudgetTrend(
    slo: ServiceLevelObjective,
    period: string,
  ): 'improving' | 'stable' | 'degrading' {
    const budget = this.budgets.get(slo.id);
    if (!budget) return 'stable';

    // Simplified trend calculation
    if (budget.burnRate > budget.totalBudget * 0.1) return 'degrading';
    if (budget.burnRate < budget.totalBudget * 0.02) return 'improving';
    return 'stable';
  }

  private assessRiskLevel(
    slo: ServiceLevelObjective,
    budget: ErrorBudget,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (slo.budgetRemaining < slo.killSwitchThreshold) return 'critical';
    if (slo.budgetRemaining < slo.escalationThreshold) return 'high';
    if (slo.budgetRemaining < slo.alertThreshold) return 'medium';
    return 'low';
  }

  // Kill switch action implementations (simplified)
  private async stopDeployment(params: any): Promise<void> {
    // Implementation would integrate with CI/CD system
    console.log('KILL SWITCH: Stopping deployment', params);
  }

  private async performRollback(params: any): Promise<void> {
    // Implementation would trigger rollback procedures
    console.log('KILL SWITCH: Performing rollback', params);
  }

  private async activateCircuitBreaker(params: any): Promise<void> {
    // Implementation would activate circuit breaker
    console.log('KILL SWITCH: Activating circuit breaker', params);
  }

  private async sendAlert(params: any): Promise<void> {
    // Implementation would send alerts via configured channels
    console.log('KILL SWITCH: Sending alert', params);
  }

  private async scaleDown(params: any): Promise<void> {
    // Implementation would scale down services
    console.log('KILL SWITCH: Scaling down', params);
  }

  private async redirectTraffic(params: any): Promise<void> {
    // Implementation would redirect traffic
    console.log('KILL SWITCH: Redirecting traffic', params);
  }
}
