// Conductor Governance Limits
// Implements cost controls, rate limiting, and resource quotas for MoE Conductor

import { ExpertType } from '../types';
import { createHash } from 'crypto';

export interface CostLimits {
  maxCostPerTask: number;
  maxCostPerHour: number;
  maxCostPerDay: number;
  maxCostPerMonth: number;
  budgetAlerts: {
    warning: number; // Percentage of budget
    critical: number; // Percentage of budget
  };
}

export interface RateLimits {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxConcurrentRequests: number;
  burstLimit: number;
  cooldownPeriodMs: number;
}

export interface QuotaLimits {
  maxTasksPerHour: number;
  maxTasksPerDay: number;
  maxTokensPerTask: number;
  maxOutputSizeBytes: number;
}

export interface GovernancePolicy {
  userId: string;
  userRole: 'viewer' | 'analyst' | 'admin' | 'emergency';
  costLimits: CostLimits;
  rateLimits: RateLimits;
  quotaLimits: QuotaLimits;
  expertLimits: Partial<
    Record<
      ExpertType,
      {
        enabled: boolean;
        costMultiplier: number;
        rateMultiplier: number;
        maxConcurrent: number;
      }
    >
  >;
}

export interface Usage {
  userId: string;
  period: 'minute' | 'hour' | 'day' | 'month';
  timestamp: number;
  requestCount: number;
  totalCost: number;
  taskCount: number;
  tokensUsed: number;
  bytesProcessed: number;
}

export interface ViolationResult {
  allowed: boolean;
  violationType?: 'cost' | 'rate' | 'quota' | 'expert';
  message?: string;
  retryAfterMs?: number;
  currentUsage?: number;
  limit?: number;
}

export class GovernanceLimitEngine {
  private policies = new Map<string, GovernancePolicy>();
  private usage = new Map<string, Usage[]>();
  private concurrentRequests = new Map<string, number>();

  constructor() {
    this.initializeDefaultPolicies();
    this.startCleanupTimer();
  }

  /**
   * Set governance policy for a user
   */
  public setPolicy(userId: string, policy: GovernancePolicy): void {
    this.policies.set(userId, policy);
  }

  /**
   * Get governance policy for a user
   */
  public getPolicy(userId: string): GovernancePolicy {
    const policy = this.policies.get(userId);
    if (policy) {
      return policy;
    }

    // Return default policy based on role inference
    return this.getDefaultPolicy(userId, 'analyst');
  }

  /**
   * Check if a request is allowed under governance policies
   */
  public async checkLimits(
    userId: string,
    expertType: ExpertType,
    estimatedCost: number,
    estimatedTokens: number = 0,
  ): Promise<ViolationResult> {
    const policy = this.getPolicy(userId);

    // Check expert-specific limits
    const expertConfig = policy.expertLimits[expertType];
    if (expertConfig && !expertConfig.enabled) {
      return {
        allowed: false,
        violationType: 'expert',
        message: `Expert ${expertType} is not enabled for user ${userId}`,
      };
    }

    // Apply expert-specific multipliers
    const adjustedCost = estimatedCost * (expertConfig?.costMultiplier || 1);
    const adjustedTokens = estimatedTokens;

    // Check cost limits
    const costCheck = await this.checkCostLimits(
      userId,
      adjustedCost,
      policy.costLimits,
    );
    if (!costCheck.allowed) {
      return costCheck;
    }

    // Check rate limits
    const rateCheck = await this.checkRateLimits(userId, policy.rateLimits);
    if (!rateCheck.allowed) {
      return rateCheck;
    }

    // Check quota limits
    const quotaCheck = await this.checkQuotaLimits(
      userId,
      adjustedTokens,
      policy.quotaLimits,
    );
    if (!quotaCheck.allowed) {
      return quotaCheck;
    }

    // Check concurrent request limits
    const concurrentCheck = await this.checkConcurrentLimits(
      userId,
      expertType,
      policy,
    );
    if (!concurrentCheck.allowed) {
      return concurrentCheck;
    }

    return { allowed: true };
  }

