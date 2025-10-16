/**
 * Maestro Conductor v24.4.0 - CI Budget Enforcement per Tenant
 * Epic E20: Cost-Aware Scaling & Tenancy Partitioning
 *
 * Per-tenant CI budget enforcement with automated throttling and resource optimization
 * Prevents runaway CI costs while maintaining development velocity
 */

import { EventEmitter } from 'events';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';
import { tracer, Span } from '../utils/tracing';
import { DatabaseService } from './DatabaseService';

// CI Budget configuration
interface CIBudgetConfig {
  enabled: boolean;
  defaultDailyBudget: number;
  defaultMonthlyBudget: number;
  trackingIntervalMinutes: number;
  throttlingEnabled: boolean;
  emergencyBreakEnabled: boolean;
  costCategories: CICostCategory[];
  alertThresholds: number[]; // [50, 75, 90, 100] percent
}

// CI cost categories
interface CICostCategory {
  name: string;
  description: string;
  ratePerMinute: number;
  ratePerGB: number;
  ratePerAction: number;
  currency: string;
}

// Tenant CI budget
interface TenantCIBudget {
  tenantId: string;
  budgets: {
    daily: number;
    weekly: number;
    monthly: number;
    annual?: number;
  };

  // Current usage
  usage: {
    today: CIUsage;
    thisWeek: CIUsage;
    thisMonth: CIUsage;
  };

  // Throttling configuration
  throttling: {
    enabled: boolean;
    softLimitPercent: number; // Start throttling at 80%
    hardLimitPercent: number; // Emergency break at 100%
    throttleStrategy:
      | 'queue_delay'
      | 'resource_limit'
      | 'priority_only'
      | 'emergency_stop';
    allowOverageMinutes: number; // Grace period
  };

  // Alert configuration
  alerts: {
    enabled: boolean;
    recipients: string[];
    slackWebhook?: string;
    emailEnabled: boolean;
  };

  // Override settings
  overrides: {
    allowUnlimited: boolean;
    emergencyAccess: boolean;
    bypassUntil?: Date;
    reason?: string;
  };
}

// CI usage tracking
interface CIUsage {
  timestamp: Date;
  period: 'day' | 'week' | 'month';

  // Resource consumption
  buildMinutes: number;
  testMinutes: number;
  deployMinutes: number;
  storageGB: number;
  networkGB: number;

  // Actions and events
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  totalTests: number;
  deployments: number;

  // Costs by category
  costs: {
    compute: number;
    storage: number;
    network: number;
    actions: number;
    total: number;
  };

  // Efficiency metrics
  costPerBuild: number;
  costPerTest: number;
  costPerDeployment: number;
  successRate: number;
}

// Pipeline execution request
interface PipelineRequest {
  tenantId: string;
  pipelineId: string;
  jobType: 'build' | 'test' | 'deploy' | 'custom';
  priority: 'low' | 'normal' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  estimatedCost: number;
  requester: string;
  repository: string;
  branch: string;
  commit: string;
}

// Pipeline decision result
interface PipelineDecision {
  allowed: boolean;
  reason: string;
  throttled: boolean;
  delayMinutes?: number;
  costImpact: {
    estimated: number;
    remainingBudget: number;
    utilizationPercent: number;
  };
  alternatives?: string[];
}

// Budget forecast
interface BudgetForecast {
  tenantId: string;
  period: 'week' | 'month';

  projected: {
    usage: CIUsage;
    budgetUtilization: number;
    overageProbability: number;
  };

  trends: {
    buildFrequency: number; // builds per day
    averageBuildCost: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
  };

  recommendations: string[];
  riskFactors: string[];
}

export class CIBudgetService extends EventEmitter {
  private config: CIBudgetConfig;
  private metrics: PrometheusMetrics;
  private db: DatabaseService;
  private tenantBudgets: Map<string, TenantCIBudget> = new Map();
  private activeJobs: Map<string, PipelineRequest> = new Map();
  private throttledTenants: Set<string> = new Set();

  constructor(config: Partial<CIBudgetConfig> = {}, db: DatabaseService) {
    super();

    this.config = {
      enabled: true,
      defaultDailyBudget: 100, // $100/day
      defaultMonthlyBudget: 2000, // $2000/month
      trackingIntervalMinutes: 15,
      throttlingEnabled: true,
      emergencyBreakEnabled: true,
      costCategories: this.getDefaultCostCategories(),
      alertThresholds: [50, 75, 90, 100],
      ...config,
    };

    this.db = db;
    this.metrics = new PrometheusMetrics('ci_budget_service');

    this.initializeMetrics();
    this.loadTenantBudgets();
    this.startBudgetTracking();
  }

