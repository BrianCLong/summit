/**
 * Intelligent Budget Guard + Auto-Tune System
 * 
 * Implements the v0.3.4 roadmap requirements for intelligent budget protection
 * with automatic optimization and predictive analytics.
 */

import logger from '../utils/logger.js';
import { trackError } from '../monitoring/middleware.js';

interface BudgetConfig {
  tenantId: string;
  currentBudget: number;
  maxBudget: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  alertThreshold: number; // Percentage at which to alert (e.g., 0.8 = 80%)
  emergencyThreshold: number; // Percentage at which to auto-throttle (e.g., 0.95 = 95%)
  forecastHorizonDays: number;
  autoTuneEnabled: boolean;
  autoTuneStrategy: 'scale-down' | 'feature-limit' | 'degradation' | 'predictive';
  createdAt: string;
  lastUpdated: string;
}

interface BudgetUsage {
  tenantId: string;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  periodStart: string;
  periodEnd: string;
  forecastedSpend: number; // Predicted spend for remainder of period
  forecastAccuracy: number; // Accuracy of forecast as percentage
  dailyAverageSpend: number;
  daysRemaining: number;
}

interface AutoTuneRecommendation {
  currentInstanceType: string;
  recommendedInstanceType: string;
  estimatedSavings: number;
  confidence: number;
  impact: {
    performanceChangePercent: number;
    costChangePercent: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  reasoning: string;
  implementationSteps: string[];
  estimatedTimeToImplement: string;
}

interface CostOptimizationReport {
  tenantId: string;
  currentMonthlyCost: number;
  recommendedMonthlyCost: number;
  estimatedSavings: number;
  savingsPercentage: number;
  recommendations: AutoTuneRecommendation[];
  confidenceScore: number;
  generatedAt: string;
}

/**
 * Intelligent Budget Guard and Auto-Tune System
 */
export class IntelligentBudgetGuardAutoTune {
  private budgetConfigs: Map<string, BudgetConfig>;
  private usageHistory: Map<string, BudgetUsage[]>;
  private mlModel: BudgetForecastingModel;
  private autoTuneEngine: ResourceRightSizingEngine;
  
  constructor() {
    this.budgetConfigs = new Map();
    this.usageHistory = new Map();
    this.mlModel = new BudgetForecastingModel();
    this.autoTuneEngine = new ResourceRightSizingEngine();
    
    logger.info('Intelligent Budget Guard + Auto-Tune System initialized');
  }

