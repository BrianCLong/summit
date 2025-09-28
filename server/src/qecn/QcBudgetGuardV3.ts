/**
 * MC Platform v0.4.3 - QC Budget Guard v3
 *
 * Per-tenant QC minute ceilings, surge protection, and composite cost score
 * with advanced predictive budgeting and automated cost optimization.
 */

export interface QcBudgetLimits {
  minutesMonthly: number;
  minutesUsed: number;
  surgeThreshold: number; // 0-1, percentage of monthly before surge protection
  hardCeiling: number; // Absolute maximum minutes
  emergencyReserve: number; // Reserved minutes for critical operations
  costPerMinute: number; // Base cost per quantum minute
  surgeCostMultiplier: number; // Cost multiplier during surge periods
}

export interface QcUsageMetrics {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  totalMinutesUsed: number;
  classicalMinutes: number;
  emulatorMinutes: number;
  qpuMinutes: number;
  averageCostPerMinute: number;
  totalCost: number;
  peakUsageDay: Date;
  peakUsageMinutes: number;
  projectedMonthlyUsage: number;
  budgetUtilization: number; // 0-1
}

export interface CostOptimizationRecommendation {
  type: 'BACKEND_SWITCH' | 'SCHEDULE_OPTIMIZATION' | 'CIRCUIT_OPTIMIZATION' | 'RESOURCE_POOLING';
  description: string;
  potentialSavings: number; // Minutes or cost
  implementation: 'AUTOMATIC' | 'MANUAL' | 'APPROVAL_REQUIRED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImpact: number; // 0-1 scale
}

export interface BudgetAlert {
  id: string;
  tenantId: string;
  alertType: 'USAGE_WARNING' | 'SURGE_PROTECTION' | 'BUDGET_EXCEEDED' | 'COST_SPIKE' | 'OPTIMIZATION_OPPORTUNITY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  currentUsage: number;
  budgetLimit: number;
  recommendedAction: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface SurgeProtectionPolicy {
  enabled: boolean;
  thresholdPercentage: number; // When to activate surge protection
  protectionActions: ('RATE_LIMIT' | 'COST_INCREASE' | 'QUEUE_DELAY' | 'APPROVE_REQUIRED')[];
  maxQueueDepth: number;
  emergencyBypass: boolean;
  autoResetHours: number;
}

export class QcBudgetGuardV3 {
  private budgetLimits: Map<string, QcBudgetLimits> = new Map();
  private usageMetrics: Map<string, QcUsageMetrics> = new Map();
  private budgetAlerts: BudgetAlert[] = [];
  private surgeProtection: Map<string, SurgeProtectionPolicy> = new Map();
  private costOptimizations: Map<string, CostOptimizationRecommendation[]> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
    this.startBudgetMonitoring();
  }

  private initializeDefaultPolicies(): void {
    // Default surge protection policy
    const defaultSurgePolicy: SurgeProtectionPolicy = {
      enabled: true,
      thresholdPercentage: 0.8,
      protectionActions: ['RATE_LIMIT', 'COST_INCREASE'],
      maxQueueDepth: 10,
      emergencyBypass: false,
      autoResetHours: 24
    };

    // Apply to all tenants by default
    this.surgeProtection.set('default', defaultSurgePolicy);
  }

  /**
   * Set budget limits for a tenant
   */
  async setBudgetLimits(tenantId: string, limits: Partial<QcBudgetLimits>): Promise<void> {
    const currentLimits = this.budgetLimits.get(tenantId) || this.getDefaultBudgetLimits();
    const newLimits = { ...currentLimits, ...limits };

    // Validate budget limits
    await this.validateBudgetLimits(newLimits);

    this.budgetLimits.set(tenantId, newLimits);

    // Check if new limits require immediate alerts
    await this.evaluateBudgetAlerts(tenantId);
  }

  /**
   * Get current budget limits for a tenant
   */
  async getBudgetLimits(tenantId: string): Promise<QcBudgetLimits> {
    return this.budgetLimits.get(tenantId) || this.getDefaultBudgetLimits();
  }