  private getDefaultCostCategories(): CICostCategory[] {
    return [
      {
        name: 'compute',
        description: 'CI compute time (build, test, deploy)',
        ratePerMinute: 0.05, // $0.05 per minute
        ratePerGB: 0,
        ratePerAction: 0,
        currency: 'USD',
      },
      {
        name: 'storage',
        description: 'Artifact and cache storage',
        ratePerMinute: 0,
        ratePerGB: 0.001, // $0.001 per GB per hour
        ratePerAction: 0,
        currency: 'USD',
      },
      {
        name: 'network',
        description: 'Data transfer and external API calls',
        ratePerMinute: 0,
        ratePerGB: 0.01, // $0.01 per GB
        ratePerAction: 0,
        currency: 'USD',
      },
      {
        name: 'actions',
        description: 'CI actions and API calls',
        ratePerMinute: 0,
        ratePerGB: 0,
        ratePerAction: 0.001, // $0.001 per action
        currency: 'USD',
      },
    ];
  }

  private initializeMetrics(): void {
    // Budget metrics
    this.metrics.createGauge(
      'tenant_ci_budget_remaining',
      'Remaining CI budget per tenant',
      ['tenant_id', 'period'],
    );
    this.metrics.createGauge(
      'tenant_ci_budget_utilization',
      'CI budget utilization percentage',
      ['tenant_id', 'period'],
    );
    this.metrics.createGauge(
      'tenant_ci_cost_total',
      'Total CI cost per tenant',
      ['tenant_id', 'period'],
    );

    // Usage metrics
    this.metrics.createCounter('ci_builds_total', 'Total CI builds', [
      'tenant_id',
      'status',
      'job_type',
    ]);
    this.metrics.createCounter('ci_cost_total', 'Total CI costs', [
      'tenant_id',
      'category',
    ]);
    this.metrics.createGauge('ci_active_jobs', 'Currently active CI jobs', [
      'tenant_id',
    ]);

    // Throttling metrics
    this.metrics.createCounter('ci_throttled_jobs', 'Throttled CI jobs', [
      'tenant_id',
      'reason',
    ]);
    this.metrics.createCounter(
      'ci_blocked_jobs',
      'Blocked CI jobs due to budget',
      ['tenant_id', 'reason'],
    );
    this.metrics.createGauge(
      'ci_throttled_tenants',
      'Number of throttled tenants',
    );

    // Performance metrics
    this.metrics.createHistogram('ci_job_duration', 'CI job duration', {
      buckets: [60, 300, 600, 1200, 1800, 3600], // 1min to 1hr
    });
    this.metrics.createHistogram('ci_cost_per_build', 'Cost per CI build', {
      buckets: [0.1, 0.5, 1, 2, 5, 10, 25],
    });
  }

  private async loadTenantBudgets(): Promise<void> {
    try {
      const budgets = await this.db.query(`
        SELECT tenant_id, budget_config 
        FROM tenant_ci_budgets 
        WHERE active = true
      `);

      for (const row of budgets.rows) {
        const budget: TenantCIBudget = JSON.parse(row.budget_config);
        this.tenantBudgets.set(row.tenant_id, budget);
      }

      logger.info('Loaded tenant CI budgets', { count: budgets.rows.length });
    } catch (error) {
      logger.error('Failed to load tenant CI budgets', {
        error: error.message,
      });
    }
  }

  private startBudgetTracking(): void {
    if (!this.config.enabled) {
      logger.info('CI budget enforcement disabled');
      return;
    }

    // Update usage and check budgets periodically
    setInterval(
      async () => {
        await this.updateAllTenantUsage();
        await this.checkAllBudgetLimits();
      },
      this.config.trackingIntervalMinutes * 60 * 1000,
    );

    logger.info('CI budget tracking started', {
      interval: this.config.trackingIntervalMinutes,
      throttlingEnabled: this.config.throttlingEnabled,
    });
  }

