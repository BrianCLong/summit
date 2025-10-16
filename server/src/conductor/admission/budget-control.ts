// Conductor Budget Hard-Stop Controller
// Implements budget enforcement with graceful degradation and cost containment

import { ExpertType } from '../types';
import Redis from 'ioredis';

export interface BudgetConfig {
  dailyUsd: number;
  hourlyUsd: number;
  emergencyReserveUsd: number;
  degradationThresholds: {
    warning: number; // Percentage (e.g., 80)
    degraded: number; // Percentage (e.g., 90)
    critical: number; // Percentage (e.g., 95)
  };
}

export interface AdmissionResult {
  admit: boolean;
  mode: 'normal' | 'degraded' | 'emergency' | 'blocked';
  reason: string;
  allowedExperts: ExpertType[];
  blockedExperts: ExpertType[];
  budgetRemaining: number;
  budgetPercentUsed: number;
  retryAfterMs?: number;
}

export interface BudgetUsage {
  period: 'hour' | 'day';
  timestamp: number;
  totalSpent: number;
  requestCount: number;
  expertBreakdown: Record<ExpertType, { spent: number; requests: number }>;
}

export class BudgetAdmissionController {
  private redis: Redis;
  private config: BudgetConfig;
  private readonly REDIS_KEY_PREFIX = 'conductor:budget';

  constructor(redis: Redis, config: BudgetConfig) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Admit or reject task based on budget constraints
   */
  public async admit(
    expert: ExpertType,
    projectedCostUsd: number,
    options?: {
      userId?: string;
      isEmergency?: boolean;
      tenantId?: string;
    },
  ): Promise<AdmissionResult> {
    const [hourlyUsage, dailyUsage] = await Promise.all([
      this.getUsage('hour'),
      this.getUsage('day'),
    ]);

    // Check daily budget first (primary constraint)
    const dailyCheck = this.checkDailyBudget(
      dailyUsage,
      projectedCostUsd,
      options?.tenantId,
    );
    if (dailyCheck.mode === 'blocked' && !options?.isEmergency) {
      return dailyCheck;
    }

    // Check hourly budget (rate limiting)
    const hourlyCheck = this.checkHourlyBudget(
      hourlyUsage,
      projectedCostUsd,
      options?.tenantId,
    );
    if (hourlyCheck.mode === 'blocked' && !options?.isEmergency) {
      return hourlyCheck;
    }

    // Determine admission mode based on budget thresholds
    const admissionMode = this.determineAdmissionMode(
      dailyUsage,
      projectedCostUsd,
    );

    // Apply expert filtering based on mode
    const expertDecision = this.filterExperts(
      expert,
      admissionMode,
      options?.isEmergency,
    );

    // Emergency override logic
    if (
      options?.isEmergency &&
      this.hasEmergencyBudget(dailyUsage, projectedCostUsd)
    ) {
      return {
        admit: true,
        mode: 'emergency',
        reason: 'Emergency override - using reserve budget',
        allowedExperts: [expert], // Allow requested expert in emergency
        blockedExperts: [],
        budgetRemaining: this.config.emergencyReserveUsd,
        budgetPercentUsed: Math.min(
          100,
          (dailyUsage.totalSpent / this.config.dailyUsd) * 100,
        ),
      };
    }

    const budgetRemaining = Math.max(
      0,
      this.config.dailyUsd - dailyUsage.totalSpent,
    );
    const budgetPercentUsed = Math.min(
      100,
      (dailyUsage.totalSpent / this.config.dailyUsd) * 100,
    );

    return {
      admit: expertDecision.admit,
      mode: admissionMode,
      reason: expertDecision.reason,
      allowedExperts: expertDecision.allowedExperts,
      blockedExperts: expertDecision.blockedExperts,
      budgetRemaining,
      budgetPercentUsed,
      retryAfterMs: expertDecision.retryAfterMs,
    };
  }

