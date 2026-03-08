"use strict";
// Conductor Budget Hard-Stop Controller
// Implements budget enforcement with graceful degradation and cost containment
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBudgetConfig = exports.BudgetAdmissionController = void 0;
exports.createBudgetController = createBudgetController;
class BudgetAdmissionController {
    redis;
    config;
    REDIS_KEY_PREFIX = 'conductor:budget';
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
    }
    /**
     * Admit or reject task based on budget constraints
     */
    async admit(expert, projectedCostUsd, options) {
        const [hourlyUsage, dailyUsage] = await Promise.all([
            this.getUsage('hour'),
            this.getUsage('day'),
        ]);
        // Check daily budget first (primary constraint)
        const dailyCheck = this.checkDailyBudget(dailyUsage, projectedCostUsd, options?.tenantId);
        if (dailyCheck.mode === 'blocked' && !options?.isEmergency) {
            return dailyCheck;
        }
        // Check hourly budget (rate limiting)
        const hourlyCheck = this.checkHourlyBudget(hourlyUsage, projectedCostUsd, options?.tenantId);
        if (hourlyCheck.mode === 'blocked' && !options?.isEmergency) {
            return hourlyCheck;
        }
        // Determine admission mode based on budget thresholds
        const admissionMode = this.determineAdmissionMode(dailyUsage, projectedCostUsd);
        // Apply expert filtering based on mode
        const expertDecision = this.filterExperts(expert, admissionMode, options?.isEmergency || false);
        // Emergency override logic
        if (options?.isEmergency &&
            this.hasEmergencyBudget(dailyUsage, projectedCostUsd)) {
            // Reserve the budget for emergency
            await this.reserveBudget(expert, projectedCostUsd, {
                tenantId: options?.tenantId,
                userId: options?.userId,
                agentId: options?.agentId,
            });
            return {
                admit: true,
                mode: 'emergency',
                reason: 'Emergency override - using reserve budget',
                allowedExperts: [expert], // Allow requested expert in emergency
                blockedExperts: [],
                budgetRemaining: this.config.emergencyReserveUsd,
                budgetPercentUsed: Math.min(100, (dailyUsage.totalSpent / this.config.dailyUsd) * 100),
            };
        }
        if (expertDecision.admit) {
            // Atomically reserve the budget to prevent race conditions
            await this.reserveBudget(expert, projectedCostUsd, {
                tenantId: options?.tenantId,
                userId: options?.userId,
                agentId: options?.agentId,
            });
        }
        const budgetRemaining = Math.max(0, this.config.dailyUsd - dailyUsage.totalSpent);
        const budgetPercentUsed = Math.min(100, (dailyUsage.totalSpent / this.config.dailyUsd) * 100);
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
     * Reserve budget for a request.
     * This is called automatically by admit() if the request is approved.
     * recordSpending() should then be called with the DELTA (actual - projected)
     * or we just accept projected as the cost.
     *
     * To simplify for this patch: We treat 'projected' as the cost.
     * If actual cost is known later, recordSpending can adjust.
     */
    async reserveBudget(expert, costUsd, options) {
        const timestamp = Date.now();
        const tenant = options?.tenantId || 'global';
        const hourKey = this.getUsageKey('hour', timestamp, tenant);
        const dayKey = this.getUsageKey('day', timestamp, tenant);
        const pipeline = this.redis.pipeline();
        // Update hourly usage
        pipeline.hincrbyfloat(`${hourKey}:total`, 'spent', costUsd);
        pipeline.hincrby(`${hourKey}:total`, 'requests', 1);
        pipeline.hincrbyfloat(`${hourKey}:experts`, expert, costUsd);
        pipeline.expire(`${hourKey}:total`, 3600); // 1 hour TTL
        pipeline.expire(`${hourKey}:experts`, 3600);
        // Update daily usage
        pipeline.hincrbyfloat(`${dayKey}:total`, 'spent', costUsd);
        pipeline.hincrby(`${dayKey}:total`, 'requests', 1);
        pipeline.hincrbyfloat(`${dayKey}:experts`, expert, costUsd);
        pipeline.expire(`${dayKey}:total`, 86400); // 24 hour TTL
        pipeline.expire(`${dayKey}:experts`, 86400);
        if (options?.userId) {
            pipeline.hincrbyfloat(`${dayKey}:users`, options.userId, costUsd);
            pipeline.expire(`${dayKey}:users`, 86400);
        }
        if (options?.agentId) {
            pipeline.hincrbyfloat(`${dayKey}:agents`, options.agentId, costUsd);
            pipeline.expire(`${dayKey}:agents`, 86400);
        }
        await pipeline.exec();
    }
    /**
     * Record actual spending for budget tracking.
     *
     * @param expert The expert used
     * @param actualCostUsd The actual cost incurred
     * @param options.reservedCost If provided, this amount was already reserved by admit()
     *                             and we will only record the delta (actual - reserved).
     */
    async recordSpending(expert, actualCostUsd, options) {
        const timestamp = Date.now();
        const tenant = options?.tenantId || 'global';
        const reserved = options?.reservedCost || 0;
        // Calculate the delta to apply (can be negative if actual < reserved)
        const deltaCost = actualCostUsd - reserved;
        // If no delta, we don't need to update spending, but we might want to update request counts?
        // admit() doesn't update request count in this implementation (it updates 'requests' in reserveBudget).
        // So if reserved > 0, we assume request count was incremented.
        // If reserved == 0, we assume this is a fresh spending record (not pre-admitted), so we increment requests.
        const deltaRequests = reserved > 0 ? 0 : 1;
        if (deltaCost === 0 && deltaRequests === 0) {
            return;
        }
        const hourKey = this.getUsageKey('hour', timestamp, tenant);
        const dayKey = this.getUsageKey('day', timestamp, tenant);
        const pipeline = this.redis.pipeline();
        // Update hourly usage
        pipeline.hincrbyfloat(`${hourKey}:total`, 'spent', deltaCost);
        if (deltaRequests > 0)
            pipeline.hincrby(`${hourKey}:total`, 'requests', deltaRequests);
        pipeline.hincrbyfloat(`${hourKey}:experts`, expert, deltaCost);
        pipeline.expire(`${hourKey}:total`, 3600); // 1 hour TTL
        pipeline.expire(`${hourKey}:experts`, 3600);
        // Update daily usage
        pipeline.hincrbyfloat(`${dayKey}:total`, 'spent', deltaCost);
        if (deltaRequests > 0)
            pipeline.hincrby(`${dayKey}:total`, 'requests', deltaRequests);
        pipeline.hincrbyfloat(`${dayKey}:experts`, expert, deltaCost);
        pipeline.expire(`${dayKey}:total`, 86400); // 24 hour TTL
        pipeline.expire(`${dayKey}:experts`, 86400);
        // Record per-user spending if provided
        if (options?.userId) {
            pipeline.hincrbyfloat(`${dayKey}:users`, options.userId, deltaCost);
            pipeline.expire(`${dayKey}:users`, 86400);
        }
        // Record per-agent spending if provided
        if (options?.agentId) {
            pipeline.hincrbyfloat(`${dayKey}:agents`, options.agentId, deltaCost);
            pipeline.expire(`${dayKey}:agents`, 86400);
        }
        await pipeline.exec();
    }
    /**
     * Get current budget usage for a time period
     */
    async getUsage(period) {
        const timestamp = Date.now();
        // For getUsage, we assume 'global' tenant if not specified, or we could add a tenantId param
        const key = this.getUsageKey(period, timestamp, 'global');
        const [totalData, expertData] = await Promise.all([
            this.redis.hgetall(`${key}:total`),
            this.redis.hgetall(`${key}:experts`),
        ]);
        const expertBreakdown = {};
        // Initialize all experts with zero values
        const allExperts = [
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
    async getBudgetStatus() {
        const [hourlyUsage, dailyUsage] = await Promise.all([
            this.getUsage('hour'),
            this.getUsage('day'),
        ]);
        const dailyPercentUsed = (dailyUsage.totalSpent / this.config.dailyUsd) * 100;
        let status = 'healthy';
        if (dailyPercentUsed >= 100) {
            status = 'blocked';
        }
        else if (dailyPercentUsed >= this.config.degradationThresholds.critical) {
            status = 'critical';
        }
        else if (dailyPercentUsed >= this.config.degradationThresholds.degraded) {
            status = 'degraded';
        }
        else if (dailyPercentUsed >= this.config.degradationThresholds.warning) {
            status = 'warning';
        }
        const now = new Date();
        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
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
    checkDailyBudget(usage, projectedCost, tenantId) {
        const totalAfterSpending = usage.totalSpent + projectedCost;
        const budgetRemaining = Math.max(0, this.config.dailyUsd - usage.totalSpent);
        const percentUsed = Math.min(100, (usage.totalSpent / this.config.dailyUsd) * 100);
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
    checkHourlyBudget(usage, projectedCost, tenantId) {
        const totalAfterSpending = usage.totalSpent + projectedCost;
        const budgetRemaining = Math.max(0, this.config.hourlyUsd - usage.totalSpent);
        const percentUsed = Math.min(100, (usage.totalSpent / this.config.hourlyUsd) * 100);
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
    determineAdmissionMode(usage, projectedCost) {
        const percentUsed = ((usage.totalSpent + projectedCost) / this.config.dailyUsd) * 100;
        if (percentUsed >= this.config.degradationThresholds.critical) {
            return 'critical';
        }
        else if (percentUsed >= this.config.degradationThresholds.degraded) {
            return 'degraded';
        }
        else {
            return 'normal';
        }
    }
    filterExperts(requestedExpert, mode, isEmergency) {
        // Expert cost tiers (high to low)
        const expensiveExperts = ['LLM_HEAVY', 'OSINT_TOOL'];
        const moderateExperts = ['GRAPH_TOOL', 'RAG_TOOL'];
        const cheapExperts = [
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
    hasEmergencyBudget(usage, projectedCost) {
        const totalBudget = this.config.dailyUsd + this.config.emergencyReserveUsd;
        return usage.totalSpent + projectedCost <= totalBudget;
    }
    getTimeUntilReset() {
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        return nextMidnight.getTime() - now.getTime();
    }
    getUsageKey(period, timestamp, tenantId) {
        const date = new Date(timestamp);
        if (period === 'hour') {
            const hour = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
            return `${this.REDIS_KEY_PREFIX}:${tenantId}:hour:${hour}`;
        }
        else {
            const day = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            return `${this.REDIS_KEY_PREFIX}:${tenantId}:day:${day}`;
        }
    }
}
exports.BudgetAdmissionController = BudgetAdmissionController;
// Default configuration
exports.defaultBudgetConfig = {
    dailyUsd: parseFloat(process.env.CONDUCTOR_BUDGET_DAILY_USD || '100'),
    hourlyUsd: parseFloat(process.env.CONDUCTOR_BUDGET_HOURLY_USD || '25'),
    emergencyReserveUsd: parseFloat(process.env.CONDUCTOR_BUDGET_EMERGENCY_USD || '50'),
    degradationThresholds: {
        warning: 80,
        degraded: 90,
        critical: 95,
    },
};
// Utility functions
function createBudgetController(redis, config) {
    return new BudgetAdmissionController(redis, {
        ...exports.defaultBudgetConfig,
        ...config,
    });
}