  // Pipeline execution control
  public async canExecutePipeline(
    request: PipelineRequest,
  ): Promise<PipelineDecision> {
    return tracer.startActiveSpan(
      'ci_budget.can_execute',
      async (span: Span) => {
        span.setAttributes({
          'ci_budget.tenant_id': request.tenantId,
          'ci_budget.job_type': request.jobType,
          'ci_budget.priority': request.priority,
          'ci_budget.estimated_cost': request.estimatedCost,
        });

        try {
          // Get or create budget for tenant
          let budget = this.tenantBudgets.get(request.tenantId);
          if (!budget) {
            budget = await this.createDefaultBudget(request.tenantId);
          }

          // Check if tenant has unlimited access
          if (
            budget.overrides.allowUnlimited ||
            budget.overrides.emergencyAccess
          ) {
            return {
              allowed: true,
              reason: 'Unlimited access or emergency override',
              throttled: false,
              costImpact: {
                estimated: request.estimatedCost,
                remainingBudget: Infinity,
                utilizationPercent: 0,
              },
            };
          }

          // Check bypass period
          if (
            budget.overrides.bypassUntil &&
            new Date() < budget.overrides.bypassUntil
          ) {
            return {
              allowed: true,
              reason: `Budget bypass active until ${budget.overrides.bypassUntil.toISOString()}`,
              throttled: false,
              costImpact: {
                estimated: request.estimatedCost,
                remainingBudget: budget.budgets.daily,
                utilizationPercent: 0,
              },
            };
          }

          // Calculate current budget utilization
          const dailyUtilization = this.calculateUtilization(
            budget.usage.today,
            budget.budgets.daily,
          );
          const monthlyUtilization = this.calculateUtilization(
            budget.usage.thisMonth,
            budget.budgets.monthly,
          );

          const maxUtilization = Math.max(dailyUtilization, monthlyUtilization);

          // Check hard limits
          if (
            this.config.emergencyBreakEnabled &&
            maxUtilization >= budget.throttling.hardLimitPercent
          ) {
            this.metrics.incrementCounter('ci_blocked_jobs', {
              tenant_id: request.tenantId,
              reason: 'hard_limit_exceeded',
            });

            return {
              allowed: false,
              reason: `Budget hard limit exceeded (${maxUtilization.toFixed(1)}%)`,
              throttled: false,
              costImpact: {
                estimated: request.estimatedCost,
                remainingBudget: Math.max(
                  0,
                  budget.budgets.daily - budget.usage.today.costs.total,
                ),
                utilizationPercent: maxUtilization,
              },
              alternatives: [
                'Increase budget limits',
                'Wait for budget reset',
                'Use emergency override',
              ],
            };
          }

          // Check soft limits and throttling
          if (
            this.config.throttlingEnabled &&
            maxUtilization >= budget.throttling.softLimitPercent
          ) {
            const throttleResult = await this.applyThrottling(
              request,
              budget,
              maxUtilization,
            );

            if (!throttleResult.allowed) {
              this.metrics.incrementCounter('ci_throttled_jobs', {
                tenant_id: request.tenantId,
                reason: 'soft_limit_exceeded',
              });
            }

            return throttleResult;
          }

          // Check if estimated cost would exceed remaining budget
          const remainingDaily =
            budget.budgets.daily - budget.usage.today.costs.total;
          const remainingMonthly =
            budget.budgets.monthly - budget.usage.thisMonth.costs.total;
          const minRemaining = Math.min(remainingDaily, remainingMonthly);

          if (request.estimatedCost > minRemaining) {
            this.metrics.incrementCounter('ci_blocked_jobs', {
              tenant_id: request.tenantId,
              reason: 'insufficient_budget',
            });

            return {
              allowed: false,
              reason: `Insufficient budget remaining ($${minRemaining.toFixed(2)} < $${request.estimatedCost})`,
              throttled: false,
              costImpact: {
                estimated: request.estimatedCost,
                remainingBudget: minRemaining,
                utilizationPercent: maxUtilization,
              },
              alternatives: [
                'Reduce pipeline scope',
                'Use lower priority execution',
                'Optimize build configuration',
              ],
            };
          }

          // Pipeline can execute normally
          return {
            allowed: true,
            reason: 'Within budget limits',
            throttled: false,
            costImpact: {
              estimated: request.estimatedCost,
              remainingBudget: minRemaining,
              utilizationPercent: maxUtilization,
            },
          };
        } catch (error) {
          logger.error('Failed to check pipeline execution', {
            tenantId: request.tenantId,
            error: error.message,
          });

          // Fail open to avoid blocking critical pipelines
          return {
            allowed: true,
            reason: 'Budget check failed - allowing execution',
            throttled: false,
            costImpact: {
              estimated: request.estimatedCost,
              remainingBudget: 0,
              utilizationPercent: 0,
            },
          };
        }
      },
    );
  }

  private calculateUtilization(usage: CIUsage, budget: number): number {
    return budget > 0 ? (usage.costs.total / budget) * 100 : 0;
  }