  /**
   * Record usage for governance tracking
   */
  public recordUsage(
    userId: string,
    cost: number,
    tokens: number,
    bytesProcessed: number,
  ): void {
    const now = Date.now();

    // Record usage for different time periods
    for (const period of ['minute', 'hour', 'day', 'month'] as const) {
      const periodKey = this.getPeriodKey(now, period);
      const usageKey = `${userId}:${period}:${periodKey}`;

      const existingUsage = this.usage.get(usageKey) || [];
      const currentUsage = existingUsage.find((u) => u.timestamp === periodKey);

      if (currentUsage) {
        currentUsage.requestCount++;
        currentUsage.totalCost += cost;
        currentUsage.taskCount++;
        currentUsage.tokensUsed += tokens;
        currentUsage.bytesProcessed += bytesProcessed;
      } else {
        existingUsage.push({
          userId,
          period,
          timestamp: periodKey,
          requestCount: 1,
          totalCost: cost,
          taskCount: 1,
          tokensUsed: tokens,
          bytesProcessed,
        });
      }

      this.usage.set(usageKey, existingUsage);
    }
  }

  /**
   * Increment concurrent request counter
   */
  public incrementConcurrent(userId: string): void {
    const current = this.concurrentRequests.get(userId) || 0;
    this.concurrentRequests.set(userId, current + 1);
  }

  /**
   * Decrement concurrent request counter
   */
  public decrementConcurrent(userId: string): void {
    const current = this.concurrentRequests.get(userId) || 0;
    this.concurrentRequests.set(userId, Math.max(0, current - 1));
  }

  /**
   * Get current usage statistics for a user
   */
  public getUsageStats(userId: string): {
    minute: Usage;
    hour: Usage;
    day: Usage;
    month: Usage;
  } {
    const now = Date.now();
    const stats = {} as any;

    for (const period of ['minute', 'hour', 'day', 'month'] as const) {
      const periodKey = this.getPeriodKey(now, period);
      const usageKey = `${userId}:${period}:${periodKey}`;
      const usageList = this.usage.get(usageKey) || [];
      const usage = usageList.find((u) => u.timestamp === periodKey);

      stats[period] = usage || {
        userId,
        period,
        timestamp: periodKey,
        requestCount: 0,
        totalCost: 0,
        taskCount: 0,
        tokensUsed: 0,
        bytesProcessed: 0,
      };
    }

    return stats;
  }

  /**
   * Check if user is approaching limits (for warnings)
   */
  public getApproachingLimits(userId: string): {
    warnings: string[];
    critical: string[];
  } {
    const policy = this.getPolicy(userId);
    const stats = this.getUsageStats(userId);
    const warnings: string[] = [];
    const critical: string[] = [];

    // Cost limit warnings
    const hourlyUsage = stats.hour.totalCost;
    const hourlyLimit = policy.costLimits.maxCostPerHour;
    const warningThreshold =
      hourlyLimit * (policy.costLimits.budgetAlerts.warning / 100);
    const criticalThreshold =
      hourlyLimit * (policy.costLimits.budgetAlerts.critical / 100);

    if (hourlyUsage >= criticalThreshold) {
      critical.push(
        `Cost usage (${hourlyUsage.toFixed(2)}) approaching critical limit (${criticalThreshold.toFixed(2)})`,
      );
    } else if (hourlyUsage >= warningThreshold) {
      warnings.push(
        `Cost usage (${hourlyUsage.toFixed(2)}) approaching warning threshold (${warningThreshold.toFixed(2)})`,
      );
    }

    // Rate limit warnings
    const minuteRequests = stats.minute.requestCount;
    const rateLimit = policy.rateLimits.maxRequestsPerMinute;
    if (minuteRequests >= rateLimit * 0.8) {
      warnings.push(
        `Rate usage (${minuteRequests}) approaching limit (${rateLimit})`,
      );
    }

    // Quota warnings
    const dailyTasks = stats.day.taskCount;
    const taskLimit = policy.quotaLimits.maxTasksPerDay;
    if (dailyTasks >= taskLimit * 0.9) {
      warnings.push(
        `Daily task quota (${dailyTasks}) approaching limit (${taskLimit})`,
      );
    }

    return { warnings, critical };
  }

