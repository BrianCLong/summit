
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { businessMetrics, costTracker } from '../observability/telemetry';

const logger = pino({ name: 'cost-guard' });

interface CostConfig {
  graphql_query: number;
  cypher_query: number;
  nlq_parse: number;
  provenance_write: number;
  export_operation: number;
  connector_ingest: number;
}

const DEFAULT_COSTS: CostConfig = {
  graphql_query: 0.001,
  cypher_query: 0.002,
  nlq_parse: 0.005,
  provenance_write: 0.0001,
  export_operation: 0.01,
  connector_ingest: 0.0005
};

interface BudgetLimit {
  daily: number;
  monthly: number;
  query_burst: number;
  rate_limit_cost: number;
  tokenCapacity?: number;
  refillPerSecond?: number;
  partialAllowancePct?: number;
  offPeakMultiplier?: number;
}

const DEFAULT_BUDGET: BudgetLimit = {
  daily: 10,
  monthly: 250,
  query_burst: 1,
  rate_limit_cost: 0.5,
  tokenCapacity: 5,
  refillPerSecond: 10 / 86400,
  partialAllowancePct: 0.25,
  offPeakMultiplier: 1.25
};

interface TokenBucketSettings {
  baseCapacity: number;
  refillPerSecond: number;
  partialAllowancePct: number;
  offPeakMultiplier: number;
}

const DEFAULT_BUCKET_SETTINGS: TokenBucketSettings = {
  baseCapacity: DEFAULT_BUDGET.tokenCapacity!,
  refillPerSecond: DEFAULT_BUDGET.refillPerSecond!,
  partialAllowancePct: DEFAULT_BUDGET.partialAllowancePct!,
  offPeakMultiplier: DEFAULT_BUDGET.offPeakMultiplier!
};

interface TokenBucketState extends TokenBucketSettings {
  tokens: number;
  lastRefill: number;
}

interface CostContext {
  tenantId: string;
  userId: string;
  operation: string;
  operationId?: string;
  reservationId?: string;
  complexity?: number;
  resultCount?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface CostGuardResult {
  allowed: boolean;
  estimatedCost: number;
  actualCost?: number;
  budgetRemaining: number;
  budgetUtilization: number;
  warnings: string[];
  rateLimited: boolean;
  killReason?: string;
  reservationId?: string;
  hints: string[];
  partialAllowed: boolean;
  partialReason?: string;
  bucketCapacity: number;
  offPeak: boolean;
  reservedAmount: number;
}

interface Reservation {
  id: string;
  tenantId: string;
  amount: number;
  createdAt: number;
  operationId?: string;
}

interface CostGuardOptions {
  bucket?: Partial<Omit<TokenBucketSettings, 'baseCapacity'>> & { baseCapacity?: number; capacity?: number };
  now?: () => number;
  killTimeoutMs?: number;
}

function normalizeBucketOverrides(bucket?: CostGuardOptions['bucket']): TokenBucketSettings {
  if (!bucket) {
    return { ...DEFAULT_BUCKET_SETTINGS };
  }
  const capacity = bucket.capacity ?? bucket.baseCapacity ?? DEFAULT_BUCKET_SETTINGS.baseCapacity;
  return {
    baseCapacity: capacity,
    refillPerSecond: bucket.refillPerSecond ?? DEFAULT_BUCKET_SETTINGS.refillPerSecond,
    partialAllowancePct: bucket.partialAllowancePct ?? DEFAULT_BUCKET_SETTINGS.partialAllowancePct,
    offPeakMultiplier: bucket.offPeakMultiplier ?? DEFAULT_BUCKET_SETTINGS.offPeakMultiplier
  };
}

export class CostGuardService {
  private costs: CostConfig;
  private tenantBudgets = new Map<string, BudgetLimit>();
  private tenantUsage = new Map<string, { daily: number; monthly: number; lastReset: Date }>();
  private tenantBuckets = new Map<string, TokenBucketState>();
  private reservations = new Map<string, Reservation>();
  private bucketDefaults: TokenBucketSettings;
  private nowProvider: () => number;
  private killTimeoutMs: number;
  private activeCostlyOperations = new Map<string, { cost: number; startTime: number; tenantId: string }>();