  private async applyThrottling(
    request: PipelineRequest,
    budget: TenantCIBudget,
    utilization: number,
  ): Promise<PipelineDecision> {
    const strategy = budget.throttling.throttleStrategy;
    const remainingBudget = Math.max(
      0,
      budget.budgets.daily - budget.usage.today.costs.total,
    );

    switch (strategy) {
      case 'queue_delay':
        // Delay execution based on utilization
        const delayMinutes = Math.min(
          60,
          (utilization - budget.throttling.softLimitPercent) * 2,
        );
        return {
          allowed: true,
          reason: `Throttled: ${delayMinutes}min delay due to budget utilization (${utilization.toFixed(1)}%)`,
          throttled: true,
          delayMinutes,
          costImpact: {
            estimated: request.estimatedCost,
            remainingBudget,
            utilizationPercent: utilization,
          },
        };

      case 'resource_limit':
        // Reduce resource allocation
        const reducedCost = request.estimatedCost * 0.7; // 30% reduction
        return {
          allowed: true,
          reason: `Throttled: reduced resource allocation due to budget constraints`,
          throttled: true,
          costImpact: {
            estimated: reducedCost,
            remainingBudget,
            utilizationPercent: utilization,
          },
          alternatives: ['Use optimized build configuration'],
        };

      case 'priority_only':
        // Only allow high/critical priority jobs
        if (request.priority === 'high' || request.priority === 'critical') {
          return {
            allowed: true,
            reason: 'Throttled: only high-priority jobs allowed',
            throttled: true,
            costImpact: {
              estimated: request.estimatedCost,
              remainingBudget,
              utilizationPercent: utilization,
            },
          };
        } else {
          return {
            allowed: false,
            reason:
              'Throttled: only high-priority jobs allowed due to budget constraints',
            throttled: true,
            costImpact: {
              estimated: request.estimatedCost,
              remainingBudget,
              utilizationPercent: utilization,
            },
            alternatives: ['Increase job priority', 'Wait for budget reset'],
          };
        }

      case 'emergency_stop':
      default:
        return {
          allowed: false,
          reason:
            'Emergency throttling: all jobs blocked due to budget overrun',
          throttled: true,
          costImpact: {
            estimated: request.estimatedCost,
            remainingBudget,
            utilizationPercent: utilization,
          },
          alternatives: ['Use emergency override', 'Increase budget limits'],
        };
    }
  }

  private async createDefaultBudget(tenantId: string): Promise<TenantCIBudget> {
    const budget: TenantCIBudget = {
      tenantId,
      budgets: {
        daily: this.config.defaultDailyBudget,
        weekly: this.config.defaultDailyBudget * 7,
        monthly: this.config.defaultMonthlyBudget,
      },
      usage: {
        today: this.createEmptyUsage('day'),
        thisWeek: this.createEmptyUsage('week'),
        thisMonth: this.createEmptyUsage('month'),
      },
      throttling: {
        enabled: this.config.throttlingEnabled,
        softLimitPercent: 80,
        hardLimitPercent: 100,
        throttleStrategy: 'queue_delay',
        allowOverageMinutes: 60,
      },
      alerts: {
        enabled: true,
        recipients: [],
        emailEnabled: true,
      },
      overrides: {
        allowUnlimited: false,
        emergencyAccess: false,
      },
    };

    this.tenantBudgets.set(tenantId, budget);
    await this.saveBudgetConfig(tenantId, budget);

    return budget;
  }

  private createEmptyUsage(period: 'day' | 'week' | 'month'): CIUsage {
    return {
      timestamp: new Date(),
      period,
      buildMinutes: 0,
      testMinutes: 0,
      deployMinutes: 0,
      storageGB: 0,
      networkGB: 0,
      totalBuilds: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      totalTests: 0,
      deployments: 0,
      costs: {
        compute: 0,
        storage: 0,
        network: 0,
        actions: 0,
        total: 0,
      },
      costPerBuild: 0,
      costPerTest: 0,
      costPerDeployment: 0,
      successRate: 0,
    };
  }

  // Pipeline execution tracking
  public async startPipeline(request: PipelineRequest): Promise<void> {
    const jobId = `${request.tenantId}_${request.pipelineId}_${Date.now()}`;

    this.activeJobs.set(jobId, request);
    this.metrics.setGauge('ci_active_jobs', this.activeJobs.size, {
      tenant_id: request.tenantId,
    });

    logger.info('Pipeline started', {
      tenantId: request.tenantId,
      pipelineId: request.pipelineId,
      jobType: request.jobType,
      estimatedCost: request.estimatedCost,
    });

    this.emit('pipelineStarted', { jobId, request });
  }