  // Private helper methods

  private async checkCostLimits(
    userId: string,
    cost: number,
    limits: CostLimits,
  ): Promise<ViolationResult> {
    const stats = this.getUsageStats(userId);

    // Check per-task limit
    if (cost > limits.maxCostPerTask) {
      return {
        allowed: false,
        violationType: 'cost',
        message: `Task cost ($${cost.toFixed(2)}) exceeds per-task limit ($${limits.maxCostPerTask.toFixed(2)})`,
        currentUsage: cost,
        limit: limits.maxCostPerTask,
      };
    }

    // Check hourly limit
    if (stats.hour.totalCost + cost > limits.maxCostPerHour) {
      return {
        allowed: false,
        violationType: 'cost',
        message: `Would exceed hourly cost limit ($${limits.maxCostPerHour.toFixed(2)})`,
        currentUsage: stats.hour.totalCost,
        limit: limits.maxCostPerHour,
      };
    }

    // Check daily limit
    if (stats.day.totalCost + cost > limits.maxCostPerDay) {
      return {
        allowed: false,
        violationType: 'cost',
        message: `Would exceed daily cost limit ($${limits.maxCostPerDay.toFixed(2)})`,
        currentUsage: stats.day.totalCost,
        limit: limits.maxCostPerDay,
      };
    }

    // Check monthly limit
    if (stats.month.totalCost + cost > limits.maxCostPerMonth) {
      return {
        allowed: false,
        violationType: 'cost',
        message: `Would exceed monthly cost limit ($${limits.maxCostPerMonth.toFixed(2)})`,
        currentUsage: stats.month.totalCost,
        limit: limits.maxCostPerMonth,
      };
    }

    return { allowed: true };
  }

  private async checkRateLimits(
    userId: string,
    limits: RateLimits,
  ): Promise<ViolationResult> {
    const stats = this.getUsageStats(userId);

    // Check per-minute limit
    if (stats.minute.requestCount >= limits.maxRequestsPerMinute) {
      const retryAfterMs = 60000 - (Date.now() % 60000); // Time until next minute
      return {
        allowed: false,
        violationType: 'rate',
        message: `Rate limit exceeded (${stats.minute.requestCount}/${limits.maxRequestsPerMinute} per minute)`,
        retryAfterMs,
        currentUsage: stats.minute.requestCount,
        limit: limits.maxRequestsPerMinute,
      };
    }

    // Check hourly limit
    if (stats.hour.requestCount >= limits.maxRequestsPerHour) {
      const retryAfterMs = 3600000 - (Date.now() % 3600000); // Time until next hour
      return {
        allowed: false,
        violationType: 'rate',
        message: `Hourly rate limit exceeded (${stats.hour.requestCount}/${limits.maxRequestsPerHour})`,
        retryAfterMs,
        currentUsage: stats.hour.requestCount,
        limit: limits.maxRequestsPerHour,
      };
    }

    return { allowed: true };
  }

  private async checkQuotaLimits(
    userId: string,
    tokens: number,
    limits: QuotaLimits,
  ): Promise<ViolationResult> {
    const stats = this.getUsageStats(userId);

    // Check hourly task quota
    if (stats.hour.taskCount >= limits.maxTasksPerHour) {
      return {
        allowed: false,
        violationType: 'quota',
        message: `Hourly task quota exceeded (${stats.hour.taskCount}/${limits.maxTasksPerHour})`,
        currentUsage: stats.hour.taskCount,
        limit: limits.maxTasksPerHour,
      };
    }

    // Check daily task quota
    if (stats.day.taskCount >= limits.maxTasksPerDay) {
      return {
        allowed: false,
        violationType: 'quota',
        message: `Daily task quota exceeded (${stats.day.taskCount}/${limits.maxTasksPerDay})`,
        currentUsage: stats.day.taskCount,
        limit: limits.maxTasksPerDay,
      };
    }

    // Check token limit per task
    if (tokens > limits.maxTokensPerTask) {
      return {
        allowed: false,
        violationType: 'quota',
        message: `Task token count (${tokens}) exceeds limit (${limits.maxTokensPerTask})`,
        currentUsage: tokens,
        limit: limits.maxTokensPerTask,
      };
    }

    return { allowed: true };
  }

