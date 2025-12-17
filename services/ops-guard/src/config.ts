export interface OpsGuardConfig {
  port: number;
  latencyBudgetMs: number;
  costBudget: number;
  slowQueryKillMs: number;
  chaosIntervalMs: number;
}

export function loadConfig(): OpsGuardConfig {
  return {
    port: Number(process.env.PORT) || 4100,
    latencyBudgetMs: Number(process.env.LATENCY_BUDGET_MS) || 1500,
    costBudget: Number(process.env.COST_BUDGET) || 100,
    slowQueryKillMs: Number(process.env.SLOW_QUERY_KILL_MS) || 1200,
    chaosIntervalMs: Number(process.env.CHAOS_INTERVAL_MS) || 5 * 60 * 1000
  };
}