  /**
   * Record actual spending for budget tracking
   */
  public async recordSpending(
    expert: ExpertType,
    actualCostUsd: number,
    options?: {
      userId?: string;
      tenantId?: string;
    },
  ): Promise<void> {
    const timestamp = Date.now();
    const tenant = options?.tenantId || 'global';
    const hourKey = this.getUsageKey('hour', timestamp, tenant);
    const dayKey = this.getUsageKey('day', timestamp, tenant);

    const pipeline = this.redis.pipeline();

    // Update hourly usage
    pipeline.hincrbyfloat(`${hourKey}:total`, 'spent', actualCostUsd);
    pipeline.hincrby(`${hourKey}:total`, 'requests', 1);
    pipeline.hincrbyfloat(`${hourKey}:experts`, expert, actualCostUsd);
    pipeline.expire(`${hourKey}:total`, 3600); // 1 hour TTL
    pipeline.expire(`${hourKey}:experts`, 3600);

    // Update daily usage
    pipeline.hincrbyfloat(`${dayKey}:total`, 'spent', actualCostUsd);
    pipeline.hincrby(`${dayKey}:total`, 'requests', 1);
    pipeline.hincrbyfloat(`${dayKey}:experts`, expert, actualCostUsd);
    pipeline.expire(`${dayKey}:total`, 86400); // 24 hour TTL
    pipeline.expire(`${dayKey}:experts`, 86400);

    // Record per-user spending if provided
    if (options?.userId) {
      pipeline.hincrbyfloat(`${dayKey}:users`, options.userId, actualCostUsd);
      pipeline.expire(`${dayKey}:users`, 86400);
    }

    await pipeline.exec();
  }

  /**
   * Get current budget usage for a time period
   */
  public async getUsage(period: 'hour' | 'day'): Promise<BudgetUsage> {
    const timestamp = Date.now();
    // For getUsage, we assume 'global' tenant if not specified, or we could add a tenantId param
    const key = this.getUsageKey(period, timestamp, 'global');

    const [totalData, expertData] = await Promise.all([
      this.redis.hgetall(`${key}:total`),
      this.redis.hgetall(`${key}:experts`),
    ]);

    const expertBreakdown: Record<
      ExpertType,
      { spent: number; requests: number }
    > = {} as any;

    // Initialize all experts with zero values
    const allExperts: ExpertType[] = [
      'LLM_LIGHT',
      'LLM_HEAVY',
      'GRAPH_TOOL',
      'RAG_TOOL',
      'FILES_TOOL',
      'OSINT_TOOL',
      'EXPORT_TOOL',
    ];
    for (const expert of allExperts) {
      expertBreakdown[expert] = {
        spent: parseFloat(expertData[expert] || '0'),
        requests: 0, // TODO: Track per-expert request counts if needed
      };
    }

    return {
      period,
      timestamp,
      totalSpent: parseFloat(totalData.spent || '0'),
      requestCount: parseInt(totalData.requests || '0'),
      expertBreakdown,
    };
  }

