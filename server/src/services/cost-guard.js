"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.costGuard = exports.CostGuardService = void 0;
exports.costGuardMiddleware = costGuardMiddleware;
exports.costRecordingMiddleware = costRecordingMiddleware;
const pino_1 = __importDefault(require("pino"));
const telemetry_js_1 = require("../observability/telemetry.js");
const logger = pino_1.default({ name: 'cost-guard' });
const DEFAULT_COSTS = {
    graphql_query: 0.001, // $0.001 per query
    cypher_query: 0.002, // $0.002 per Cypher query
    nlq_parse: 0.005, // $0.005 per NL parse
    provenance_write: 0.0001, // $0.0001 per provenance write
    export_operation: 0.01, // $0.01 per export
    connector_ingest: 0.0005, // $0.0005 per ingest operation
};
const DEFAULT_BUDGET = {
    daily: 10.0, // $10/day default
    monthly: 250.0, // $250/month default
    query_burst: 1.0, // $1 burst limit
    rate_limit_cost: 0.5, // Rate limit at $0.50
};
class CostGuardService {
    costs;
    tenantBudgets = new Map();
    tenantUsage = new Map();
    activeCostlyOperations = new Map();
    constructor(costConfig) {
        this.costs = { ...DEFAULT_COSTS, ...costConfig };
        logger.info('Cost Guard Service initialized', { costs: this.costs });
    }
    // Set budget limits for a tenant
    setBudgetLimits(tenantId, limits) {
        const currentLimits = this.tenantBudgets.get(tenantId) || DEFAULT_BUDGET;
        const newLimits = { ...currentLimits, ...limits };
        this.tenantBudgets.set(tenantId, newLimits);
        logger.info({ tenantId, limits: newLimits }, 'Budget limits updated');
    }
    // Get current usage for a tenant
    getCurrentUsage(tenantId) {
        const usage = this.tenantUsage.get(tenantId);
        if (!usage) {
            const now = new Date();
            const initialUsage = { daily: 0, monthly: 0, lastReset: now };
            this.tenantUsage.set(tenantId, initialUsage);
            return initialUsage;
        }
        // Reset daily usage if it's a new day
        const now = new Date();
        const lastReset = usage.lastReset;
        if (now.getDate() !== lastReset.getDate() ||
            now.getMonth() !== lastReset.getMonth()) {
            usage.daily = 0;
            usage.lastReset = now;
            // Reset monthly usage if it's a new month
            if (now.getMonth() !== lastReset.getMonth()) {
                usage.monthly = 0;
            }
        }
        return usage;
    }
    // Calculate cost for an operation
    calculateCost(context) {
        const baseCost = this.costs[context.operation] || 0.001;
        let cost = baseCost;
        // Apply complexity multiplier
        if (context.complexity) {
            cost *= Math.max(1, context.complexity);
        }
        // Apply result count multiplier for queries
        if (context.resultCount &&
            ['graphql_query', 'cypher_query'].includes(context.operation)) {
            const resultMultiplier = Math.log10(context.resultCount + 1) / 10 + 1;
            cost *= resultMultiplier;
        }
        // Apply duration multiplier for long-running operations
        if (context.duration && context.duration > 5000) {
            // > 5 seconds
            const durationMultiplier = Math.min(context.duration / 5000, 10); // Cap at 10x
            cost *= durationMultiplier;
        }
        return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
    }
    // Pre-flight cost check before operation
    async checkCostAllowance(context) {
        const estimatedCost = this.calculateCost(context);
        const usage = this.getCurrentUsage(context.tenantId);
        const limits = this.tenantBudgets.get(context.tenantId) || DEFAULT_BUDGET;
        const warnings = [];
        let allowed = true;
        let rateLimited = false;
        // Check budget limits
        const dailyRemaining = limits.daily - usage.daily;
        const monthlyRemaining = limits.monthly - usage.monthly;
        const budgetRemaining = Math.min(dailyRemaining, monthlyRemaining);
        if (estimatedCost > budgetRemaining) {
            allowed = false;
            warnings.push(`Insufficient budget: estimated cost $${estimatedCost}, remaining $${budgetRemaining}`);
        }
        // Check burst limits
        if (estimatedCost > limits.query_burst) {
            allowed = false;
            warnings.push(`Exceeds burst limit: estimated cost $${estimatedCost}, limit $${limits.query_burst}`);
        }
        // Check rate limiting threshold
        if (usage.daily > limits.rate_limit_cost) {
            rateLimited = true;
            warnings.push(`Rate limited: daily usage $${usage.daily} exceeds $${limits.rate_limit_cost}`);
        }
        const budgetUtilization = (usage.daily + estimatedCost) / limits.daily;
        // Track metrics
        telemetry_js_1.businessMetrics.costBudgetUtilization.record(budgetUtilization, {
            tenant_id: context.tenantId,
        });
        return {
            allowed,
            estimatedCost,
            budgetRemaining,
            budgetUtilization,
            warnings,
            rateLimited,
        };
    }
    // Record actual cost after operation completion
    async recordActualCost(context, actualCost) {
        const cost = actualCost || this.calculateCost(context);
        const usage = this.getCurrentUsage(context.tenantId);
        // Update usage
        usage.daily += cost;
        usage.monthly += cost;
        // Track with telemetry
        telemetry_js_1.costTracker.track(context.operation, cost, {
            tenantId: context.tenantId,
            userId: context.userId,
            complexity: context.complexity,
            resultCount: context.resultCount,
            duration: context.duration,
        });
        logger.debug({
            tenantId: context.tenantId,
            operation: context.operation,
            cost,
            dailyUsage: usage.daily,
            monthlyUsage: usage.monthly,
        }, 'Cost recorded');
    }
    // Kill expensive operations
    async killExpensiveOperation(operationId, reason) {
        const operation = this.activeCostlyOperations.get(operationId);
        if (!operation) {
            return false;
        }
        const duration = Date.now() - operation.startTime.getTime();
        logger.warn({
            operationId,
            reason,
            estimatedCost: operation.cost,
            duration,
        }, 'Killing expensive operation');
        // Remove from active operations
        this.activeCostlyOperations.delete(operationId);
        // Record metrics
        telemetry_js_1.businessMetrics.cypherQueryDuration.record(duration, {
            status: 'killed',
            reason,
        });
        return true;
    }
    // Monitor operation for cost overruns
    startCostlyOperation(operationId, context) {
        const estimatedCost = this.calculateCost(context);
        const limits = this.tenantBudgets.get(context.tenantId) || DEFAULT_BUDGET;
        // Only monitor operations that could be expensive
        if (estimatedCost > 0.01 ||
            (context.complexity && context.complexity > 5)) {
            this.activeCostlyOperations.set(operationId, {
                cost: estimatedCost,
                startTime: new Date(),
            });
            // Set up automatic kill timer for very expensive operations
            if (estimatedCost > limits.query_burst / 2) {
                setTimeout(() => {
                    this.killExpensiveOperation(operationId, 'cost_timeout');
                }, 30000); // 30 second timeout for expensive operations
            }
        }
    }
    // Complete a monitored operation
    completeCostlyOperation(operationId) {
        this.activeCostlyOperations.delete(operationId);
    }
    // Get cost analysis for a tenant
    async getCostAnalysis(tenantId) {
        const usage = this.getCurrentUsage(tenantId);
        const limits = this.tenantBudgets.get(tenantId) || DEFAULT_BUDGET;
        const dailyUtilization = usage.daily / limits.daily;
        const monthlyUtilization = usage.monthly / limits.monthly;
        // Project monthly spend based on current daily average
        const currentDate = new Date();
        const dayOfMonth = currentDate.getDate();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const projectedMonthlySpend = (usage.monthly / dayOfMonth) * daysInMonth;
        const recommendations = [];
        if (dailyUtilization > 0.8) {
            recommendations.push('Daily budget utilization is high. Consider optimizing queries or increasing budget.');
        }
        if (projectedMonthlySpend > limits.monthly * 1.2) {
            recommendations.push('Projected monthly spend exceeds budget by 20%. Review query patterns.');
        }
        if (this.activeCostlyOperations.size > 10) {
            recommendations.push('Many active expensive operations detected. Consider query optimization.');
        }
        return {
            currentUsage: {
                daily: usage.daily,
                monthly: usage.monthly,
            },
            limits,
            utilization: {
                daily: dailyUtilization,
                monthly: monthlyUtilization,
            },
            projectedMonthlySpend,
            recommendations,
        };
    }
    // Generate cost report
    async generateCostReport(tenantId, days = 30) {
        // In a real implementation, this would query a time-series database
        // For now, return mock data based on current usage
        const usage = this.getCurrentUsage(tenantId);
        return {
            totalCost: usage.monthly,
            averageDailyCost: usage.daily,
            operationBreakdown: {
                graphql_query: usage.monthly * 0.4,
                cypher_query: usage.monthly * 0.3,
                nlq_parse: usage.monthly * 0.15,
                export_operation: usage.monthly * 0.1,
                other: usage.monthly * 0.05,
            },
            trends: [], // Would be populated from historical data
        };
    }
}
exports.CostGuardService = CostGuardService;
// Singleton instance
exports.costGuard = new CostGuardService();
// Middleware for Express to check costs
function costGuardMiddleware() {
    return async (req, res, next) => {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const userId = req.headers['x-user-id'] || 'unknown';
        const operation = req.path.includes('graphql')
            ? 'graphql_query'
            : 'api_request';
        const context = {
            tenantId,
            userId,
            operation,
            metadata: {
                path: req.path,
                method: req.method,
                userAgent: req.headers['user-agent'],
            },
        };
        try {
            const costCheck = await exports.costGuard.checkCostAllowance(context);
            if (!costCheck.allowed) {
                return res.status(429).json({
                    error: 'Cost limit exceeded',
                    details: costCheck.warnings,
                    budgetRemaining: costCheck.budgetRemaining,
                    estimatedCost: costCheck.estimatedCost,
                });
            }
            if (costCheck.rateLimited) {
                res.set('X-RateLimit-Cost', 'true');
                res.set('X-RateLimit-Budget', costCheck.budgetRemaining.toString());
            }
            // Add cost context to request
            req.costContext = context;
            req.estimatedCost = costCheck.estimatedCost;
            next();
        }
        catch (error) {
            logger.error({ error, tenantId, operation }, 'Cost guard middleware error');
            next(); // Allow request to proceed on error
        }
    };
}
// Express middleware to record actual costs
function costRecordingMiddleware() {
    return async (req, res, next) => {
        const startTime = Date.now();
        res.on('finish', async () => {
            if (req.costContext) {
                const duration = Date.now() - startTime;
                const context = {
                    ...req.costContext,
                    duration,
                    metadata: {
                        ...req.costContext.metadata,
                        statusCode: res.statusCode,
                        responseTime: duration,
                    },
                };
                try {
                    await exports.costGuard.recordActualCost(context);
                }
                catch (error) {
                    logger.error({ error, context }, 'Failed to record cost');
                }
            }
        });
        next();
    };
}
