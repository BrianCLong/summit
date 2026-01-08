import {
  GraphQLSchema,
  TypeInfo,
  getNullableType,
  isListType,
  parse,
  visit,
  visitWithTypeInfo,
} from "graphql";
import type {
  CostGuardDecision,
  QueryPlanSummary,
  TenantBudgetProfile,
} from "@ga-graphai/cost-guard";
import { CostGuard, DEFAULT_PROFILE } from "@ga-graphai/cost-guard";

interface CostWeights {
  fieldCost: number;
  depthCost: number;
  listCost: number;
  cartesianPenalty: number;
  cartesianListDepth: number;
  latencyPerFieldMs: number;
  depthLatencyAmplifier: number;
  listLatencyAmplifier: number;
  minLatencyMs: number;
}

const DEFAULT_COST_WEIGHTS: CostWeights = {
  fieldCost: 3,
  depthCost: 9,
  listCost: 14,
  cartesianPenalty: 55,
  cartesianListDepth: 3,
  latencyPerFieldMs: 6,
  depthLatencyAmplifier: 0.22,
  listLatencyAmplifier: 0.35,
  minLatencyMs: 45,
};

export interface GraphQLRateLimiterOptions {
  defaultProfile?: TenantBudgetProfile;
  tenantProfiles?: Record<string, TenantBudgetProfile>;
  costWeights?: Partial<CostWeights>;
  windowMs?: number;
  maxRequestsPerWindow?: number;
}

interface TenantStats {
  active: number;
  latencies: number[];
}

export interface GuardedExecution {
  plan: QueryPlanSummary;
  decision: CostGuardDecision;
  release?: (latencyMs: number) => void;
}

export class GraphQLCostAnalyzer {
  private readonly weights: CostWeights;

  constructor(
    private readonly schema: GraphQLSchema,
    weights?: Partial<CostWeights>
  ) {
    this.weights = { ...DEFAULT_COST_WEIGHTS, ...weights };
  }

  analyze(source: string): QueryPlanSummary {
    const document = parse(source);
    const typeInfo = new TypeInfo(this.schema);

    let maxDepth = 0;
    let operations = 0;
    let maxListDepth = 0;
    const depthStack: number[] = [];
    const listDepthStack: number[] = [];

    visit(
      document,
      visitWithTypeInfo(typeInfo, {
        Field: {
          enter: () => {
            const parentDepth = depthStack[depthStack.length - 1] ?? 0;
            const depth = parentDepth + 1;
            depthStack.push(depth);
            maxDepth = Math.max(maxDepth, depth);

            const currentType = typeInfo.getType();
            const nullableType = currentType ? getNullableType(currentType) : undefined;
            const isList = nullableType ? isListType(nullableType) : false;
            const parentListDepth = listDepthStack[listDepthStack.length - 1] ?? 0;
            const listDepth = parentListDepth + (isList ? 1 : 0);
            listDepthStack.push(listDepth);
            maxListDepth = Math.max(maxListDepth, listDepth);

            operations += 1;
          },
          leave: () => {
            depthStack.pop();
            listDepthStack.pop();
          },
        },
      })
    );

    const containsCartesianProduct = maxListDepth >= this.weights.cartesianListDepth;
    return {
      estimatedRru: this.estimateRru(operations, maxDepth, containsCartesianProduct),
      estimatedLatencyMs: this.estimateLatencyMs(operations, maxDepth, maxListDepth),
      depth: maxDepth,
      operations,
      containsCartesianProduct,
    };
  }

  private estimateRru(
    operations: number,
    depth: number,
    containsCartesianProduct: boolean
  ): number {
    const base = Math.max(operations, 1) * this.weights.fieldCost;
    const depthCost = depth * this.weights.depthCost;
    const listCost = Math.max(0, depth - 1) * this.weights.listCost;
    const penalty = containsCartesianProduct ? this.weights.cartesianPenalty : 0;
    return Math.round(base + depthCost + listCost + penalty);
  }