  public async completePipeline(
    jobId: string,
    result: {
      status: 'success' | 'failure' | 'cancelled';
      actualDuration: number;
      actualCost: number;
      resourceUsage: {
        computeMinutes: number;
        storageGB: number;
        networkGB: number;
        actions: number;
      };
    },
  ): Promise<void> {
    const request = this.activeJobs.get(jobId);
    if (!request) {
      logger.warn('Completed pipeline not found in active jobs', { jobId });
      return;
    }

    this.activeJobs.delete(jobId);
    this.metrics.setGauge('ci_active_jobs', this.activeJobs.size, {
      tenant_id: request.tenantId,
    });

    // Record metrics
    this.metrics.incrementCounter('ci_builds_total', {
      tenant_id: request.tenantId,
      status: result.status,
      job_type: request.jobType,
    });

    this.metrics.observeHistogram('ci_job_duration', result.actualDuration);
    this.metrics.observeHistogram('ci_cost_per_build', result.actualCost);

    // Update tenant usage
    await this.recordPipelineUsage(request.tenantId, {
      jobType: request.jobType,
      status: result.status,
      duration: result.actualDuration,
      cost: result.actualCost,
      usage: result.resourceUsage,
    });

    logger.info('Pipeline completed', {
      tenantId: request.tenantId,
      pipelineId: request.pipelineId,
      status: result.status,
      duration: result.actualDuration,
      cost: result.actualCost,
    });

    this.emit('pipelineCompleted', { jobId, request, result });
  }

  private async recordPipelineUsage(
    tenantId: string,
    execution: {
      jobType: string;
      status: string;
      duration: number;
      cost: number;
      usage: {
        computeMinutes: number;
        storageGB: number;
        networkGB: number;
        actions: number;
      };
    },
  ): Promise<void> {
    try {
      // Store raw usage data
      await this.db.query(
        `
        INSERT INTO ci_pipeline_usage (
          tenant_id, job_type, status, duration_minutes, total_cost,
          compute_minutes, storage_gb, network_gb, actions, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `,
        [
          tenantId,
          execution.jobType,
          execution.status,
          execution.duration,
          execution.cost,
          execution.usage.computeMinutes,
          execution.usage.storageGB,
          execution.usage.networkGB,
          execution.usage.actions,
        ],
      );

      // Update tenant budget usage
      await this.updateTenantUsage(tenantId, execution);
    } catch (error) {
      logger.error('Failed to record pipeline usage', {
        tenantId,
        error: error.message,
      });
    }
  }

  private async updateTenantUsage(
    tenantId: string,
    execution: any,
  ): Promise<void> {
    const budget = this.tenantBudgets.get(tenantId);
    if (!budget) return;

    // Update daily usage
    budget.usage.today.totalBuilds++;
    if (execution.status === 'success') {
      budget.usage.today.successfulBuilds++;
    } else if (execution.status === 'failure') {
      budget.usage.today.failedBuilds++;
    }

    budget.usage.today.buildMinutes += execution.usage.computeMinutes;
    budget.usage.today.storageGB = Math.max(
      budget.usage.today.storageGB,
      execution.usage.storageGB,
    );
    budget.usage.today.networkGB += execution.usage.networkGB;
    budget.usage.today.costs.total += execution.cost;

    // Calculate costs by category
    const computeCategory = this.config.costCategories.find(
      (c) => c.name === 'compute',
    )!;
    const storageCategory = this.config.costCategories.find(
      (c) => c.name === 'storage',
    )!;
    const networkCategory = this.config.costCategories.find(
      (c) => c.name === 'network',
    )!;
    const actionsCategory = this.config.costCategories.find(
      (c) => c.name === 'actions',
    )!;

    budget.usage.today.costs.compute +=
      execution.usage.computeMinutes * computeCategory.ratePerMinute;
    budget.usage.today.costs.storage +=
      execution.usage.storageGB * storageCategory.ratePerGB;
    budget.usage.today.costs.network +=
      execution.usage.networkGB * networkCategory.ratePerGB;
    budget.usage.today.costs.actions +=
      execution.usage.actions * actionsCategory.ratePerAction;

    // Update efficiency metrics
    if (budget.usage.today.totalBuilds > 0) {
      budget.usage.today.costPerBuild =
        budget.usage.today.costs.total / budget.usage.today.totalBuilds;
      budget.usage.today.successRate =
        (budget.usage.today.successfulBuilds / budget.usage.today.totalBuilds) *
        100;
    }

    // Update Prometheus metrics
    this.updateBudgetMetrics(tenantId, budget);

    // Save updated budget
    await this.saveBudgetConfig(tenantId, budget);
  }