  constructor(costConfig?: Partial<CostConfig>, options: CostGuardOptions = {}) {
    this.costs = { ...DEFAULT_COSTS, ...costConfig };
    this.bucketDefaults = normalizeBucketOverrides(options.bucket);
    this.nowProvider = options.now ?? (() => Date.now());
    this.killTimeoutMs = options.killTimeoutMs ?? 30_000;
    logger.info('Cost Guard Service initialized', { costs: this.costs, bucketDefaults: this.bucketDefaults });
  }

  private now(): number {
    return this.nowProvider();
  }

  private isOffPeak(timestamp = this.now()): boolean {
    const hour = new Date(timestamp).getUTCHours();
    return hour < 6 || hour >= 22;
  }

  private getLimits(tenantId: string): BudgetLimit {
    return this.tenantBudgets.get(tenantId) || DEFAULT_BUDGET;
  }

  private getOrCreateUsage(tenantId: string) {
    let usage = this.tenantUsage.get(tenantId);
    const now = new Date(this.now());
    if (!usage) {
      usage = { daily: 0, monthly: 0, lastReset: now };
      this.tenantUsage.set(tenantId, usage);
      return usage;
    }

    const lastReset = usage.lastReset;
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
      usage.daily = 0;
      usage.lastReset = now;
      if (now.getMonth() !== lastReset.getMonth()) {
        usage.monthly = 0;
      }
    }

    return usage;
  }

  private getOrCreateBucket(tenantId: string): TokenBucketState {
    const limits = this.getLimits(tenantId);
    const baseCapacity = limits.tokenCapacity ?? this.bucketDefaults.baseCapacity;
    const refillPerSecond = limits.refillPerSecond ?? this.bucketDefaults.refillPerSecond;
    const partialAllowancePct = limits.partialAllowancePct ?? this.bucketDefaults.partialAllowancePct;
    const offPeakMultiplier = limits.offPeakMultiplier ?? this.bucketDefaults.offPeakMultiplier;

    let bucket = this.tenantBuckets.get(tenantId);
    if (!bucket) {
      bucket = {
        baseCapacity,
        refillPerSecond,
        partialAllowancePct,
        offPeakMultiplier,
        tokens: baseCapacity,
        lastRefill: this.now()
      };
      this.tenantBuckets.set(tenantId, bucket);
      return bucket;
    }

    bucket.baseCapacity = baseCapacity;
    bucket.refillPerSecond = refillPerSecond;
    bucket.partialAllowancePct = partialAllowancePct;
    bucket.offPeakMultiplier = offPeakMultiplier;
    return bucket;
  }

  private snapshotBucket(tenantId: string) {
    const bucket = this.getOrCreateBucket(tenantId);
    const now = this.now();
    const offPeak = this.isOffPeak(now);
    const capacity = bucket.baseCapacity * (offPeak ? bucket.offPeakMultiplier : 1);
    const elapsedSeconds = Math.max(0, (now - bucket.lastRefill) / 1000);
    if (elapsedSeconds > 0) {
      const refill = elapsedSeconds * bucket.refillPerSecond * (offPeak ? bucket.offPeakMultiplier : 1);
      bucket.tokens = Math.min(capacity, bucket.tokens + refill);
      bucket.lastRefill = now;
    }
    bucket.tokens = Math.min(capacity, bucket.tokens);
    this.trackBucketMetrics(tenantId, bucket.tokens, capacity, offPeak);
    return { bucket, capacity, offPeak };
  }

  private reserveTokens(tenantId: string, amount: number, operationId?: string): string | undefined {
    if (amount <= 0) {
      return undefined;
    }
    const id = randomUUID();
    this.reservations.set(id, { id, tenantId, amount, createdAt: this.now(), operationId });
    return id;
  }