  private async checkConcurrentLimits(
    userId: string,
    expertType: ExpertType,
    policy: GovernancePolicy,
  ): Promise<ViolationResult> {
    const currentConcurrent = this.concurrentRequests.get(userId) || 0;
    const globalLimit = policy.rateLimits.maxConcurrentRequests;
    const expertConfig = policy.expertLimits[expertType];
    const expertLimit = expertConfig?.maxConcurrent || globalLimit;

    if (currentConcurrent >= Math.min(globalLimit, expertLimit)) {
      return {
        allowed: false,
        violationType: 'rate',
        message: `Concurrent request limit exceeded (${currentConcurrent}/${Math.min(globalLimit, expertLimit)})`,
        currentUsage: currentConcurrent,
        limit: Math.min(globalLimit, expertLimit),
      };
    }

    return { allowed: true };
  }

  private getPeriodKey(
    timestamp: number,
    period: 'minute' | 'hour' | 'day' | 'month',
  ): number {
    const date = new Date(timestamp);

    switch (period) {
      case 'minute':
        return Math.floor(timestamp / 60000) * 60000;
      case 'hour':
        return Math.floor(timestamp / 3600000) * 3600000;
      case 'day':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ).getTime();
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      default:
        return timestamp;
    }
  }

  private getDefaultPolicy(userId: string, role: string): GovernancePolicy {
    // Define role-based default policies
    const policies: Record<string, Partial<GovernancePolicy>> = {
      viewer: {
        costLimits: {
          maxCostPerTask: 0.5,
          maxCostPerHour: 10.0,
          maxCostPerDay: 50.0,
          maxCostPerMonth: 500.0,
          budgetAlerts: { warning: 80, critical: 95 },
        },
        rateLimits: {
          maxRequestsPerMinute: 10,
          maxRequestsPerHour: 100,
          maxConcurrentRequests: 2,
          burstLimit: 5,
          cooldownPeriodMs: 1000,
        },
        quotaLimits: {
          maxTasksPerHour: 20,
          maxTasksPerDay: 100,
          maxTokensPerTask: 2000,
          maxOutputSizeBytes: 1024 * 1024, // 1MB
        },
      },
      analyst: {
        costLimits: {
          maxCostPerTask: 2.0,
          maxCostPerHour: 50.0,
          maxCostPerDay: 200.0,
          maxCostPerMonth: 2000.0,
          budgetAlerts: { warning: 80, critical: 95 },
        },
        rateLimits: {
          maxRequestsPerMinute: 30,
          maxRequestsPerHour: 500,
          maxConcurrentRequests: 5,
          burstLimit: 10,
          cooldownPeriodMs: 500,
        },
        quotaLimits: {
          maxTasksPerHour: 100,
          maxTasksPerDay: 500,
          maxTokensPerTask: 8000,
          maxOutputSizeBytes: 10 * 1024 * 1024, // 10MB
        },
      },
      admin: {
        costLimits: {
          maxCostPerTask: 10.0,
          maxCostPerHour: 200.0,
          maxCostPerDay: 1000.0,
          maxCostPerMonth: 10000.0,
          budgetAlerts: { warning: 80, critical: 95 },
        },
        rateLimits: {
          maxRequestsPerMinute: 100,
          maxRequestsPerHour: 2000,
          maxConcurrentRequests: 20,
          burstLimit: 50,
          cooldownPeriodMs: 100,
        },
        quotaLimits: {
          maxTasksPerHour: 500,
          maxTasksPerDay: 2000,
          maxTokensPerTask: 32000,
          maxOutputSizeBytes: 100 * 1024 * 1024, // 100MB
        },
      },
      emergency: {
        costLimits: {
          maxCostPerTask: 50.0,
          maxCostPerHour: 1000.0,
          maxCostPerDay: 5000.0,
          maxCostPerMonth: 50000.0,
          budgetAlerts: { warning: 90, critical: 98 },
        },
        rateLimits: {
          maxRequestsPerMinute: 500,
          maxRequestsPerHour: 10000,
          maxConcurrentRequests: 50,
          burstLimit: 100,
          cooldownPeriodMs: 50,
        },
        quotaLimits: {
          maxTasksPerHour: 1000,
          maxTasksPerDay: 10000,
          maxTokensPerTask: 100000,
          maxOutputSizeBytes: 500 * 1024 * 1024, // 500MB
        },
      },
    };

    const basePolicy = policies[role] || policies.analyst;

    return {
      userId,
      userRole: role as any,
      ...basePolicy,
      expertLimits: {
        LLM_LIGHT: {
          enabled: true,
          costMultiplier: 0.5,
          rateMultiplier: 1,
          maxConcurrent: 10,
        },
        LLM_HEAVY: {
          enabled: true,
          costMultiplier: 2.0,
          rateMultiplier: 0.5,
          maxConcurrent: 3,
        },
        GRAPH_TOOL: {
          enabled: true,
          costMultiplier: 1.0,
          rateMultiplier: 1,
          maxConcurrent: 5,
        },
        RAG_TOOL: {
          enabled: true,
          costMultiplier: 1.0,
          rateMultiplier: 1,
          maxConcurrent: 5,
        },
        FILES_TOOL: {
          enabled: true,
          costMultiplier: 0.1,
          rateMultiplier: 2,
          maxConcurrent: 10,
        },
        OSINT_TOOL: {
          enabled: role !== 'viewer',
          costMultiplier: 3.0,
          rateMultiplier: 0.3,
          maxConcurrent: 2,
        },
        EXPORT_TOOL: {
          enabled: true,
          costMultiplier: 0.2,
          rateMultiplier: 1,
          maxConcurrent: 5,
        },
      },
    } as GovernancePolicy;
  }

  private initializeDefaultPolicies(): void {
    // Initialize any global or system-level policies
  }

  private startCleanupTimer(): void {
    // Clean up old usage data every hour
    setInterval(
      () => {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

        for (const [key, usageList] of this.usage.entries()) {
          const filteredUsage = usageList.filter((u) => u.timestamp > cutoff);
          if (filteredUsage.length !== usageList.length) {
            this.usage.set(key, filteredUsage);
          }
        }
      },
      60 * 60 * 1000,
    ); // Every hour
  }
}

// Singleton instance
export const governanceLimitEngine = new GovernanceLimitEngine();

/**
 * Helper function to estimate task cost based on input
 */
export function estimateTaskCost(task: string, expertType: ExpertType): number {
  const baseCosts: Record<ExpertType, number> = {
    LLM_LIGHT: 0.02,
    LLM_HEAVY: 0.15,
    GRAPH_TOOL: 0.05,
    RAG_TOOL: 0.08,
    FILES_TOOL: 0.01,
    OSINT_TOOL: 0.25,
    EXPORT_TOOL: 0.03,
  };

  const baseCost = baseCosts[expertType] || 0.05;

  // Adjust cost based on task complexity
  const wordCount = task.split(' ').length;
  let complexityMultiplier = 1.0;

  if (wordCount > 100) complexityMultiplier = 2.0;
  else if (wordCount > 50) complexityMultiplier = 1.5;
  else if (wordCount > 20) complexityMultiplier = 1.2;

  return baseCost * complexityMultiplier;
}

/**
 * Helper function to estimate token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 0.75 words
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / 0.75);
}