  private updateBudgetMetrics(tenantId: string, budget: TenantCIBudget): void {
    // Remaining budget
    this.metrics.setGauge(
      'tenant_ci_budget_remaining',
      budget.budgets.daily - budget.usage.today.costs.total,
      { tenant_id: tenantId, period: 'daily' },
    );

    this.metrics.setGauge(
      'tenant_ci_budget_remaining',
      budget.budgets.monthly - budget.usage.thisMonth.costs.total,
      { tenant_id: tenantId, period: 'monthly' },
    );

    // Utilization
    this.metrics.setGauge(
      'tenant_ci_budget_utilization',
      this.calculateUtilization(budget.usage.today, budget.budgets.daily),
      { tenant_id: tenantId, period: 'daily' },
    );

    this.metrics.setGauge(
      'tenant_ci_budget_utilization',
      this.calculateUtilization(budget.usage.thisMonth, budget.budgets.monthly),
      { tenant_id: tenantId, period: 'monthly' },
    );

    // Total costs
    this.metrics.setGauge(
      'tenant_ci_cost_total',
      budget.usage.today.costs.total,
      { tenant_id: tenantId, period: 'daily' },
    );

    this.metrics.setGauge(
      'tenant_ci_cost_total',
      budget.usage.thisMonth.costs.total,
      { tenant_id: tenantId, period: 'monthly' },
    );

    // Cost by category
    this.metrics.incrementCounter(
      'ci_cost_total',
      budget.usage.today.costs.compute,
      { tenant_id: tenantId, category: 'compute' },
    );
    this.metrics.incrementCounter(
      'ci_cost_total',
      budget.usage.today.costs.storage,
      { tenant_id: tenantId, category: 'storage' },
    );
    this.metrics.incrementCounter(
      'ci_cost_total',
      budget.usage.today.costs.network,
      { tenant_id: tenantId, category: 'network' },
    );
    this.metrics.incrementCounter(
      'ci_cost_total',
      budget.usage.today.costs.actions,
      { tenant_id: tenantId, category: 'actions' },
    );
  }

  private async updateAllTenantUsage(): Promise<void> {
    for (const tenantId of this.tenantBudgets.keys()) {
      try {
        await this.refreshTenantUsage(tenantId);
      } catch (error) {
        logger.error('Failed to refresh tenant usage', {
          tenantId,
          error: error.message,
        });
      }
    }
  }

  private async refreshTenantUsage(tenantId: string): Promise<void> {
    // Query recent usage from database
    const dailyUsage = await this.db.query(
      `
      SELECT 
        COALESCE(SUM(duration_minutes), 0) as build_minutes,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COUNT(*) as total_builds,
        COUNT(*) FILTER (WHERE status = 'success') as successful_builds,
        COUNT(*) FILTER (WHERE status = 'failure') as failed_builds,
        COALESCE(MAX(storage_gb), 0) as max_storage_gb,
        COALESCE(SUM(network_gb), 0) as network_gb
      FROM ci_pipeline_usage
      WHERE tenant_id = $1 
      AND timestamp >= CURRENT_DATE
    `,
      [tenantId],
    );

    const budget = this.tenantBudgets.get(tenantId);
    if (!budget || dailyUsage.rows.length === 0) return;

    const row = dailyUsage.rows[0];

    // Update daily usage
    budget.usage.today.buildMinutes = parseFloat(row.build_minutes);
    budget.usage.today.costs.total = parseFloat(row.total_cost);
    budget.usage.today.totalBuilds = parseInt(row.total_builds);
    budget.usage.today.successfulBuilds = parseInt(row.successful_builds);
    budget.usage.today.failedBuilds = parseInt(row.failed_builds);
    budget.usage.today.storageGB = parseFloat(row.max_storage_gb);
    budget.usage.today.networkGB = parseFloat(row.network_gb);

    if (budget.usage.today.totalBuilds > 0) {
      budget.usage.today.costPerBuild =
        budget.usage.today.costs.total / budget.usage.today.totalBuilds;
      budget.usage.today.successRate =
        (budget.usage.today.successfulBuilds / budget.usage.today.totalBuilds) *
        100;
    }

    this.updateBudgetMetrics(tenantId, budget);
  }

  private async checkAllBudgetLimits(): Promise<void> {
    for (const [tenantId, budget] of this.tenantBudgets.entries()) {
      try {
        await this.checkBudgetLimits(tenantId, budget);
      } catch (error) {
        logger.error('Failed to check budget limits', {
          tenantId,
          error: error.message,
        });
      }
    }
  }