  private estimateLatencyMs(operations: number, depth: number, listDepth: number): number {
    const base = Math.max(operations, 1) * this.weights.latencyPerFieldMs;
    const depthFactor = 1 + Math.max(0, depth - 1) * this.weights.depthLatencyAmplifier;
    const listFactor = 1 + Math.max(0, listDepth - 1) * this.weights.listLatencyAmplifier;
    return Math.max(this.weights.minLatencyMs, Math.round(base * depthFactor * listFactor));
  }
}

export class GraphQLRateLimiter {
  private readonly analyzer: GraphQLCostAnalyzer;
  private readonly costGuard = new CostGuard();
  private readonly defaultProfile: TenantBudgetProfile;
  private readonly tenantProfiles: Map<string, TenantBudgetProfile>;
  private readonly stats = new Map<string, TenantStats>();
  private readonly requestWindows = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequestsPerWindow: number;

  constructor(
    private readonly schema: GraphQLSchema,
    options: GraphQLRateLimiterOptions = {}
  ) {
    this.analyzer = new GraphQLCostAnalyzer(schema, options.costWeights);
    this.defaultProfile = options.defaultProfile ?? DEFAULT_PROFILE;
    this.tenantProfiles = new Map(Object.entries(options.tenantProfiles ?? {}));
    this.windowMs = options.windowMs ?? 60_000;
    this.maxRequestsPerWindow = options.maxRequestsPerWindow ?? 120;
  }

  beginExecution(source: string, tenantId: string): GuardedExecution {
    const plan = this.analyzer.analyze(source);
    const ddosDecision = this.evaluateBurst(tenantId);
    if (ddosDecision) {
      return { plan, decision: ddosDecision };
    }
    const stats = this.ensureStats(tenantId);
    const profile = this.tenantProfiles.get(tenantId) ?? this.defaultProfile;
    const decision = this.costGuard.planBudget({
      tenantId,
      plan,
      profile,
      activeQueries: stats.active,
      recentLatencyP95: this.computeP95(stats.latencies),
    });

    if (decision.action === "allow") {
      stats.active += 1;
      return {
        plan,
        decision,
        release: (latencyMs: number) => {
          stats.active = Math.max(0, stats.active - 1);
          this.recordLatency(stats, latencyMs);
        },
      };
    }

    return { plan, decision };
  }

  private ensureStats(tenantId: string): TenantStats {
    const existing = this.stats.get(tenantId);
    if (existing) {
      return existing;
    }
    const created: TenantStats = { active: 0, latencies: [] };
    this.stats.set(tenantId, created);
    return created;
  }

  private recordLatency(stats: TenantStats, latencyMs: number): void {
    const normalizedLatency = Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : 0;
    stats.latencies.push(normalizedLatency);
    if (stats.latencies.length > 50) {
      stats.latencies.shift();
    }
  }

  private computeP95(latencies: number[]): number {
    if (!latencies.length) {
      return 0;
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[index];
  }

  private evaluateBurst(tenantId: string): CostGuardDecision | null {
    if (!this.maxRequestsPerWindow || this.maxRequestsPerWindow <= 0) {
      return null;
    }
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const entries = this.requestWindows.get(tenantId) ?? [];
    const recent = entries.filter((timestamp) => timestamp >= windowStart);
    recent.push(now);
    this.requestWindows.set(tenantId, recent);

    if (recent.length > this.maxRequestsPerWindow) {
      const retryAfterMs = Math.max(0, recent[0] + this.windowMs - now);
      return {
        action: "kill",
        reason: "Rate limit exceeded for tenant window",
        reasonCode: "RATE_LIMIT_WINDOW",
        nextCheckMs: retryAfterMs || 1000,
        metrics: {
          projectedRru: 0,
          projectedLatencyMs: 0,
          saturation: Number((recent.length / this.maxRequestsPerWindow).toFixed(2)),
        },
      } satisfies CostGuardDecision;
    }

    return null;
  }
}