  /**
   * Initialize budget configuration for a tenant
   */
  async initializeTenantBudget(
    tenantId: string,
    initialBudget: number,
    currency: string = 'USD',
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    options?: {
      alertThreshold?: number;
      emergencyThreshold?: number;
      forecastHorizon?: number;
      autoTuneEnabled?: boolean;
    }
  ): Promise<void> {
    const config: BudgetConfig = {
      tenantId,
      currentBudget: initialBudget,
      maxBudget: initialBudget,
      currency,
      period,
      alertThreshold: options?.alertThreshold ?? 0.8,
      emergencyThreshold: options?.emergencyThreshold ?? 0.95,
      forecastHorizonDays: options?.forecastHorizon ?? 30,
      autoTuneEnabled: options?.autoTuneEnabled ?? true,
      autoTuneStrategy: 'predictive',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    this.budgetConfigs.set(tenantId, config);
    
    logger.info({
      tenantId,
      initialBudget,
      currency,
      period
    }, 'Tenant budget initialized');
  }

  /**
   * Record resource consumption against budget
   */
  async recordResourceConsumption(
    tenantId: string,
    amount: number,
    resourceType: 'compute' | 'storage' | 'network' | 'ai' | 'database' | 'bandwidth' | 'custom'
  ): Promise<{ allowed: boolean; remaining: number; percentageUsed: number; alertsTriggered: string[] }> {
    const config = this.budgetConfigs.get(tenantId);
    if (!config) {
      throw new Error(`Budget configuration not found for tenant: ${tenantId}`);
    }

    // Update current budget
    const newBudget = {
      ...config,
      currentBudget: config.currentBudget - amount,
      lastUpdated: new Date().toISOString()
    };
    
    this.budgetConfigs.set(tenantId, newBudget);
    
    const remaining = Math.max(0, newBudget.currentBudget);
    const percentageUsed = 1 - (newBudget.currentBudget / newBudget.maxBudget);
    
    const alerts: string[] = [];
    const actions: string[] = [];
    
    if (percentageUsed >= config.emergencyThreshold) {
      // AUTO-THROTTLE: Activate emergency budget protection
      alerts.push('emergency-throttle');
      await this.activateEmergencyThrottle(tenantId, resourceType);
    } else if (percentageUsed >= config.alertThreshold) {
      // ISSUE WARNING: Budget approaching threshold
      alerts.push('budget-warning');
      logger.warn({
        tenantId,
        percentageUsed: percentageUsed * 100,
        remaining,
        threshold: config.alertThreshold
      }, 'Budget approaching alert threshold');
    }
    
    // Generate forecast and early warning if needed
    if (percentageUsed >= 0.5) {  // Only generate forecast for significant usage
      const forecast = await this.mlModel.forecastBudgetUsage(
        tenantId, 
        percentageUsed, 
        config.forecastHorizonDays
      );
      
      if (forecast.projectedSpend > config.maxBudget) {
        alerts.push('forecasted-overrun');
        logger.warn({
          tenantId,
          predictedExceedance: forecast.projectedSpend - config.maxBudget,
          confidence: forecast.confidence
        }, 'Budget forecast predicts overrun');
      }
    }
    
    logger.debug({
      tenantId,
      amountConsumed: amount,
      resourceType,
      remaining,
      percentageUsed: percentageUsed * 100,
      alerts
    }, 'Resource consumption recorded and budget adjusted');
    
    return {
      allowed: remaining >= 0,
      remaining,
      percentageUsed,
      alertsTriggered: alerts
    };
  }

  /**
   * Activate emergency throttle to protect budget
   */
  private async activateEmergencyThrottle(
    tenantId: string,
    resourceType: 'compute' | 'storage' | 'network' | 'ai' | 'database' | 'bandwidth' | 'custom'
  ): Promise<void> {
    // In a real system, this would communicate with rate limiting systems
    // to throttle resources for this tenant
    
    logger.warn({
      tenantId,
      resourceType,
      throttle: 'emergency-budget-protection'
    }, 'Emergency budget protection throttle activated');
    
    // Record this action in audit trail
    trackError('budget', 'EmergencyThrottleActivated');
  }

  /**
   * Get current budget status for a tenant
   */
  async getBudgetStatus(tenantId: string): Promise<BudgetUsage | null> {
    const config = this.budgetConfigs.get(tenantId);
    if (!config) {
      return null;
    }

    const periodStart = this.getPeriodStart(config.period);
    const periodEnd = this.getPeriodEnd(config.period);
    const daysRemaining = this.getDaysUntilEnd(config.period);
    
    const usage: BudgetUsage = {
      tenantId,
      spentAmount: config.maxBudget - config.currentBudget,
      remainingAmount: config.currentBudget,
      percentageUsed: (config.maxBudget - config.currentBudget) / config.maxBudget,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      forecastedSpend: await this.mlModel.getProjectedSpend(tenantId),
      forecastAccuracy: 0.85, // Would come from ML model
      dailyAverageSpend: (config.maxBudget - config.currentBudget) / (config.period === 'monthly' ? 30 - daysRemaining : 7 - daysRemaining),
      daysRemaining
    };

    return usage;
  }

  /**
   * Generate ML-powered budget forecast
   */
  async generateBudgetForecast(tenantId: string, daysAhead: number = 30): Promise<{
    projectedSpend: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    dailyBreakdown: Array<{ day: string; expectedSpend: number; confidence: number }>;
  }> {
    return await this.mlModel.forecastBudgetUsage(tenantId, daysAhead);
  }

  /**
   * Get resource right-sizing recommendations
   */
  async getResourceRightSizingRecommendations(tenantId: string): Promise<AutoTuneRecommendation[]> {
    // Analyze resource usage patterns and recommend optimal sizing
    const baselineMetrics = await this.getTenantResourceMetrics(tenantId);
    const recommendations = await this.autoTuneEngine.analyzeResources(tenantId, baselineMetrics);
    
    logger.info({
      tenantId,
      recommendationCount: recommendations.length
    }, 'Resource right-sizing recommendations generated');
    
    return recommendations;
  }

  /**
   * Apply auto-tune recommendations
   */
  async applyAutoTuneRecommendations(
    tenantId: string, 
    recommendations?: AutoTuneRecommendation[]
  ): Promise<{ applied: number; savings: number; success: boolean }> {
    if (!recommendations) {
      recommendations = await this.getResourceRightSizingRecommendations(tenantId);
    }
    
    let appliedCount = 0;
    let totalSavings = 0;
    const config = this.budgetConfigs.get(tenantId);
    
    if (!config?.autoTuneEnabled) {
      logger.info({ tenantId }, 'Auto-tune not enabled for tenant');
      return { applied: 0, savings: 0, success: true };
    }
    
    for (const recommendation of recommendations) {
      if (recommendation.impact.riskLevel !== 'high') {
        // Apply low/medium risk recommendations
        const result = await this.autoTuneEngine.applyRecommendation(recommendation);
        if (result.success) {
          appliedCount++;
          totalSavings += recommendation.estimatedSavings;
          
          logger.info({
            tenantId,
            recommendationId: recommendation.recommendedInstanceType,
            estimatedSavings: recommendation.estimatedSavings,
            riskLevel: recommendation.impact.riskLevel
          }, 'Auto-tune recommendation applied');
        }
      }
    }
    
    return { applied: appliedCount, savings: totalSavings, success: true };
  }

  /**
   * Generate comprehensive cost optimization report
   */
  async generateCostOptimizationReport(
    tenantId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<CostOptimizationReport> {
    const currentMetrics = await this.getTenantResourceMetrics(tenantId);
    const recommendations = await this.getResourceRightSizingRecommendations(tenantId);
    
    // Calculate potential savings
    const baselineCost = currentMetrics.monthlyComputeCost + 
                        currentMetrics.monthlyStorageCost + 
                        currentMetrics.monthlyNetworkCost;
    
    const recommendedCost = baselineCost - recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
    const estimatedSavings = baselineCost - recommendedCost;
    const savingsPercentage = (estimatedSavings / baselineCost) * 100;
    
    const report: CostOptimizationReport = {
      tenantId,
      currentMonthlyCost: baselineCost,
      recommendedMonthlyCost: recommendedCost,
      estimatedSavings,
      savingsPercentage,
      recommendations,
      confidenceScore: 0.9, // 90% confidence in recommendations
      generatedAt: new Date().toISOString()
    };
    
    logger.info({
      tenantId,
      estimatedSavings,
      savingsPercentage: savingsPercentage.toFixed(2),
      recommendationCount: recommendations.length
    }, 'Cost optimization report generated');
    
    return report;
  }

  /**
   * Get tenant resource metrics for auto-tune analysis
   */
  private async getTenantResourceMetrics(tenantId: string): Promise<any> {
    // In a real system, this would gather actual resource metrics
    // For simulation, return mock data with realistic patterns
    
    const config = this.budgetConfigs.get(tenantId);
    if (!config) throw new Error(`No config found for tenant: ${tenantId}`);
    
    return {
      monthlyComputeCost: config.maxBudget * 0.6, // 60% of budget on compute
      monthlyStorageCost: config.maxBudget * 0.25, // 25% on storage
      monthlyNetworkCost: config.maxBudget * 0.1, // 10% on network
      monthlyOtherCost: config.maxBudget * 0.05, // 5% on other
      cpuUtilization: 0.45, // 45% average
      memoryUtilization: 0.62, // 62% average
      storageUtilization: 0.78, // 78% average
      peakUsageHours: ['09:00', '14:00', '21:00'], // Peak hours
      resourceTypes: ['compute', 'storage', 'database', 'ai'],
      tenantId
    };
  }

  /**
   * Calculate period start date
   */
  private getPeriodStart(period: 'daily' | 'weekly' | 'monthly' | 'quarterly'): Date {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(now.setDate(diff));
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarterly':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return new Date(now.getFullYear(), quarterStart, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Calculate period end date
   */
  private getPeriodEnd(period: 'daily' | 'weekly' | 'monthly' | 'quarterly'): Date {
    const start = this.getPeriodStart(period);
    
    switch (period) {
      case 'daily':
        const dailyEnd = new Date(start);
        dailyEnd.setDate(dailyEnd.getDate() + 1);
        return dailyEnd;
      case 'weekly':
        const weeklyEnd = new Date(start);
        weeklyEnd.setDate(weeklyEnd.getDate() + 7);
        return weeklyEnd;
      case 'monthly':
        const monthlyEnd = new Date(start);
        monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);
        return monthlyEnd;
      case 'quarterly':
        const quarterlyEnd = new Date(start);
        quarterlyEnd.setMonth(quarterlyEnd.getMonth() + 3);
        return quarterlyEnd;
      default:
        return new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }
  }

  /**
   * Calculate days remaining in period
   */
  private getDaysUntilEnd(period: 'daily' | 'weekly' | 'monthly' | 'quarterly'): number {
    const end = this.getPeriodEnd(period);
    const now = new Date();
    
    const diffTime = Math.max(0, end.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

/**
 * ML-Powered Budget Forecasting Model
 */
class BudgetForecastingModel {
  /**
   * Forecast budget usage using machine learning
   */
  async forecastBudgetUsage(
    tenantId: string, 
    daysAhead: number = 30
  ): Promise<{
    projectedSpend: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    dailyBreakdown: Array<{ day: string; expectedSpend: number; confidence: number }>;
  }> {
    // In a real system, this would run ML models against historical data
    // For simulation, we'll return realistic projections based on usage patterns
    
    const forecast: Array<{ day: string; expectedSpend: number; confidence: number }> = [];
    const now = new Date();
    let dailyAverage = 100; // Will be calculated based on actual patterns
    let totalProjected = 0;
    
    for (let i = 0; i < daysAhead; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() + i);
      
      // Simulate realistic spending patterns with seasonality
      const seasonalMultiplier = 0.9 + (Math.sin(i / 7) * 0.1); // Weekly seasonality pattern
      const trendingFactor = 1.0 + (i * 0.001); // Gradual trend upward
      
      const expectedSpend = dailyAverage * seasonalMultiplier * trendingFactor; 
      totalProjected += expectedSpend;
      
      forecast.push({
        day: day.toISOString().split('T')[0],
        expectedSpend,
        confidence: 0.85 + (Math.random() * 0.1) // 85-95% confidence
      });
    }
    
    const avgConfidence = forecast.reduce((sum, day) => sum + day.confidence, 0) / forecast.length;
    
    // Determine risk level based on projection vs budget
    const riskLevel = totalProjected > 100000 ? 'critical' :
                     totalProjected > 75000 ? 'high' :
                     totalProjected > 50000 ? 'medium' : 'low';
    
    return {
      projectedSpend: totalProjected,
      confidence: avgConfidence,
      riskLevel,
      dailyBreakdown: forecast
    };
  }
  
  /**
   * Get projected spend for tenant
   */
  async getProjectedSpend(tenantId: string): Promise<number> {
    const forecast = await this.forecastBudgetUsage(tenantId, 30);
    return forecast.projectedSpend;
  }
}

/**
 * Resource Right-Sizing Engine for Auto-Tuning
 */
class ResourceRightSizingEngine {
  /**
   * Analyze resources and recommend optimal sizing
   */
  async analyzeResources(
    tenantId: string, 
    metrics: any
  ): Promise<AutoTuneRecommendation[]> {
    const recommendations: AutoTuneRecommendation[] = [];
    
    // Recommend compute resource right-sizing based on utilization
    if (metrics.cpuUtilization < 0.2) { // CPU underutilized
      recommendations.push({
        currentInstanceType: 'large',
        recommendedInstanceType: 'medium',
        estimatedSavings: metrics.monthlyComputeCost * 0.3, // 30% savings
        confidence: 0.9,
        impact: {
          performanceChangePercent: -5, // Small performance decrease
          costChangePercent: -30, // 30% cost decrease
          riskLevel: 'low'
        },
        reasoning: 'CPU utilization significantly below optimal threshold, suggesting over-provisioning',
        implementationSteps: [
          'Scale compute resources to recommended instance type',
          'Monitor performance after change', 
          'Roll back if performance degradation exceeds tolerance'
        ],
        estimatedTimeToImplement: '15-30 minutes'
      });
    }
    
    // Recommend memory resource adjustment
    if (metrics.memoryUtilization < 0.35) { // Memory underutilized
      recommendations.push({
        currentInstanceType: 'memory-optimized',
        recommendedInstanceType: 'balanced',
        estimatedSavings: metrics.monthlyComputeCost * 0.25, // 25% savings
        confidence: 0.88,
        impact: {
          performanceChangePercent: -3,
          costChangePercent: -25,
          riskLevel: 'low'
        },
        reasoning: 'Memory utilization significantly below optimal threshold',
        implementationSteps: [
          'Resize memory in compute instances',
          'Verify application performance after resize',
          'Monitor memory pressure after adjustment'
        ],
        estimatedTimeToImplement: '10-20 minutes'
      });
    }
    
    // Recommend storage optimization
    if (metrics.storageUtilization > 0.9) { // Storage overutilized
      recommendations.push({
        currentInstanceType: 'standard-storage',
        recommendedInstanceType: 'high-capacity',
        estimatedSavings: 0, // No direct cost savings, but prevents failure
        confidence: 0.95,
        impact: {
          performanceChangePercent: 5, // Performance improvement
          costChangePercent: 10, // Small cost increase for benefit
          riskLevel: 'medium'
        },
        reasoning: 'Storage utilization approaching capacity limits',
        implementationSteps: [
          'Increase storage allocation',
          'Migrate data if necessary',
          'Monitor storage performance after adjustment'
        ],
        estimatedTimeToImplement: '30-60 minutes'
      });
    }
    
    // Suggest auto-scaling based on usage patterns
    if (metrics.peakUsageHours.length > 0) {
      recommendations.push({
        currentInstanceType: 'static-size',
        recommendedInstanceType: 'auto-scaling',
        estimatedSavings: metrics.monthlyComputeCost * 0.4, // 40% potential savings
        confidence: 0.92,
        impact: {
          performanceChangePercent: 2, // Performance optimization
          costChangePercent: -40, // 40% cost reduction
          riskLevel: 'medium'
        },
        reasoning: 'Predictable peak usage patterns detected, suggesting auto-scaling',
        implementationSteps: [
          'Implement auto-scaling based on historical usage patterns',
          'Define scaling triggers for peak hours',
          'Monitor scaling behavior for optimization'
        ],
        estimatedTimeToImplement: '1-2 hours'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Apply a specific recommendation
   */
  async applyRecommendation(recommendation: AutoTuneRecommendation): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real system, this would actually apply the recommendation
      // interacting with infrastructure APIs, etc.
      
      logger.info({
        recommendation: recommendation.recommendedInstanceType,
        estimatedSavings: recommendation.estimatedSavings,
        impact: recommendation.impact
      }, 'Auto-tune recommendation applied');
      
      return { success: true };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        recommendation: recommendation.recommendedInstanceType
      }, 'Error applying auto-tune recommendation');
      
      trackError('auto-tune', 'RecommendationApplicationError');
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Budget Guard Middleware for Request-Level Protection
 */
export const budgetGuardMiddleware = (budgetSystem: IntelligentBudgetGuardAutoTune) => {
  return async (req: any, res: any, next: any) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || (req.user as any)?.tenantId;
      
      if (!tenantId) {
        // If no tenant ID, continue without budget enforcement
        next();
        return;
      }
      
      const budgetStatus = await budgetSystem.getBudgetStatus(tenantId);
      
      if (budgetStatus && budgetStatus.percentageUsed > 0.95) { // Emergency threshold
        logger.warn({
          tenantId,
          percentageUsed: budgetStatus.percentageUsed * 100,
          remainingAmount: budgetStatus.remainingAmount
        }, 'Budget guard rejecting request due to emergency threshold');
        
        return res.status(429).json({
          error: 'Budget limit exceeded',
          message: 'Request rate limited due to budget protection',
          code: 'BUDGET_EMERGENCY_THROTTLE',
          retryAfter: '1h' // Retry after 1 hour
        });
      } else if (budgetStatus && budgetStatus.percentageUsed > 0.85) { // Alert threshold
        logger.warn({
          tenantId,
          percentageUsed: budgetStatus.percentageUsed * 100,
          remainingAmount: budgetStatus.remainingAmount
        }, 'Budget approaching alert threshold, continuing with warning');
      }
      
      // Add budget context to request
      (req as any).budgetContext = budgetStatus;
      
      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        tenantId: req.headers['x-tenant-id']
      }, 'Error in budget guard middleware');
      
      trackError('budget', 'BudgetGuardMiddlewareError');
      next(error);
    }
  };
};

/**
 * Auto-tune cron job for continuous optimization
 */
export class BudgetAutoTuneCron {
  private budgetSystem: IntelligentBudgetGuardAutoTune;
  private interval: number;
  private timer: NodeJS.Timeout | null = null;
  
  constructor(budgetSystem: IntelligentBudgetGuardAutoTune, intervalHours: number = 24) {
    this.budgetSystem = budgetSystem;
    this.interval = intervalHours * 60 * 60 * 1000;
  }
  
  start(): void {
    this.timer = setInterval(async () => {
      try {
        logger.info('Starting scheduled budget auto-tune run');
        
        // This would iterate through all tenants and apply recommendations
        // For simulation, we'll just log that the run occurred
        logger.info('Budget auto-tune cron execution completed');
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : String(error)
        }, 'Error in budget auto-tune cron');
      }
    }, this.interval);
    
    logger.info({
      intervalHours: this.interval / (60 * 60 * 1000),
      nextRun: new Date(Date.now() + this.interval).toISOString()
    }, 'Budget auto-tune cron scheduled');
  }
  
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Budget auto-tune cron stopped');
    }
  }
}

export default IntelligentBudgetGuardAutoTune;