  releaseReservation(reservationId?: string, reason = 'released'): void {
    if (!reservationId) {
      return;
    }
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return;
    }
    const { bucket, capacity, offPeak } = this.snapshotBucket(reservation.tenantId);
    bucket.tokens = Math.min(capacity, bucket.tokens + reservation.amount);
    this.reservations.delete(reservationId);
    this.trackBucketMetrics(reservation.tenantId, bucket.tokens, capacity, offPeak);
    logger.info({ reservationId, refund: reservation.amount, reason }, 'Reservation released');
  }

  private trackBucketMetrics(tenantId: string, tokens: number, capacity: number, offPeak: boolean) {
    const remaining = Math.max(0, tokens);
    const utilization = capacity > 0 ? (capacity - remaining) / capacity : 1;
    businessMetrics.costBudgetUtilization.record(utilization, { tenant_id: tenantId, off_peak: offPeak ? 'true' : 'false' });
    businessMetrics.costGuardBucketRemaining.record(remaining, { tenant_id: tenantId, off_peak: offPeak ? 'true' : 'false' });
  }

  private registerOffense(tenantId: string, reason: string) {
    businessMetrics.costGuardTopOffenders.add(1, { tenant_id: tenantId, reason });
  }

  setBudgetLimits(tenantId: string, limits: Partial<BudgetLimit>): void {
    const currentLimits = this.tenantBudgets.get(tenantId) || DEFAULT_BUDGET;
    const newLimits = { ...currentLimits, ...limits };
    this.tenantBudgets.set(tenantId, newLimits);
    const bucket = this.tenantBuckets.get(tenantId);
    if (bucket) {
      bucket.baseCapacity = newLimits.tokenCapacity ?? this.bucketDefaults.baseCapacity;
      bucket.refillPerSecond = newLimits.refillPerSecond ?? this.bucketDefaults.refillPerSecond;
      bucket.partialAllowancePct = newLimits.partialAllowancePct ?? this.bucketDefaults.partialAllowancePct;
      bucket.offPeakMultiplier = newLimits.offPeakMultiplier ?? this.bucketDefaults.offPeakMultiplier;
      bucket.tokens = Math.min(bucket.tokens, bucket.baseCapacity);
    }
    logger.info({ tenantId, limits: newLimits }, 'Budget limits updated');
  }

  resetTenant(tenantId: string): void {
    this.tenantUsage.delete(tenantId);
    this.tenantBuckets.delete(tenantId);
    for (const [id, reservation] of this.reservations) {
      if (reservation.tenantId === tenantId) {
        this.reservations.delete(id);
      }
    }
  }

  getCurrentUsage(tenantId: string) {
    return this.getOrCreateUsage(tenantId);
  }

  calculateCost(context: CostContext): number {
    const baseCost = this.costs[context.operation as keyof CostConfig] || 0.001;
    let cost = baseCost;
    if (context.complexity) {
      cost *= Math.max(1, context.complexity);
    }
    if (context.resultCount && ['graphql_query', 'cypher_query'].includes(context.operation)) {
      const resultMultiplier = Math.log10(context.resultCount + 1) / 10 + 1;
      cost *= resultMultiplier;
    }
    if (context.duration && context.duration > 5000) {
      const durationMultiplier = Math.min(context.duration / 5000, 10);
      cost *= durationMultiplier;
    }
    return Math.round(cost * 10000) / 10000;
  }

  async checkCostAllowance(context: CostContext): Promise<CostGuardResult> {
    const usage = this.getOrCreateUsage(context.tenantId);
    const limits = this.getLimits(context.tenantId);
    const { bucket, capacity, offPeak } = this.snapshotBucket(context.tenantId);
    const estimatedCost = this.calculateCost(context);
    const warnings: string[] = [];
    const hints = new Set<string>();
    let allowed = true;
    let partialAllowed = false;
    let partialReason: string | undefined;

    const dailyRemaining = limits.daily - usage.daily;
    const monthlyRemaining = limits.monthly - usage.monthly;
    const budgetRemaining = Math.min(bucket.tokens, dailyRemaining, monthlyRemaining);
    const rateLimited = bucket.tokens < limits.rate_limit_cost || usage.daily > limits.rate_limit_cost;

    if (estimatedCost > dailyRemaining || estimatedCost > monthlyRemaining) {
      allowed = false;
      warnings.push(`Insufficient budget: estimated $${estimatedCost.toFixed(4)}, remaining daily $${dailyRemaining.toFixed(4)}, monthly $${monthlyRemaining.toFixed(4)}`);
      this.registerOffense(context.tenantId, 'hard_cap_exceeded');
    }

    if (estimatedCost > limits.query_burst) {
      allowed = false;
      warnings.push(`Exceeds burst limit: estimated $${estimatedCost.toFixed(4)}, limit $${limits.query_burst.toFixed(4)}`);
      this.registerOffense(context.tenantId, 'burst_exceeded');
    }

    if (allowed && estimatedCost > bucket.tokens) {
      const partialAllowance = capacity * bucket.partialAllowancePct;
      if (estimatedCost <= bucket.tokens + partialAllowance) {
        partialAllowed = true;
        partialReason = 'Estimated cost exceeds available tokens; returning partial results within budget.';
        warnings.push(partialReason);
        hints.add('Narrow the selection set or add filters to reduce query scope.');
        hints.add('Persist frequently used queries to leverage caches.');
        if (!offPeak) {
          hints.add('Retry during off-peak hours (22:00–06:00 UTC) for a temporary budget boost.');
        }
        this.registerOffense(context.tenantId, 'partial');
      } else {
        allowed = false;
        warnings.push(`Insufficient tokens: estimated $${estimatedCost.toFixed(4)}, available $${bucket.tokens.toFixed(4)}.`);
        hints.add('Reduce result window or sampling to stay within tenant budget.');
        if (!offPeak) {
          hints.add('Execute during off-peak hours (22:00–06:00 UTC) for higher refill rate.');
        }
        this.registerOffense(context.tenantId, 'token_exhausted');
      }
    }

    const budgetUtilization = capacity > 0 ? (capacity - bucket.tokens) / capacity : 1;

    if (!allowed) {
      return {
        allowed,
        estimatedCost,
        budgetRemaining: Math.max(0, budgetRemaining),
        budgetUtilization,
        warnings,
        rateLimited,
        hints: Array.from(hints),
        partialAllowed: false,
        bucketCapacity: capacity,
        offPeak,
        reservedAmount: 0
      };
    }

    const reserved = partialAllowed ? Math.max(0, bucket.tokens) : Math.min(estimatedCost, bucket.tokens);
    const reservationId = this.reserveTokens(context.tenantId, reserved, context.operationId);
    bucket.tokens = Math.max(0, bucket.tokens - reserved);
    this.trackBucketMetrics(context.tenantId, bucket.tokens, capacity, offPeak);

    if (partialAllowed && partialReason) {
      hints.add('Request includes safe partial output; consult extensions.costGuard for remediation.');
    }

    return {
      allowed,
      estimatedCost,
      budgetRemaining: Math.max(0, bucket.tokens),
      budgetUtilization,
      warnings,
      rateLimited,
      reservationId,
      hints: Array.from(hints),
      partialAllowed,
      partialReason,
      bucketCapacity: capacity,
      offPeak,
      reservedAmount: reserved
    };
  }

  async recordActualCost(context: CostContext, actualCost?: number): Promise<void> {
    const cost = Math.max(0, actualCost ?? this.calculateCost(context));
    const usage = this.getOrCreateUsage(context.tenantId);
    usage.daily += cost;
    usage.monthly += cost;

    let delta = cost;
    if (context.reservationId) {
      const reservation = this.reservations.get(context.reservationId);
      if (reservation) {
        delta = cost - reservation.amount;
        this.reservations.delete(context.reservationId);
        if (delta < 0) {
          const refund = -delta;
          const { bucket, capacity, offPeak } = this.snapshotBucket(context.tenantId);
          bucket.tokens = Math.min(capacity, bucket.tokens + refund);
          this.trackBucketMetrics(context.tenantId, bucket.tokens, capacity, offPeak);
          delta = 0;
        }
      }
    }

    if (delta > 0) {
      const { bucket, capacity, offPeak } = this.snapshotBucket(context.tenantId);
      if (delta > bucket.tokens) {
        const deficit = delta - bucket.tokens;
        this.registerOffense(context.tenantId, 'actual_cost_exceeded');
        this.killExpensiveOperation(context.operationId ?? context.reservationId ?? randomUUID(), 'budget_exceeded');
        throw new Error(`Actual cost ${cost.toFixed(4)} exceeds remaining budget by $${deficit.toFixed(4)}`);
      }
      bucket.tokens = Math.max(0, bucket.tokens - delta);
      this.trackBucketMetrics(context.tenantId, bucket.tokens, capacity, offPeak);
    }

    costTracker.track(context.operation, cost, {
      tenantId: context.tenantId,
      userId: context.userId,
      complexity: context.complexity,
      resultCount: context.resultCount,
      duration: context.duration,
      reservationId: context.reservationId
    });
  }

  async killExpensiveOperation(operationId: string, reason: string): Promise<boolean> {
    const operation = this.activeCostlyOperations.get(operationId);
    if (!operation) {
      return false;
    }

    const duration = this.now() - operation.startTime;
    logger.warn({ operationId, reason, estimatedCost: operation.cost, duration }, 'Killing expensive operation');
    this.activeCostlyOperations.delete(operationId);
    businessMetrics.cypherQueryDuration.record(duration, { status: 'killed', reason });
    businessMetrics.costGuardQueryKills.add(1, { reason });
    this.registerOffense(operation.tenantId, reason);
    return true;
  }

  startCostlyOperation(operationId: string, context: CostContext): void {
    const estimatedCost = this.calculateCost(context);
    const limits = this.getLimits(context.tenantId);
    if (estimatedCost > 0.01 || (context.complexity && context.complexity > 5)) {
      this.activeCostlyOperations.set(operationId, { cost: estimatedCost, startTime: this.now(), tenantId: context.tenantId });
      if (estimatedCost > (limits.query_burst ?? this.bucketDefaults.baseCapacity) / 2) {
        setTimeout(() => {
          this.killExpensiveOperation(operationId, 'cost_timeout');
        }, this.killTimeoutMs);
      }
    }
  }

  completeCostlyOperation(operationId: string): void {
    this.activeCostlyOperations.delete(operationId);
  }

  async getCostAnalysis(tenantId: string) {
    const usage = this.getOrCreateUsage(tenantId);
    const limits = this.getLimits(tenantId);
    const { bucket, capacity } = this.snapshotBucket(tenantId);

    const dailyUtilization = limits.daily > 0 ? usage.daily / limits.daily : 1;
    const monthlyUtilization = limits.monthly > 0 ? usage.monthly / limits.monthly : 1;

    const currentDate = new Date(this.now());
    const dayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const projectedMonthlySpend = dayOfMonth > 0 ? (usage.monthly / dayOfMonth) * daysInMonth : usage.monthly;

    const recommendations: string[] = [];
    if (dailyUtilization > 0.8) {
      recommendations.push('Daily budget utilization is high. Consider optimizing queries or increasing budget.');
    }
    if (projectedMonthlySpend > limits.monthly * 1.2) {
      recommendations.push('Projected monthly spend exceeds budget by 20%. Review query patterns.');
    }
    if (this.activeCostlyOperations.size > 10) {
      recommendations.push('Many active expensive operations detected. Consider query optimization.');
    }
    if (bucket.tokens < capacity * 0.2) {
      recommendations.push('Query bucket nearly depleted. Pause optional workloads or run during off-peak hours.');
    }

    return {
      currentUsage: {
        daily: usage.daily,
        monthly: usage.monthly
      },
      limits,
      utilization: {
        daily: dailyUtilization,
        monthly: monthlyUtilization
      },
      projectedMonthlySpend,
      bucket: {
        remaining: bucket.tokens,
        capacity
      },
      recommendations
    };
  }

  async generateCostReport(tenantId: string, days = 30) {
    const usage = this.getOrCreateUsage(tenantId);
    return {
      totalCost: usage.monthly,
      averageDailyCost: usage.daily,
      operationBreakdown: {
        graphql_query: usage.monthly * 0.4,
        cypher_query: usage.monthly * 0.3,
        nlq_parse: usage.monthly * 0.15,
        export_operation: usage.monthly * 0.1,
        other: usage.monthly * 0.05
      },
      trends: Array.from({ length: Math.min(days, 7) }, (_, idx) => ({
        date: new Date(this.now() - idx * 86400000).toISOString().slice(0, 10),
        cost: usage.daily / Math.max(1, idx + 1)
      })).reverse()
    };
  }
}