  /**
   * Check if quantum operation is within budget
   */
  async checkBudgetCompliance(
    tenantId: string,
    estimatedMinutes: number,
    operationType: 'CLASSICAL' | 'EMULATOR' | 'QPU'
  ): Promise<{ allowed: boolean; reason?: string; costImpact: number }> {
    const limits = await this.getBudgetLimits(tenantId);
    const metrics = await this.getUsageMetrics(tenantId);

    // Calculate projected usage
    const projectedUsage = metrics.totalMinutesUsed + estimatedMinutes;

    // Check hard ceiling
    if (projectedUsage > limits.hardCeiling) {
      return {
        allowed: false,
        reason: `Hard ceiling exceeded: ${projectedUsage} > ${limits.hardCeiling}`,
        costImpact: this.calculateCostImpact(limits, estimatedMinutes, operationType, true)
      };
    }

    // Check surge protection
    const surgeActive = await this.isSurgeProtectionActive(tenantId);
    if (surgeActive) {
      const surgePolicy = await this.getSurgeProtectionPolicy(tenantId);

      if (surgePolicy.protectionActions.includes('APPROVE_REQUIRED')) {
        return {
          allowed: false,
          reason: 'Surge protection active - approval required',
          costImpact: this.calculateCostImpact(limits, estimatedMinutes, operationType, true)
        };
      }
    }

    // Check emergency reserve
    const nonEmergencyBudget = limits.hardCeiling - limits.emergencyReserve;
    if (projectedUsage > nonEmergencyBudget && !this.isEmergencyOperation(operationType)) {
      return {
        allowed: false,
        reason: 'Non-emergency operations exceed budget, emergency reserve protected',
        costImpact: this.calculateCostImpact(limits, estimatedMinutes, operationType, false)
      };
    }

    return {
      allowed: true,
      costImpact: this.calculateCostImpact(limits, estimatedMinutes, operationType, surgeActive)
    };
  }

  /**
   * Record quantum operation usage
   */
  async recordUsage(
    tenantId: string,
    actualMinutes: number,
    operationType: 'CLASSICAL' | 'EMULATOR' | 'QPU',
    actualCost: number
  ): Promise<void> {
    const limits = await this.getBudgetLimits(tenantId);
    const metrics = await this.getUsageMetrics(tenantId);

    // Update usage metrics
    metrics.totalMinutesUsed += actualMinutes;

    switch (operationType) {
      case 'CLASSICAL':
        metrics.classicalMinutes += actualMinutes;
        break;
      case 'EMULATOR':
        metrics.emulatorMinutes += actualMinutes;
        break;
      case 'QPU':
        metrics.qpuMinutes += actualMinutes;
        break;
    }

    metrics.totalCost += actualCost;
    metrics.averageCostPerMinute = metrics.totalCost / metrics.totalMinutesUsed;
    metrics.budgetUtilization = metrics.totalMinutesUsed / limits.minutesMonthly;

    // Update peak usage if necessary
    const today = new Date();
    const dailyUsage = await this.getDailyUsage(tenantId, today);
    if (dailyUsage > metrics.peakUsageMinutes) {
      metrics.peakUsageDay = today;
      metrics.peakUsageMinutes = dailyUsage;
    }

    // Update projections
    metrics.projectedMonthlyUsage = this.calculateProjectedUsage(metrics);

    this.usageMetrics.set(tenantId, metrics);

    // Update budget limits
    limits.minutesUsed = metrics.totalMinutesUsed;
    this.budgetLimits.set(tenantId, limits);

    // Evaluate alerts and optimizations
    await this.evaluateBudgetAlerts(tenantId);
    await this.generateCostOptimizations(tenantId);
  }

  /**
   * Get usage metrics for a tenant
   */
  async getUsageMetrics(tenantId: string): Promise<QcUsageMetrics> {
    if (!this.usageMetrics.has(tenantId)) {
      // Initialize metrics for new tenant
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const initialMetrics: QcUsageMetrics = {
        tenantId,
        periodStart: monthStart,
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        totalMinutesUsed: 0,
        classicalMinutes: 0,
        emulatorMinutes: 0,
        qpuMinutes: 0,
        averageCostPerMinute: 0.075,
        totalCost: 0,
        peakUsageDay: now,
        peakUsageMinutes: 0,
        projectedMonthlyUsage: 0,
        budgetUtilization: 0
      };

      this.usageMetrics.set(tenantId, initialMetrics);
    }

    return this.usageMetrics.get(tenantId)!;
  }