  private async checkBudgetLimits(
    tenantId: string,
    budget: TenantCIBudget,
  ): Promise<void> {
    if (!budget.alerts.enabled) return;

    const dailyUtilization = this.calculateUtilization(
      budget.usage.today,
      budget.budgets.daily,
    );
    const monthlyUtilization = this.calculateUtilization(
      budget.usage.thisMonth,
      budget.budgets.monthly,
    );

    // Check alert thresholds
    for (const threshold of this.config.alertThresholds) {
      if (
        dailyUtilization >= threshold &&
        !this.hasRecentAlert(tenantId, 'daily', threshold)
      ) {
        await this.sendBudgetAlert(
          tenantId,
          'daily',
          dailyUtilization,
          threshold,
          budget,
        );
      }

      if (
        monthlyUtilization >= threshold &&
        !this.hasRecentAlert(tenantId, 'monthly', threshold)
      ) {
        await this.sendBudgetAlert(
          tenantId,
          'monthly',
          monthlyUtilization,
          threshold,
          budget,
        );
      }
    }

    // Update throttling status
    const maxUtilization = Math.max(dailyUtilization, monthlyUtilization);
    if (maxUtilization >= budget.throttling.softLimitPercent) {
      if (!this.throttledTenants.has(tenantId)) {
        this.throttledTenants.add(tenantId);
        this.metrics.setGauge(
          'ci_throttled_tenants',
          this.throttledTenants.size,
        );

        logger.warn('Tenant throttling activated', {
          tenantId,
          utilization: maxUtilization,
          strategy: budget.throttling.throttleStrategy,
        });

        this.emit('throttlingActivated', {
          tenantId,
          utilization: maxUtilization,
        });
      }
    } else if (this.throttledTenants.has(tenantId)) {
      this.throttledTenants.delete(tenantId);
      this.metrics.setGauge('ci_throttled_tenants', this.throttledTenants.size);

      logger.info('Tenant throttling deactivated', {
        tenantId,
        utilization: maxUtilization,
      });
      this.emit('throttlingDeactivated', {
        tenantId,
        utilization: maxUtilization,
      });
    }
  }

  private hasRecentAlert(
    tenantId: string,
    period: string,
    threshold: number,
  ): boolean {
    // In a real implementation, this would check the database for recent alerts
    // For now, implement simple rate limiting
    return false; // Always send alerts for demo
  }

  private async sendBudgetAlert(
    tenantId: string,
    period: string,
    utilization: number,
    threshold: number,
    budget: TenantCIBudget,
  ): Promise<void> {
    const alert = {
      tenantId,
      period,
      utilization,
      threshold,
      budget:
        period === 'daily' ? budget.budgets.daily : budget.budgets.monthly,
      remaining:
        period === 'daily'
          ? budget.budgets.daily - budget.usage.today.costs.total
          : budget.budgets.monthly - budget.usage.thisMonth.costs.total,
    };

    logger.warn('CI budget threshold exceeded', alert);

    // Store alert in database
    try {
      await this.db.query(
        `
        INSERT INTO ci_budget_alerts (tenant_id, period, threshold, utilization, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `,
        [tenantId, period, threshold, utilization],
      );
    } catch (error) {
      logger.error('Failed to store budget alert', {
        tenantId,
        error: error.message,
      });
    }

    this.emit('budgetAlert', alert);
  }