export const costGuard = new CostGuardService();

export function costGuardMiddleware() {
  return async (req: any, res: any, next: any) => {
    const tenantId = (req.headers['x-tenant'] || req.headers['x-tenant-id'] || 'default') as string;
    const userId = (req.headers['x-user-id'] || req.user?.id || 'unknown') as string;
    const operation = req.path?.includes('graphql') ? 'graphql_query' : 'api_request';
    const operationId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;

    const context: CostContext = {
      tenantId,
      userId,
      operation,
      operationId,
      metadata: {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        purpose: req.headers['x-purpose']
      }
    };

    try {
      const costCheck = await costGuard.checkCostAllowance(context);
      res.set('X-Query-Cost', costCheck.estimatedCost.toFixed(4));
      res.set('X-Query-Budget-Remaining', costCheck.budgetRemaining.toFixed(4));
      res.set('X-Query-Bucket-Capacity', costCheck.bucketCapacity.toFixed(4));
      res.set('X-Query-OffPeak', costCheck.offPeak ? 'true' : 'false');
      if (costCheck.hints.length > 0) {
        res.set('X-Query-Hints', costCheck.hints.join('|'));
      }

      if (!costCheck.allowed) {
        costGuard.releaseReservation(costCheck.reservationId, 'denied');
        return res.status(429).json({
          error: 'COST_GUARD_LIMIT',
          details: costCheck.warnings,
          hints: costCheck.hints,
          budgetRemaining: costCheck.budgetRemaining,
          estimatedCost: costCheck.estimatedCost
        });
      }

      if (costCheck.rateLimited) {
        res.set('X-RateLimit-Cost', 'true');
        res.set('X-RateLimit-Budget', costCheck.budgetRemaining.toFixed(4));
      }

      if (costCheck.partialAllowed) {
        res.set('X-Query-Partial', 'true');
      }

      req.costContext = { ...context, reservationId: costCheck.reservationId };
      req.costReservationId = costCheck.reservationId;
      req.costHints = costCheck.hints;
      req.estimatedCost = costCheck.estimatedCost;

      next();
    } catch (error) {
      logger.error({ error, tenantId, operation }, 'Cost guard middleware error');
      next(error);
    }
  };
}

export function costRecordingMiddleware() {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();

    res.on('finish', async () => {
      if (!req.costContext) {
        return;
      }

      if (res.statusCode >= 400) {
        costGuard.releaseReservation(req.costReservationId, `http_${res.statusCode}`);
        return;
      }

      const duration = Date.now() - startTime;
      const resultCount = Number.isFinite(res.locals?.resultCount) ? Number(res.locals.resultCount) : undefined;
      const context: CostContext = {
        ...req.costContext,
        duration,
        resultCount,
        reservationId: req.costReservationId,
        metadata: {
          ...req.costContext.metadata,
          statusCode: res.statusCode,
          responseTime: duration,
          hints: req.costHints
        }
      };

      try {
        await costGuard.recordActualCost(context);
      } catch (error) {
        logger.error({ error, context }, 'Failed to record cost');
      }
    });

    next();
  };
}