  /**
   * Get budget alerts for a tenant
   */
  async getBudgetAlerts(tenantId: string, unacknowledgedOnly: boolean = false): Promise<BudgetAlert[]> {
    let alerts = this.budgetAlerts.filter(alert => alert.tenantId === tenantId);

    if (unacknowledgedOnly) {
      alerts = alerts.filter(alert => !alert.acknowledged);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get cost optimization recommendations
   */
  async getCostOptimizations(tenantId: string): Promise<CostOptimizationRecommendation[]> {
    return this.costOptimizations.get(tenantId) || [];
  }

  /**
   * Apply cost optimization automatically
   */
  async applyCostOptimization(tenantId: string, optimizationId: string): Promise<boolean> {
    const optimizations = await this.getCostOptimizations(tenantId);
    const optimization = optimizations.find(o => o.type === optimizationId);

    if (!optimization || optimization.implementation !== 'AUTOMATIC') {
      return false;
    }

    // Apply optimization based on type
    switch (optimization.type) {
      case 'BACKEND_SWITCH':
        // Automatically switch to more cost-effective backend
        await this.updatePreferredBackend(tenantId, 'EMULATOR');
        break;

      case 'SCHEDULE_OPTIMIZATION':
        // Optimize job scheduling for off-peak hours
        await this.enableScheduleOptimization(tenantId);
        break;

      case 'CIRCUIT_OPTIMIZATION':
        // Apply circuit optimization recommendations
        await this.enableCircuitOptimization(tenantId);
        break;

      case 'RESOURCE_POOLING':
        // Enable resource pooling for compatible operations
        await this.enableResourcePooling(tenantId);
        break;
    }

    return true;
  }

  /**
   * Configure surge protection policy
   */
  async configureSurgeProtection(tenantId: string, policy: SurgeProtectionPolicy): Promise<void> {
    this.surgeProtection.set(tenantId, policy);
  }

  /**
   * Check if surge protection is currently active
   */
  async isSurgeProtectionActive(tenantId: string): Promise<boolean> {
    const limits = await this.getBudgetLimits(tenantId);
    const policy = await this.getSurgeProtectionPolicy(tenantId);

    if (!policy.enabled) {
      return false;
    }

    const utilizationPercentage = limits.minutesUsed / limits.minutesMonthly;
    return utilizationPercentage >= policy.thresholdPercentage;
  }

  private getDefaultBudgetLimits(): QcBudgetLimits {
    return {
      minutesMonthly: 100,
      minutesUsed: 0,
      surgeThreshold: 0.8,
      hardCeiling: 120,
      emergencyReserve: 20,
      costPerMinute: 0.075,
      surgeCostMultiplier: 1.5
    };
  }

  private async validateBudgetLimits(limits: QcBudgetLimits): Promise<void> {
    if (limits.minutesMonthly <= 0) {
      throw new Error('Monthly minutes must be positive');
    }

    if (limits.hardCeiling <= limits.minutesMonthly) {
      throw new Error('Hard ceiling must be greater than monthly limit');
    }

    if (limits.emergencyReserve >= limits.hardCeiling) {
      throw new Error('Emergency reserve cannot exceed hard ceiling');
    }

    if (limits.surgeThreshold < 0 || limits.surgeThreshold > 1) {
      throw new Error('Surge threshold must be between 0 and 1');
    }
  }

  private calculateCostImpact(
    limits: QcBudgetLimits,
    estimatedMinutes: number,
    operationType: string,
    surgeActive: boolean
  ): number {
    let costPerMinute = limits.costPerMinute;

    // Adjust cost based on operation type
    switch (operationType) {
      case 'CLASSICAL':
        costPerMinute *= 0.1; // Classical is much cheaper
        break;
      case 'EMULATOR':
        costPerMinute *= 0.5; // Emulator is moderately cheaper
        break;
      case 'QPU':
        costPerMinute *= 2.0; // QPU is most expensive
        break;
    }

    // Apply surge multiplier if active
    if (surgeActive) {
      costPerMinute *= limits.surgeCostMultiplier;
    }

    return estimatedMinutes * costPerMinute;
  }

  private isEmergencyOperation(operationType: string): boolean {
    // Define criteria for emergency operations
    // This could be expanded based on business logic
    return operationType === 'QPU'; // Example: QPU operations might be considered critical
  }

  private async getSurgeProtectionPolicy(tenantId: string): Promise<SurgeProtectionPolicy> {
    return this.surgeProtection.get(tenantId) || this.surgeProtection.get('default')!;
  }

  private async getDailyUsage(tenantId: string, date: Date): Promise<number> {
    // In production, this would query actual usage data for the specific day
    // For now, simulate daily usage
    const metrics = await this.getUsageMetrics(tenantId);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const dayOfMonth = date.getDate();

    return (metrics.totalMinutesUsed / dayOfMonth) * (dayOfMonth / daysInMonth);
  }

  private calculateProjectedUsage(metrics: QcUsageMetrics): number {
    const now = new Date();
    const monthStart = metrics.periodStart;
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)));
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    return (metrics.totalMinutesUsed / daysElapsed) * daysInMonth;
  }

  private async evaluateBudgetAlerts(tenantId: string): Promise<void> {
    const limits = await this.getBudgetLimits(tenantId);
    const metrics = await this.getUsageMetrics(tenantId);

    // Usage warning alerts
    if (metrics.budgetUtilization >= 0.8 && metrics.budgetUtilization < 0.95) {
      this.createAlert(tenantId, 'USAGE_WARNING', 'WARNING',
        `Budget utilization at ${(metrics.budgetUtilization * 100).toFixed(1)}%`,
        'Consider optimizing usage or requesting budget increase');
    }

    // Budget exceeded alerts
    if (metrics.budgetUtilization >= 0.95) {
      this.createAlert(tenantId, 'BUDGET_EXCEEDED', 'CRITICAL',
        `Budget exceeded: ${metrics.totalMinutesUsed}/${limits.minutesMonthly} minutes`,
        'Immediate action required - operations may be restricted');
    }

    // Surge protection alerts
    if (await this.isSurgeProtectionActive(tenantId)) {
      this.createAlert(tenantId, 'SURGE_PROTECTION', 'WARNING',
        'Surge protection active - increased costs and restrictions in effect',
        'Consider deferring non-critical operations');
    }

    // Cost spike detection
    if (metrics.averageCostPerMinute > limits.costPerMinute * 1.5) {
      this.createAlert(tenantId, 'COST_SPIKE', 'WARNING',
        `Cost per minute elevated: $${metrics.averageCostPerMinute.toFixed(3)}`,
        'Review recent operations for cost optimization opportunities');
    }
  }

  private async generateCostOptimizations(tenantId: string): Promise<void> {
    const metrics = await this.getUsageMetrics(tenantId);
    const recommendations: CostOptimizationRecommendation[] = [];

    // Backend switching recommendation
    if (metrics.qpuMinutes > metrics.emulatorMinutes * 2) {
      recommendations.push({
        type: 'BACKEND_SWITCH',
        description: 'Consider using emulator for development and testing workloads',
        potentialSavings: metrics.qpuMinutes * 0.5,
        implementation: 'MANUAL',
        priority: 'MEDIUM',
        estimatedImpact: 0.3
      });
    }

    // Schedule optimization
    if (metrics.peakUsageMinutes > metrics.totalMinutesUsed * 0.3) {
      recommendations.push({
        type: 'SCHEDULE_OPTIMIZATION',
        description: 'Distribute workload across off-peak hours for cost savings',
        potentialSavings: metrics.totalMinutesUsed * 0.15,
        implementation: 'AUTOMATIC',
        priority: 'LOW',
        estimatedImpact: 0.15
      });
    }

    // Circuit optimization
    if (metrics.averageCostPerMinute > 0.1) {
      recommendations.push({
        type: 'CIRCUIT_OPTIMIZATION',
        description: 'Optimize quantum circuits to reduce execution time and cost',
        potentialSavings: metrics.totalMinutesUsed * 0.25,
        implementation: 'APPROVAL_REQUIRED',
        priority: 'HIGH',
        estimatedImpact: 0.25
      });
    }

    this.costOptimizations.set(tenantId, recommendations);
  }

  private createAlert(
    tenantId: string,
    alertType: BudgetAlert['alertType'],
    severity: BudgetAlert['severity'],
    message: string,
    recommendedAction: string
  ): void {
    const alert: BudgetAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      alertType,
      severity,
      message,
      currentUsage: 0, // Will be filled by caller
      budgetLimit: 0,  // Will be filled by caller
      recommendedAction,
      timestamp: new Date(),
      acknowledged: false
    };

    this.budgetAlerts.push(alert);
  }

  private startBudgetMonitoring(): void {
    // Start periodic monitoring (every 5 minutes)
    setInterval(async () => {
      for (const tenantId of this.budgetLimits.keys()) {
        await this.evaluateBudgetAlerts(tenantId);
        await this.generateCostOptimizations(tenantId);
      }
    }, 5 * 60 * 1000);
  }

  // Helper methods for cost optimizations
  private async updatePreferredBackend(tenantId: string, backend: string): Promise<void> {
    // Implementation would update tenant preferences
    console.log(`Updated preferred backend for ${tenantId} to ${backend}`);
  }

  private async enableScheduleOptimization(tenantId: string): Promise<void> {
    // Implementation would enable scheduling optimization
    console.log(`Enabled schedule optimization for ${tenantId}`);
  }

  private async enableCircuitOptimization(tenantId: string): Promise<void> {
    // Implementation would enable circuit optimization
    console.log(`Enabled circuit optimization for ${tenantId}`);
  }

  private async enableResourcePooling(tenantId: string): Promise<void> {
    // Implementation would enable resource pooling
    console.log(`Enabled resource pooling for ${tenantId}`);
  }
}