  private async saveBudgetConfig(
    tenantId: string,
    budget: TenantCIBudget,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO tenant_ci_budgets (tenant_id, budget_config, active, updated_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
        budget_config = $2, updated_at = NOW()
      `,
        [tenantId, JSON.stringify(budget)],
      );
    } catch (error) {
      logger.error('Failed to save budget config', {
        tenantId,
        error: error.message,
      });
    }
  }

  // Public API methods
  public async getTenantBudget(
    tenantId: string,
  ): Promise<TenantCIBudget | null> {
    return this.tenantBudgets.get(tenantId) || null;
  }

  public async setBudget(
    tenantId: string,
    budgetConfig: Partial<TenantCIBudget>,
  ): Promise<void> {
    let budget = this.tenantBudgets.get(tenantId);
    if (!budget) {
      budget = await this.createDefaultBudget(tenantId);
    }

    // Merge configuration
    Object.assign(budget, budgetConfig);

    await this.saveBudgetConfig(tenantId, budget);
    logger.info('Updated tenant CI budget', { tenantId });

    this.emit('budgetUpdated', { tenantId, budget });
  }

  public async generateForecast(tenantId: string): Promise<BudgetForecast> {
    const budget = this.tenantBudgets.get(tenantId);
    if (!budget) {
      throw new Error(`Budget not found for tenant: ${tenantId}`);
    }

    // Simple forecasting based on current trends
    const currentDaily = budget.usage.today.costs.total;
    const currentMonthly = budget.usage.thisMonth.costs.total;

    // Estimate remaining month based on daily average
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    ).getDate();
    const projectedMonthly = (currentMonthly / dayOfMonth) * daysInMonth;

    return {
      tenantId,
      period: 'month',
      projected: {
        usage: {
          ...budget.usage.thisMonth,
          costs: {
            ...budget.usage.thisMonth.costs,
            total: projectedMonthly,
          },
        },
        budgetUtilization: (projectedMonthly / budget.budgets.monthly) * 100,
        overageProbability:
          projectedMonthly > budget.budgets.monthly ? 0.8 : 0.2,
      },
      trends: {
        buildFrequency: budget.usage.today.totalBuilds, // builds per day
        averageBuildCost: budget.usage.today.costPerBuild,
        costTrend: projectedMonthly > currentMonthly ? 'increasing' : 'stable',
      },
      recommendations: this.generateRecommendations(budget, projectedMonthly),
      riskFactors: this.identifyRiskFactors(budget, projectedMonthly),
    };
  }

  private generateRecommendations(
    budget: TenantCIBudget,
    projectedCost: number,
  ): string[] {
    const recommendations: string[] = [];

    if (projectedCost > budget.budgets.monthly) {
      recommendations.push(
        'Consider increasing monthly budget or optimizing CI efficiency',
      );
    }

    if (budget.usage.today.successRate < 80) {
      recommendations.push(
        'Improve build success rate to reduce wasted CI costs',
      );
    }

    if (budget.usage.today.costPerBuild > 2) {
      recommendations.push(
        'Optimize build configuration to reduce cost per build',
      );
    }

    return recommendations;
  }

  private identifyRiskFactors(
    budget: TenantCIBudget,
    projectedCost: number,
  ): string[] {
    const factors: string[] = [];

    if (projectedCost > budget.budgets.monthly * 1.2) {
      factors.push('Projected to exceed monthly budget by >20%');
    }

    if (
      budget.usage.today.failedBuilds >
      budget.usage.today.successfulBuilds * 0.3
    ) {
      factors.push('High failure rate increasing costs');
    }

    return factors;
  }

  // Admin methods
  public getThrottledTenants(): string[] {
    return Array.from(this.throttledTenants);
  }

  public async setEmergencyOverride(
    tenantId: string,
    enabled: boolean,
    reason?: string,
  ): Promise<void> {
    const budget = this.tenantBudgets.get(tenantId);
    if (!budget) {
      throw new Error(`Budget not found for tenant: ${tenantId}`);
    }

    budget.overrides.emergencyAccess = enabled;
    budget.overrides.reason = reason;

    await this.saveBudgetConfig(tenantId, budget);

    logger.info('Emergency override updated', { tenantId, enabled, reason });
    this.emit('emergencyOverride', { tenantId, enabled, reason });
  }

  public async setBudgetBypass(
    tenantId: string,
    until: Date,
    reason: string,
  ): Promise<void> {
    const budget = this.tenantBudgets.get(tenantId);
    if (!budget) {
      throw new Error(`Budget not found for tenant: ${tenantId}`);
    }

    budget.overrides.bypassUntil = until;
    budget.overrides.reason = reason;

    await this.saveBudgetConfig(tenantId, budget);

    logger.info('Budget bypass set', { tenantId, until, reason });
    this.emit('budgetBypass', { tenantId, until, reason });
  }
}

// Export singleton instance
export const ciBudgetService = new CIBudgetService(
  {
    enabled: process.env.CI_BUDGET_ENFORCEMENT_ENABLED !== 'false',
    defaultDailyBudget: parseFloat(
      process.env.CI_DEFAULT_DAILY_BUDGET || '100',
    ),
    defaultMonthlyBudget: parseFloat(
      process.env.CI_DEFAULT_MONTHLY_BUDGET || '2000',
    ),
    trackingIntervalMinutes: parseInt(
      process.env.CI_BUDGET_TRACKING_INTERVAL || '15',
    ),
    throttlingEnabled: process.env.CI_THROTTLING_ENABLED !== 'false',
    emergencyBreakEnabled: process.env.CI_EMERGENCY_BREAK_ENABLED !== 'false',
  },
  new DatabaseService(),
);