  /**
   * Get budget status summary
   */
  public async getBudgetStatus(): Promise<{
    config: BudgetConfig;
    hourlyUsage: BudgetUsage;
    dailyUsage: BudgetUsage;
    status: 'healthy' | 'warning' | 'degraded' | 'critical' | 'blocked';
    nextResetTimes: {
      hourly: number;
      daily: number;
    };
  }> {
    const [hourlyUsage, dailyUsage] = await Promise.all([
      this.getUsage('hour'),
      this.getUsage('day'),
    ]);

    const dailyPercentUsed =
      (dailyUsage.totalSpent / this.config.dailyUsd) * 100;

    let status: 'healthy' | 'warning' | 'degraded' | 'critical' | 'blocked' =
      'healthy';
    if (dailyPercentUsed >= 100) {
      status = 'blocked';
    } else if (dailyPercentUsed >= this.config.degradationThresholds.critical) {
      status = 'critical';
    } else if (dailyPercentUsed >= this.config.degradationThresholds.degraded) {
      status = 'degraded';
    } else if (dailyPercentUsed >= this.config.degradationThresholds.warning) {
      status = 'warning';
    }

    const now = new Date();
    const nextHour = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours() + 1,
      0,
      0,
      0,
    );
    const nextDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );

    return {
      config: this.config,
      hourlyUsage,
      dailyUsage,
      status,
      nextResetTimes: {
        hourly: nextHour.getTime(),
        daily: nextDay.getTime(),
      },
    };
  }

  // Private helper methods

  private checkDailyBudget(
    usage: BudgetUsage,
    projectedCost: number,
    tenantId?: string,
  ): AdmissionResult {
    const totalAfterSpending = usage.totalSpent + projectedCost;
    const budgetRemaining = Math.max(
      0,
      this.config.dailyUsd - usage.totalSpent,
    );
    const percentUsed = Math.min(
      100,
      (usage.totalSpent / this.config.dailyUsd) * 100,
    );

    if (totalAfterSpending > this.config.dailyUsd) {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      const retryAfterMs = nextMidnight.getTime() - Date.now();

      return {
        admit: false,
        mode: 'blocked',
        reason: `Daily budget exceeded: $${usage.totalSpent.toFixed(2)}/$${this.config.dailyUsd.toFixed(2)} (would be $${totalAfterSpending.toFixed(2)})`,
        allowedExperts: [],
        blockedExperts: [
          'LLM_LIGHT',
          'LLM_HEAVY',
          'GRAPH_TOOL',
          'RAG_TOOL',
          'FILES_TOOL',
          'OSINT_TOOL',
          'EXPORT_TOOL',
        ],
        budgetRemaining,
        budgetPercentUsed: percentUsed,
        retryAfterMs,
      };
    }

    return {
      admit: true,
      mode: 'normal',
      reason: 'Within daily budget',
      allowedExperts: [
        'LLM_LIGHT',
        'LLM_HEAVY',
        'GRAPH_TOOL',
        'RAG_TOOL',
        'FILES_TOOL',
        'OSINT_TOOL',
        'EXPORT_TOOL',
      ],
      blockedExperts: [],
      budgetRemaining,
      budgetPercentUsed: percentUsed,
    };
  }

  private checkHourlyBudget(
    usage: BudgetUsage,
    projectedCost: number,
    tenantId?: string,
  ): AdmissionResult {
    const totalAfterSpending = usage.totalSpent + projectedCost;
    const budgetRemaining = Math.max(
      0,
      this.config.hourlyUsd - usage.totalSpent,
    );
    const percentUsed = Math.min(
      100,
      (usage.totalSpent / this.config.hourlyUsd) * 100,
    );

    if (totalAfterSpending > this.config.hourlyUsd) {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const retryAfterMs = nextHour.getTime() - Date.now();

      return {
        admit: false,
        mode: 'blocked',
        reason: `Hourly budget exceeded: $${usage.totalSpent.toFixed(2)}/$${this.config.hourlyUsd.toFixed(2)}`,
        allowedExperts: [],
        blockedExperts: [
          'LLM_LIGHT',
          'LLM_HEAVY',
          'GRAPH_TOOL',
          'RAG_TOOL',
          'FILES_TOOL',
          'OSINT_TOOL',
          'EXPORT_TOOL',
        ],
        budgetRemaining,
        budgetPercentUsed: percentUsed,
        retryAfterMs,
      };
    }

    return {
      admit: true,
      mode: 'normal',
      reason: 'Within hourly budget',
      allowedExperts: [
        'LLM_LIGHT',
        'LLM_HEAVY',
        'GRAPH_TOOL',
        'RAG_TOOL',
        'FILES_TOOL',
        'OSINT_TOOL',
        'EXPORT_TOOL',
      ],
      blockedExperts: [],
      budgetRemaining,
      budgetPercentUsed: percentUsed,
    };
  }

  private determineAdmissionMode(
    usage: BudgetUsage,
    projectedCost: number,
  ): 'normal' | 'degraded' | 'critical' {
    const percentUsed =
      ((usage.totalSpent + projectedCost) / this.config.dailyUsd) * 100;

    if (percentUsed >= this.config.degradationThresholds.critical) {
      return 'critical';
    } else if (percentUsed >= this.config.degradationThresholds.degraded) {
      return 'degraded';
    } else {
      return 'normal';
    }
  }

  private filterExperts(
    requestedExpert: ExpertType,
    mode: 'normal' | 'degraded' | 'critical' | 'emergency' | 'blocked',
    isEmergency: boolean,
  ): {
    admit: boolean;
    reason: string;
    allowedExperts: ExpertType[];
    blockedExperts: ExpertType[];
    retryAfterMs?: number;
  } {
    // Expert cost tiers (high to low)
    const expensiveExperts: ExpertType[] = ['LLM_HEAVY', 'OSINT_TOOL'];
    const moderateExperts: ExpertType[] = ['GRAPH_TOOL', 'RAG_TOOL'];
    const cheapExperts: ExpertType[] = [
      'LLM_LIGHT',
      'FILES_TOOL',
      'EXPORT_TOOL',
    ];

    switch (mode) {
      case 'normal':
        return {
          admit: true,
          reason: 'Normal budget mode - all experts available',
          allowedExperts: [
            ...expensiveExperts,
            ...moderateExperts,
            ...cheapExperts,
          ],
          blockedExperts: [],
        };

      case 'degraded':
        const degradedAllowed = [...moderateExperts, ...cheapExperts];
        const degradedBlocked = expensiveExperts;

        if (degradedBlocked.includes(requestedExpert) && !isEmergency) {
          return {
            admit: false,
            reason: `Budget degraded mode - expensive expert ${requestedExpert} blocked. Try: ${degradedAllowed.join(', ')}`,
            allowedExperts: degradedAllowed,
            blockedExperts: degradedBlocked,
          };
        }

        return {
          admit: true,
          reason: 'Budget degraded mode - expensive experts blocked',
          allowedExperts: degradedAllowed,
          blockedExperts: degradedBlocked,
        };

      case 'critical':
        const criticalAllowed = cheapExperts;
        const criticalBlocked = [...expensiveExperts, ...moderateExperts];

        if (criticalBlocked.includes(requestedExpert) && !isEmergency) {
          return {
            admit: false,
            reason: `Budget critical mode - only essential experts available. Try: ${criticalAllowed.join(', ')}`,
            allowedExperts: criticalAllowed,
            blockedExperts: criticalBlocked,
          };
        }

        return {
          admit: true,
          reason: 'Budget critical mode - only essential experts available',
          allowedExperts: criticalAllowed,
          blockedExperts: criticalBlocked,
        };

      case 'blocked':
        return {
          admit: false,
          reason: 'Budget exceeded - all experts blocked until reset',
          allowedExperts: [],
          blockedExperts: [
            ...expensiveExperts,
            ...moderateExperts,
            ...cheapExperts,
          ],
          retryAfterMs: this.getTimeUntilReset(),
        };

      default:
        return {
          admit: false,
          reason: 'Unknown budget mode',
          allowedExperts: [],
          blockedExperts: [
            ...expensiveExperts,
            ...moderateExperts,
            ...cheapExperts,
          ],
        };
    }
  }

  private hasEmergencyBudget(
    usage: BudgetUsage,
    projectedCost: number,
  ): boolean {
    const totalBudget = this.config.dailyUsd + this.config.emergencyReserveUsd;
    return usage.totalSpent + projectedCost <= totalBudget;
  }

  private getTimeUntilReset(): number {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    return nextMidnight.getTime() - now.getTime();
  }

  private getUsageKey(
    period: 'hour' | 'day',
    timestamp: number,
    tenantId: string,
  ): string {
    const date = new Date(timestamp);

    if (period === 'hour') {
      const hour = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
      return `${this.REDIS_KEY_PREFIX}:${tenantId}:hour:${hour}`;
    } else {
      const day = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      return `${this.REDIS_KEY_PREFIX}:${tenantId}:day:${day}`;
    }
  }
}

// Default configuration
export const defaultBudgetConfig: BudgetConfig = {
  dailyUsd: parseFloat(process.env.CONDUCTOR_BUDGET_DAILY_USD || '100'),
  hourlyUsd: parseFloat(process.env.CONDUCTOR_BUDGET_HOURLY_USD || '25'),
  emergencyReserveUsd: parseFloat(
    process.env.CONDUCTOR_BUDGET_EMERGENCY_USD || '50',
  ),
  degradationThresholds: {
    warning: 80,
    degraded: 90,
    critical: 95,
  },
};

// Utility functions
export function createBudgetController(
  redis: Redis,
  config?: Partial<BudgetConfig>,
): BudgetAdmissionController {
  return new BudgetAdmissionController(redis, {
    ...defaultBudgetConfig,
    ...config,
  });
}
